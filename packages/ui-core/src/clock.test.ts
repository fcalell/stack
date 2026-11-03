import assert from "node:assert/strict";
import { test } from "node:test";
import { ageOf, createClock, stampsTime } from "./clock.ts";

const now = Date.parse("2026-10-28T12:00:00Z");
const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString();

test("an age reads in the largest unit it spans", () => {
	assert.deepEqual(ageOf(ago(57), now), { value: -57, unit: "second" });
	assert.deepEqual(ageOf(ago(5 * 3600), now), { value: -5, unit: "hour" });
});

test("an age that rounds up to its unit's size reads in the next unit", () => {
	assert.deepEqual(ageOf(ago(59.6), now), { value: -1, unit: "minute" });
	assert.deepEqual(ageOf(ago(59.6 * 60), now), { value: -1, unit: "hour" });
	assert.deepEqual(ageOf(ago(23.6 * 3600), now), { value: -1, unit: "day" });
});

test("a run of one author's turns in one minute stamps its first alone", () => {
	const you = (seconds: number) => ({ author: "you", at: ago(seconds) });
	assert.equal(stampsTime(you(70)), true);
	assert.equal(stampsTime(you(50), you(70)), true);
	assert.equal(stampsTime(you(10), you(50)), false);
	assert.equal(stampsTime({ author: "other", at: ago(5) }, you(10)), true);
	assert.equal(stampsTime({ author: "you" }, you(10)), true);
});

test("the clock ticks while a reader holds it, each reader leaving at its until", (t) => {
	t.mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
	const clock = createClock();
	let short = 0;
	let long = 0;
	clock.hold(() => short++, 1500);
	clock.hold(() => long++, 10_000);
	t.mock.timers.tick(1000);
	assert.deepEqual([short, long, clock.now()], [1, 1, 1000]);
	t.mock.timers.tick(1000);
	t.mock.timers.tick(1000);
	assert.deepEqual([short, long], [2, 3]);
});

test("a reader past its until never holds the clock", (t) => {
	t.mock.timers.enable({ apis: ["setInterval", "Date"], now: 5000 });
	const clock = createClock();
	let heard = 0;
	clock.hold(() => heard++, 1000)();
	t.mock.timers.tick(5000);
	assert.equal(heard, 0);
});
