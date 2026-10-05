import assert from "node:assert/strict";
import { test } from "node:test";
import { endSubmit } from "../src/ui/lib/form.ts";

test("a filled act's press ends the native submit it would start", () => {
	let prevented = 0;
	const event = { preventDefault: () => prevented++ };
	// The act swaps the step body, detaching the form; the click's default
	// (the submit) is already cancelled, so none is left pending.
	endSubmit(true, event);
	assert.equal(prevented, 1);
});

test("a press that is no submit keeps its default", () => {
	let prevented = 0;
	endSubmit(false, { preventDefault: () => prevented++ });
	assert.equal(prevented, 0);
});
