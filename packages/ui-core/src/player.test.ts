import assert from "node:assert/strict";
import { test } from "node:test";
import type { Track } from "./descriptors.ts";
import {
	createPlayer,
	type Output,
	type PlayerHost,
	type PlayerReport,
	type QueueProvider,
	windowQueue,
} from "./player.ts";

const track = (n: number): Track => ({ src: `/t${n}.mp3`, title: `T${n}` });
const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

const host: PlayerHost = {
	recall: () => undefined,
	keep: () => {},
	frame: (run) => {
		const id = setTimeout(run, 1);
		return () => clearTimeout(id);
	},
};

test("windowQueue walks a window read's pages, once each", async () => {
	const rows = Array.from({ length: 10 }, (_, n) => ({ n }));
	const asked: number[] = [];
	const read = {
		page: async (offset: number) => {
			asked.push(offset);
			return { data: rows.slice(offset, offset + 4), total: 10, offset };
		},
	};
	const queue = windowQueue(read, {
		track: (row: { n: number }) => track(row.n),
		at: 3,
	});
	assert.equal((await queue.next(track(3)))?.title, "T4");
	assert.equal((await queue.previous(track(3)))?.title, "T2");
	assert.equal((await queue.next(track(6)))?.title, "T7");
	assert.equal(await queue.next(track(9)), undefined);
	assert.equal(await queue.previous(track(0)), undefined);
	// A track the queue never gave is not in it.
	assert.equal(await queue.next(track(77)), undefined);
	// The page of the playing row, the one before it, the one after it.
	assert.deepEqual(asked, [3, 0, 7]);
});

test("windowQueue takes a track made later, as a signed address is", async () => {
	const rows = Array.from({ length: 6 }, (_, n) => ({ n }));
	const read = {
		page: async (offset: number) => ({
			data: rows.slice(offset, offset + 3),
			total: 6,
			offset,
		}),
	};
	const queue = windowQueue(read, {
		track: async (row: { n: number }) => {
			await new Promise((resolve) => setTimeout(resolve, 1));
			const made = track(row.n);
			return { ...made, key: made.src, src: `https://x/${row.n}?sig=1` };
		},
		at: 0,
	});
	const next = await queue.next(track(0));
	assert.equal(next?.title, "T1");
	assert.equal(next?.src, "https://x/1?sig=1");
});

test("a provider's neighbours are asked once and the dock follows them", async () => {
	const { player, view } = createPlayer(host);
	const asked: string[] = [];
	const provider: QueueProvider = {
		next: async (current) => {
			asked.push(`next ${current.title}`);
			return current.title === "T2"
				? undefined
				: track(Number(current.title.slice(1)) + 1);
		},
		previous: async (current) => {
			asked.push(`previous ${current.title}`);
			return current.title === "T0"
				? undefined
				: track(Number(current.title.slice(1)) - 1);
		},
	};
	player.load(track(1), provider);
	// Until it answers, a next is assumed.
	assert.equal(view().queued, true);
	assert.equal(view().hasNext, true);
	assert.equal(view().next, undefined);
	await settle();
	assert.equal(view().next?.title, "T2");
	assert.equal(view().previous?.title, "T0");

	player.playNext();
	await settle();
	assert.equal(view().track?.title, "T2");
	// The queue went with it, and T2 has no next.
	assert.equal(view().hasNext, false);
	assert.equal(view().queued, true);
	assert.equal(view().previous?.title, "T1");

	player.playPrevious();
	await settle();
	assert.equal(view().track?.title, "T1");
	assert.deepEqual(asked, [
		"next T1",
		"previous T1",
		"next T2",
		"previous T2",
		"next T1",
		"previous T1",
	]);

	// A track the provider did not give plays alone.
	player.play(track(8));
	await settle();
	assert.equal(view().queued, false);
	assert.equal(view().hasNext, false);
});

test("a list queue still walks, and a provider that throws has no neighbour", async () => {
	const { player, view } = createPlayer(host);
	player.play(track(0), [track(0), track(1)]);
	assert.equal(view().queued, true);
	assert.equal(view().next?.title, "T1");
	assert.equal(view().hasNext, true);
	player.playNext();
	assert.equal(view().track?.title, "T1");
	assert.equal(view().hasNext, false);

	player.play(track(5), {
		next: () => Promise.reject(new Error("offline")),
		previous: () => undefined,
	});
	await settle();
	assert.equal(view().hasNext, false);
});

test("a seek waits for the sound's length, then lands", () => {
	const store = createPlayer(host);
	const landed: number[] = [];
	let ready = false;
	const output: Output = {
		load: () => {},
		play: () => {},
		pause: () => {},
		time: () => 0,
		length: () => 100,
		ready: () => ready,
		seek: (to) => landed.push(to),
		paused: () => true,
		level: () => ({ volume: 1, muted: false }),
		apply: () => {},
	};
	let report: PlayerReport | undefined;
	store.connect((made) => {
		report = made;
		return output;
	});
	store.player.load({ ...track(1), duration: 100 });
	store.player.seek(30);
	assert.deepEqual(landed, []);
	assert.equal(store.clock().time, 30);
	ready = true;
	report?.metadata();
	assert.deepEqual(landed, [30]);
});

test("the store drives the sound it was given: load, play, pause and unload", () => {
	const calls: string[] = [];
	const store = createPlayer(host);
	store.connect(() => ({
		load: (loaded) => calls.push(`load ${loaded?.title ?? "none"}`),
		play: () => calls.push("play"),
		pause: () => calls.push("pause"),
		time: () => 0,
		length: () => undefined,
		ready: () => false,
		seek: () => {},
		paused: () => true,
		level: () => ({ volume: 1, muted: false }),
		apply: () => {},
	}));
	assert.deepEqual(calls, []);
	store.player.play(track(0));
	store.player.pause();
	store.player.play();
	store.player.play(track(1));
	store.player.close();
	assert.deepEqual(calls, [
		"load T0",
		"play",
		"pause",
		"play",
		"load T1",
		"play",
		"load none",
	]);
});

test("the volume is kept, and a muted track unmutes when the volume rises", () => {
	const kept: [number, boolean][] = [];
	const store = createPlayer({
		...host,
		recall: () => ({ volume: 0.4, muted: true }),
		keep: (volume, muted) => kept.push([volume, muted]),
	});
	assert.equal(store.view().volume, 0.4);
	assert.equal(store.view().muted, true);
	store.player.setVolume(0.8);
	assert.equal(store.view().muted, false);
	assert.deepEqual(kept, [[0.8, false]]);
});
