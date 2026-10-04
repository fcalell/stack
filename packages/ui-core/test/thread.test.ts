import assert from "node:assert/strict";
import { test } from "node:test";
import { WAITING_MESSAGES } from "../src/list-state.ts";
import { rosterEntries } from "../src/roster.ts";
import { ENGLISH, WORD_KEYS } from "../src/tokens.ts";
import { THREAD_LATEST } from "../src/variants.ts";

const thread = rosterEntries().find(([, name]) => name === "Thread")?.[2];

test("a Thread takes its messages as data, never as children", () => {
	assert.ok(thread);
	for (const prop of ["query", "items", "message", "sentence", "empty"])
		assert.ok(thread.props.includes(prop), prop);
	assert.ok(!thread.props.includes("children"));
	assert.ok(thread.props.includes("foot"));
});

test("a Thread lists its collection's states", () => {
	assert.ok(thread);
	for (const state of ["loading", "error", "empty"] as const)
		assert.ok(thread.states.includes(state), state);
});

test("a pending Thread waits as another's reply, yours, another's reply", () => {
	assert.deepEqual(
		WAITING_MESSAGES.map((turn) => turn.author),
		["other", "you", "other"],
	);
});

test("a Thread's way back to the newest message takes no prop and floats on its own cell", () => {
	assert.ok(thread);
	assert.ok(!thread.props.includes("latest"));
	assert.ok(thread.holds?.includes("THREAD_LATEST"));
	assert.match(THREAD_LATEST, /\bshadow-float\b/);
	assert.ok(WORD_KEYS.includes("latest"));
	assert.equal(ENGLISH.latest, "Latest");
});
