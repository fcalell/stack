import assert from "node:assert/strict";
import { test } from "node:test";
import { ageWords, pendingRun, pendingShare, timeLeft } from "../src/clock.ts";

const S = 1000;
const MIN = 60 * S;

test("a pending bar's share runs from its start to its until, and stays full past it", () => {
	const run = pendingRun(100 * S, 0);
	assert.equal(pendingShare(run, 0), 0);
	assert.equal(pendingShare(run, 25 * S), 0.25);
	assert.equal(pendingShare(run, 100 * S), 1);
	assert.equal(pendingShare(run, 500 * S), 1);
});

test("a later until carries the fill on from the share it reached, never back", () => {
	const first = pendingRun(100 * S, 0);
	const moved = pendingRun(200 * S, 50 * S, first);
	assert.equal(pendingShare(moved, 50 * S), 0.5);
	assert.equal(pendingShare(moved, 125 * S), 0.75);
	assert.equal(pendingShare(moved, 200 * S), 1);
});

test("an until already past at the start draws a full track", () => {
	assert.equal(pendingShare(pendingRun(10 * S, 20 * S), 20 * S), 1);
});

test("the clock text is the time left from now, and stops at 0:00", () => {
	assert.equal(timeLeft(150 * S, 0), "2:30");
	assert.equal(timeLeft(150 * S, 0.4 * S), "2:30");
	assert.equal(timeLeft(150 * S, 141 * S), "0:09");
	assert.equal(timeLeft(150 * S, 150 * S), "0:00");
	assert.equal(timeLeft(150 * S, 900 * S), "0:00");
});

test("an age's words follow now: a moment ages from seconds to a minute on its own", () => {
	const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
	const at = "2026-10-04T12:00:00Z";
	const moment = Date.parse(at);
	assert.equal(ageWords(at, moment, format), "now");
	assert.equal(ageWords(at, moment + 30 * S, format), "30 seconds ago");
	assert.equal(ageWords(at, moment + 70 * S, format), "1 minute ago");
	assert.equal(ageWords(at, moment + 3 * 60 * MIN, format), "3 hours ago");
	assert.equal(ageWords(at, moment + 24 * 60 * MIN, format), "yesterday");
});

test("a moment that does not parse reads as itself", () => {
	const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
	assert.equal(ageWords("soon", 0, format), "soon");
});
