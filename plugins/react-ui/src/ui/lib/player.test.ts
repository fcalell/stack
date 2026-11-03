import assert from "node:assert/strict";
import { test } from "node:test";
import type { Track } from "@fcalell/ui-core/descriptors";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
	type PlayerView,
	player,
	type QueueProvider,
	usePlayer,
	windowQueue,
} from "./player.ts";

const track = (n: number): Track => ({ src: `/t${n}.mp3`, title: `T${n}` });
const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

// The store's view, read through the hook the way a component reads it.
function view(): PlayerView {
	let seen: PlayerView | undefined;
	renderToString(
		createElement(() => {
			seen = usePlayer();
			return null;
		}),
	);
	return seen as PlayerView;
}

test("windowQueue walks a window read's pages, once each", async () => {
	const rows = Array.from({ length: 10 }, (_, n) => ({ n }));
	const asked: number[] = [];
	const read = {
		page: async (offset: number) => {
			asked.push(offset);
			return { data: rows.slice(offset, offset + 4), total: 10, offset };
		},
	};
	const queue = windowQueue(read as never, {
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

test("a provider's neighbours are asked once and the dock follows them", async () => {
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
	try {
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
	} finally {
		player.close();
	}
});

test("a list queue still walks, and a provider that throws has no neighbour", async () => {
	try {
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
	} finally {
		player.close();
	}
});
