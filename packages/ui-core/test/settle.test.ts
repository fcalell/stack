import assert from "node:assert/strict";
import { test } from "node:test";
import { createSettle, type SettleEnv } from "../src/settle.ts";

// A page the test drives: the frame it holds, the transitions it started and
// the ones it ran `update` for.
function page(over: Partial<SettleEnv> = {}) {
	const frames: Array<() => void> = [];
	const started: Array<() => void> = [];
	let finish = () => {};
	const env: SettleEnv = {
		frame: (run) => frames.push(run),
		reduced: () => false,
		hidden: () => false,
		typing: () => false,
		running: () => false,
		start: (update) => {
			started.push(update);
			update();
			return {
				finished: new Promise((done) => {
					finish = () => done(undefined);
				}),
			};
		},
		flush: (run) => run(),
		...over,
	};
	return {
		settle: createSettle(env),
		frames,
		started,
		frame: () => {
			for (const run of frames.splice(0)) run();
		},
		finish: async () => {
			finish();
			await Promise.resolve();
			await Promise.resolve();
		},
	};
}

test("every switch asked for in a frame runs in one transition, after the frame comes", () => {
	const { settle, frames, started, frame } = page();
	const ran: string[] = [];
	settle(() => ran.push("a"));
	settle(() => ran.push("b"));
	assert.equal(frames.length, 1);
	assert.deepEqual(ran, []);
	frame();
	assert.deepEqual(ran, ["a", "b"]);
	assert.equal(started.length, 1);
});

test("a frame with no switch starts no transition", () => {
	const { started, frame } = page();
	frame();
	assert.equal(started.length, 0);
});

for (const [name, over] of [
	["motion is reduced", { reduced: () => true }],
	["the browser has no view transition", { start: () => undefined }],
	["the viewer is typing", { typing: () => true }],
	["a view transition already runs", { running: () => true }],
] as const) {
	test(`the switches apply at once, in no transition, when ${name}`, () => {
		const { settle, started, frame } = page(over);
		const ran: string[] = [];
		settle(() => ran.push("a"));
		settle(() => ran.push("b"));
		frame();
		assert.deepEqual(ran, ["a", "b"]);
		assert.equal(started.length, 0);
	});
}

test("a hidden document applies the switch in the call, where no frame comes", () => {
	const { settle, frames } = page({ hidden: () => true });
	const ran: string[] = [];
	settle(() => ran.push("a"));
	assert.deepEqual(ran, ["a"]);
	assert.equal(frames.length, 0);
});

test("a switch asked for while its own transition runs applies at once, and the next frame after it ends starts a new one", async () => {
	const { settle, started, frame, finish } = page();
	const ran: string[] = [];
	settle(() => ran.push("a"));
	frame();
	settle(() => ran.push("b"));
	frame();
	assert.deepEqual(ran, ["a", "b"]);
	assert.equal(started.length, 1);
	await finish();
	settle(() => ran.push("c"));
	frame();
	assert.equal(started.length, 2);
});
