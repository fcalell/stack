import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { announcement, type Taken } from "../src/ui/lib/announce.ts";

const ui = new URL("../src/ui/", import.meta.url);

test("only lib/live names the live-region and announce APIs: every other site announces through useLive", () => {
	const files = readdirSync(ui, { recursive: true, encoding: "utf8" }).filter(
		(path) => /\.tsx?$/.test(path) && path !== "lib/live.ts",
	);
	assert.ok(files.length > 0);
	for (const path of files)
		assert.doesNotMatch(
			readFileSync(new URL(path, ui), "utf8"),
			/accessibilityLiveRegion|announceForAccessibility/,
			path,
		);
});

// What each step announces after the first, which stands as the baseline.
const said = (steps: Taken[]) => {
	let before: Taken | null = steps[0] ?? null;
	const out: (string | undefined)[] = [];
	for (const step of steps.slice(1)) {
		out.push(announcement(before, step));
		before = step;
	}
	return out;
};

test("without an id a changed text is announced, a repeat and an empty text are not", () => {
	assert.deepEqual(
		said([{ text: "a" }, { text: "a" }, { text: "b" }, { text: "" }]),
		[undefined, "b", undefined],
	);
});

test("nothing taken yet makes the first text news, an empty one silence", () => {
	assert.equal(announcement(null, { text: "saved" }), "saved");
	assert.equal(announcement(null, { text: "" }), undefined);
});

test("a wait holds the baseline: the first text after it is not announced", () => {
	assert.deepEqual(said([{ text: undefined }, { text: "old" }]), [undefined]);
});

test("with an id the id changing announces, the text changing under one id does not", () => {
	assert.deepEqual(
		said([
			{ text: "one", id: "1" },
			{ text: "Th", id: "2" },
			{ text: "The answer", id: "2" },
			{ text: "The answer is long", id: "2" },
		]),
		["Th", undefined, undefined],
	);
});

test("with an id a second message with an identical body is announced", () => {
	assert.deepEqual(
		said([
			{ text: "ok", id: "1" },
			{ text: "ok", id: "2" },
		]),
		["ok"],
	);
});

test("with an id, silence for an empty text still moves the identity on", () => {
	assert.deepEqual(
		said([
			{ text: "one", id: "1" },
			{ text: "", id: "2" },
			{ text: "reply", id: "3" },
		]),
		[undefined, "reply"],
	);
});

test("a first message into an empty log is news", () => {
	assert.deepEqual(said([{ text: "" }, { text: "hello", id: "1" }]), ["hello"]);
});
