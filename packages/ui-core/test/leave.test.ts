import assert from "node:assert/strict";
import { test } from "node:test";
import { createLeave } from "../src/leave.ts";

const keep = () => Promise.resolve(false);
const discard = () => Promise.resolve(true);

test("a form asks nothing before a field took input", async () => {
	const leave = createLeave();
	assert.equal(leave.asks(), false);
	assert.equal(await leave.attempt(keep), true);
});

test("an edited form asks, and keeping the edit holds the leave", async () => {
	const leave = createLeave();
	leave.edit();
	assert.equal(leave.asks(), true);
	assert.equal(await leave.attempt(keep), false);
	assert.equal(leave.asks(), true);
});

test("discarding lets the leave through and a second attempt asks nothing", async () => {
	const leave = createLeave();
	leave.edit();
	assert.equal(await leave.attempt(discard), true);
	assert.equal(leave.asks(), false);
	let asked = 0;
	await leave.attempt(() => {
		asked++;
		return discard();
	});
	assert.equal(asked, 0);
});

test("a leave is asked once while its question is open", async () => {
	const leave = createLeave();
	leave.edit();
	let answer: (discard: boolean) => void = () => {};
	let asked = 0;
	const first = leave.attempt(
		() =>
			new Promise<boolean>((resolve) => {
				asked++;
				answer = resolve;
			}),
	);
	const second = await leave.attempt(() => {
		asked++;
		return discard();
	});
	assert.equal(second, false);
	assert.equal(asked, 1);
	answer(false);
	assert.equal(await first, false);
	// The question is over: the next leave asks again.
	assert.equal(await leave.attempt(keep), false);
});

test("a press clears the edit, so a sync act that navigates is not asked", async () => {
	const leave = createLeave();
	leave.edit();
	leave.press();
	assert.equal(leave.asks(), false);
	// The act navigates inside its call.
	assert.equal(await leave.attempt(keep), true);
	leave.settle(false);
	assert.equal(leave.asks(), false);
});

test("no question while the act runs, and none after it resolves", async () => {
	const leave = createLeave();
	leave.edit();
	leave.press();
	assert.equal(await leave.attempt(keep), true);
	leave.settle(false);
	assert.equal(await leave.attempt(keep), true);
});

test("a rejected act puts the edit back", async () => {
	const leave = createLeave();
	leave.edit();
	leave.press();
	leave.settle(true);
	assert.equal(leave.asks(), true);
	assert.equal(await leave.attempt(keep), false);
});

test("a rejection of a press that took no edit puts back none", () => {
	const leave = createLeave();
	leave.press();
	leave.settle(true);
	assert.equal(leave.asks(), false);
});

test("input while the act runs stands edited once it resolves", () => {
	const leave = createLeave();
	leave.edit();
	leave.press();
	leave.edit();
	assert.equal(leave.asks(), false);
	leave.settle(false);
	assert.equal(leave.asks(), true);
});

test("an edit after a saved form asks again", async () => {
	const leave = createLeave();
	leave.edit();
	leave.press();
	leave.settle(false);
	leave.edit();
	assert.equal(await leave.attempt(keep), false);
});
