import assert from "node:assert/strict";
import { test } from "node:test";
import { createLeave } from "@fcalell/ui-core/leave";
import { ask } from "../src/ui/lib/confirm.ts";

const discardEdit = {
	title: "Discard your edit?",
	sentence: "What you changed here is not saved.",
	act: {
		label: "Discard",
		destructive: true,
		onAct: () => Promise.resolve(),
	},
	cancel: "Keep editing",
};

test("with no frame drawing decisions the question goes unasked and the leave goes ahead", async () => {
	const leave = createLeave();
	leave.edit();
	assert.equal(await leave.attempt(() => ask(discardEdit)), true);
	assert.equal(leave.asks(), false);
});
