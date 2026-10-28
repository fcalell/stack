import assert from "node:assert/strict";
import { test } from "node:test";
import { levelScale } from "./chart.ts";

const bands = (figures: number[]) => {
	const { floor, top, step } = levelScale(figures);
	return { floor, top, step };
};

test("a level's readings stand centred, no band empty under them alone", () => {
	assert.deepEqual(bands([18.3, 19.2, 20.5, 21.4]), {
		floor: 16,
		top: 24,
		step: 2,
	});
});

test("no reading stands on the floor or the top", () => {
	for (const figures of [
		[18, 22],
		[0.5, 3.5],
		[40, 41, 47],
		[99.1, 99.9],
		[-3, 4],
		[12],
	]) {
		const { floor, top } = levelScale(figures);
		assert.ok(floor < Math.min(...figures), `${figures}: floor ${floor}`);
		assert.ok(top > Math.max(...figures), `${figures}: top ${top}`);
	}
});

test("readings never under zero keep a floor at zero or over it", () => {
	assert.ok(levelScale([0.2, 1.4, 2.1]).floor >= 0);
});

test("a level steps through round values, so its ticks read whole", () => {
	// A sensor's day: the readings span 18.2 to 21, which a step of 0.7 would
	// tick at 18.2, 18.9, 19.6.
	const { step, floor } = levelScale([18.2, 19.4, 20.5, 21]);
	assert.ok([1, 2, 5].includes(step), `step ${step}`);
	assert.equal(floor % step, 0);
});
