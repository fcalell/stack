import assert from "node:assert/strict";
import { test } from "node:test";
import type { Tone } from "@fcalell/ui-core/tokens";
import { badgesOf, loneCode, META_CUT } from "./facts.ts";

// The phone draws no frame in a test, so the edges of the facts-as-badges line
// are held where they are decided: which badges a list of facts makes, in what
// order, each named by its words, never split and never separated. What each
// badge draws, and that a long one is cut inside its box, is the component's
// (`row/badges.tsx`) and is read on the facts page of the phone app.

const TONES: Record<Tone, string> = {
	done: "Done",
	failed: "Failed",
	running: "Running",
	waiting: "Waiting",
	active: "Active",
	// biome-ignore lint/suspicious/noExplicitAny: the tests name the tones they use
} as any;
const word = (tone: Tone) => TONES[tone] ?? tone;

// A row with every fact kind: the order the facts give is the order drawn.
const EVERY = [
	{ tone: "running", label: "Running" },
	{ warning: "Tests failed twice" },
	{ family: "green", label: "Free" },
	{ ring: true, label: "Required" },
	{ flag: "Shield", label: "Personal data" },
	"at Build",
	"attempt 2",
] as const;

test("every fact kind is one badge, in the order given, the lock after the status", () => {
	const { badges, quiet } = badgesOf({
		facts: EVERY,
		word,
		lock: "Held by CR-12",
		href: "/fast",
	});
	assert.deepEqual(
		badges.map((badge) => badge.kind),
		["status", "lock", "warning", "chip", "ring", "flag", "words", "words"],
	);
	assert.deepEqual(
		badges.map((badge) => badge.name),
		[
			"Running",
			"Held by CR-12",
			"Tests failed twice",
			"Free",
			"Required",
			"Personal data",
			"at Build",
			"attempt 2",
		],
	);
	assert.equal(quiet.length, 0);
});

test("a badge is read as its words: the name is its whole text, a status reads its word", () => {
	const text =
		"A long fact that the line cuts inside its badge but never in its name";
	const { badges } = badgesOf({
		facts: [{ tone: "failed" }, text],
		word,
	});
	const [status, long] = badges;
	assert.equal(status?.name, "Failed");
	assert.deepEqual(status?.runs, ["Failed"]);
	assert.equal(long?.kind, "words");
	assert.equal(long?.name, text);
	assert.deepEqual(long?.runs, [text]);
});

test("a status with no word of its own is its tone mark alone, named by the tone's word", () => {
	const { badges } = badgesOf({
		facts: [{ tone: "waiting", label: "" }],
		word,
	});
	assert.equal(badges.length, 1);
	assert.deepEqual(badges[0]?.runs, []);
	assert.equal(badges[0]?.name, "Waiting");
});

test("no separator: a middle dot inside a string is its text, one badge", () => {
	const { badges } = badgesOf({ facts: ["at Build · attempt 2", "x"], word });
	assert.deepEqual(
		badges.map((badge) => badge.name),
		["at Build · attempt 2", "x"],
	);
});

test("a fact with no text and a ring that does not hold draw nothing", () => {
	const { badges } = badgesOf({
		facts: [
			"",
			{ ring: false, label: "Required" },
			{ tone: "done", label: "Ready" },
			undefined,
			false,
		],
		word,
	});
	assert.deepEqual(
		badges.map((badge) => badge.name),
		["Ready"],
	);
});

test("a further status is a badge of its own with its tone mark; the lock follows the first", () => {
	const { badges } = badgesOf({
		facts: [
			{ tone: "done", label: "Staging: Passing" },
			{ tone: "failed", label: "Production: Failing" },
			"2 regions",
		],
		lock: "Held",
		word,
	});
	assert.deepEqual(
		badges.map((badge) => [badge.kind, badge.name]),
		[
			["status", "Staging: Passing"],
			["lock", "Held"],
			["status", "Production: Failing"],
			["words", "2 regions"],
		],
	);
	assert.deepEqual(
		badges.filter((badge) => badge.kind === "status").map((b) => b.tone),
		["done", "failed"],
	);
});

test("a mark with no words stands in the end group, never in the line", () => {
	const mark = {
		flag: "Globe",
		label: "External source",
		words: false,
	} as const;
	const { badges, quiet } = badgesOf({ facts: [mark, "plain"], word });
	assert.deepEqual(quiet, [mark]);
	assert.deepEqual(
		badges.map((badge) => badge.name),
		["plain"],
	);
});

test("a quoted part is cut at the meta cut, its full text no part of the badge", () => {
	const quoted = "x".repeat(META_CUT + 10);
	const { badges } = badgesOf({ facts: [{ quoted }], word });
	assert.equal(badges[0]?.name, `“${"x".repeat(META_CUT - 1)}…”`);
});

test("one lone code is the row's value, no badge; among others it is a badge in the mono", () => {
	const lone = badgesOf({ facts: [{ code: "pnpm build" }], word }).badges;
	assert.equal(loneCode(lone), "pnpm build");
	const several = badgesOf({
		facts: [{ code: "pnpm build" }, "main"],
		word,
	}).badges;
	assert.equal(loneCode(several), undefined);
	assert.deepEqual(several[0]?.runs, [{ code: "pnpm build" }]);
	// A lock beside it makes a badge of it too.
	const locked = badgesOf({
		facts: [{ code: "pnpm build" }],
		word,
		lock: "Held",
	}).badges;
	assert.equal(loneCode(locked), undefined);
});

test("the lock leads where there is no status, and links only with an href", () => {
	const plain = badgesOf({ facts: ["a", "b"], word, lock: "Held" }).badges;
	assert.deepEqual(
		plain.map((badge) => badge.kind),
		["lock", "words", "words"],
	);
	assert.equal(plain[0]?.href, undefined);
	const linked = badgesOf({
		facts: [{ tone: "done" }, "a"],
		word,
		lock: "Held",
		href: "/held",
	}).badges;
	assert.deepEqual(
		linked.map((badge) => badge.kind),
		["status", "lock", "words"],
	);
	assert.equal(linked[1]?.href, "/held");
});

test("a tick's blocked reason is the first badge, plain", () => {
	const { badges } = badgesOf({
		facts: [{ tone: "done" }, "a"],
		word,
		blocked: "Needs review",
	});
	assert.equal(badges[0]?.kind, "words");
	assert.equal(badges[0]?.name, "Needs review");
	assert.equal(badges[1]?.kind, "status");
});

test("a painted row keeps one filler per fact the slot gave, no chip and no boolean mark", () => {
	const { badges, quiet } = badgesOf({
		facts: [
			{ tone: "done", label: "" },
			{ warning: "" },
			{ family: "green", label: "" },
			{ ring: true, label: "Required" },
			"",
			"",
		],
		word,
		lock: "Held",
		painted: true,
		fillers: true,
	});
	assert.deepEqual(
		badges.map((badge) => badge.kind),
		["status", "lock", "warning", "words", "words"],
	);
	assert.ok(badges.every((badge) => badge.painted && badge.name === ""));
	assert.equal(quiet.length, 0);
});

test("a fact that waits is a filler; its loaded neighbours keep their form", () => {
	const waiting = () => {};
	const { badges } = badgesOf({
		facts: [
			{ tone: "running", label: "Running" },
			waiting,
			{ family: "red", label: "Hot" },
		],
		word,
		fillers: true,
	});
	assert.deepEqual(
		badges.map((badge) => [badge.kind, Boolean(badge.painted)]),
		[
			["status", false],
			["words", true],
			["chip", false],
		],
	);
});
