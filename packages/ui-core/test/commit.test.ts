import assert from "node:assert/strict";
import { test } from "node:test";
import { commitMoment } from "../src/commit.ts";

function field(initial: string) {
	const moment = commitMoment<string>();
	const commits: string[] = [];
	let value = initial;
	const hear = (next: string) => commits.push(next);
	return {
		commits,
		get value() {
			return value;
		},
		focus: () => moment.focus(value),
		type: (next: string) => {
			value = next;
		},
		enter: () => moment.commit(value, hear),
		blur: () => moment.leave(value, hear),
		escape: () =>
			moment.cancel(value, (restored) => {
				value = restored;
			}),
	};
}

test("leaving a field without a change never commits", () => {
	const name = field("Shop");
	name.focus();
	name.blur();
	name.focus();
	name.type("Store");
	name.type("Shop");
	name.blur();
	assert.deepEqual(name.commits, []);
});

test("leaving a changed field commits its value once", () => {
	const name = field("Shop");
	name.focus();
	name.type("Store");
	name.blur();
	name.blur();
	assert.deepEqual(name.commits, ["Store"]);
});

test("Enter commits, and leaving after it commits nothing more", () => {
	const name = field("Shop");
	name.focus();
	name.type("Store");
	name.enter();
	name.enter();
	name.blur();
	assert.deepEqual(name.commits, ["Store"]);
});

test("Escape restores the value at focus, and leaving then commits nothing", () => {
	const name = field("Shop");
	name.focus();
	name.type("Store");
	name.escape();
	assert.equal(name.value, "Shop");
	name.blur();
	assert.deepEqual(name.commits, []);
});

test("Escape ends the edit: leaving before the value put back renders commits nothing", () => {
	const moment = commitMoment<string>();
	const commits: string[] = [];
	const restored: string[] = [];
	moment.focus("Shop");
	moment.cancel("Store", (value) => restored.push(value));
	moment.leave("Store", (value) => commits.push(value));
	assert.deepEqual(restored, ["Shop"]);
	assert.deepEqual(commits, []);
});

test("Escape after an Enter restores the committed value", () => {
	const name = field("Shop");
	name.focus();
	name.type("Store");
	name.enter();
	name.type("Stor");
	name.escape();
	assert.equal(name.value, "Store");
	assert.deepEqual(name.commits, ["Store"]);
});

test("nothing commits before the field took focus", () => {
	const name = field("Shop");
	name.type("Store");
	name.blur();
	name.enter();
	assert.deepEqual(name.commits, []);
});
