import assert from "node:assert/strict";
import { test } from "node:test";
import { pressStands } from "../src/reason.ts";

test("a press under a reason stands while the act is blocked by it", () => {
	const pressed = "Name the project first.";
	assert.equal(pressStands("Name the project first.", pressed), true);
});

test("the same press stands for nothing once unblocked or blocked by another reason", () => {
	const pressed = "Name the project first.";
	assert.equal(pressStands(undefined, pressed), false);
	assert.equal(pressStands("Pick a region first.", pressed), false);
});

test("nothing stands before a press", () => {
	assert.equal(pressStands("Name the project first.", undefined), false);
	assert.equal(pressStands(undefined, undefined), false);
});
