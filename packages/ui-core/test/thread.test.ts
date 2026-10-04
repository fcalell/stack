import assert from "node:assert/strict";
import { test } from "node:test";
import { WAITING_MESSAGES } from "../src/list-state.ts";
import { rosterEntries } from "../src/roster.ts";

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
