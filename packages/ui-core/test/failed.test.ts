import assert from "node:assert/strict";
import { test } from "node:test";
import { ROSTER, rosterEntries } from "../src/roster.ts";
import { ENGLISH, WORD_KEYS } from "../src/tokens.ts";

test("Failed is a roster part on both platforms, with a sentence and an act", () => {
	const failed = ROSTER.shared.Failed;
	assert.ok(failed);
	assert.deepEqual(failed.props, ["sentence", "act"]);
	for (const platform of ["web", "native"] as const)
		assert.ok(
			rosterEntries(platform).some(([, name]) => name === "Failed"),
			`Failed is missing from ${platform}`,
		);
});

test("Failed draws the failed form: the mark and the hairline act, never the create act", () => {
	const draws = ROSTER.shared.Failed?.draws ?? [];
	assert.ok(draws.includes("EMPTY_MARK"));
	assert.ok(draws.includes("ICON.fit.control"));
	assert.ok(draws.includes("BUTTON.act.secondary"));
	assert.ok(!draws.includes("BUTTON.act.primary"));
	assert.ok(!draws.includes("BUTTON_LABEL.act.primary"));
	// The EmptyState keeps the create act.
	assert.ok(ROSTER.shared.EmptyState?.draws.includes("BUTTON.act.primary"));
});

test("the words a not-found page and a discarded edit say are in English", () => {
	for (const key of [
		"notFound",
		"nowhere",
		"discardEdit",
		"keepEditing",
	] as const) {
		assert.ok(WORD_KEYS.includes(key), `${key} is not a word`);
		assert.ok(ENGLISH[key].length > 0);
	}
	assert.equal(ENGLISH.notFound, "Not found");
	assert.equal(ENGLISH.nowhere, "Nothing is at this address.");
	assert.equal(ENGLISH.keepEditing, "Keep editing");
});
