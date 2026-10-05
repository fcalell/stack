import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { newest } from "../src/ui/components/thread/newest.ts";

const source = (path: string) =>
	readFileSync(new URL(`../src/ui/${path}`, import.meta.url), "utf8");

test("a Place or Split knows a filling Thread from its children before it mounts: no `ThreadFills`, no `fills` state, one scroll in every form", () => {
	for (const path of [
		"components/place/index.tsx",
		"components/split/index.tsx",
		"components/thread/index.tsx",
		"lib/frame.ts",
	]) {
		const code = source(path);
		assert.doesNotMatch(
			code,
			/ThreadFills|setFills|\[fills\b|useLayoutEffect/,
			path,
		);
	}
	assert.match(source("components/place/index.tsx"), /holdsThread\(children\)/);
	assert.match(source("components/split/index.tsx"), /holdsThread\(main\)/);
	assert.doesNotMatch(
		source("components/split/index.tsx"),
		/state: "fills" \}\), REGION\)\}>/,
	);
});

interface Turn {
	id: string;
	author: "you" | "other" | "system";
	body: string;
}

const turns: Turn[] = [
	{ id: "1", author: "other", body: "hi" },
	{ id: "2", author: "you", body: "question" },
	{ id: "3", author: "other", body: "answer" },
];

const message = {
	key: (turn: Turn) => turn.id,
	author: (turn: Turn) => turn.author,
	body: (turn: Turn) => turn.body,
};

test("the Thread announces its newest reply by key, with its body", () => {
	assert.deepEqual(newest(turns, "loaded", message), {
		text: "answer",
		id: "3",
	});
});

test("the reader's own newest message is silent but moves the identity on", () => {
	assert.deepEqual(newest(turns.slice(0, 2), "loaded", message), {
		text: "",
		id: "2",
	});
});

test("a pending, failed or missing log holds the baseline, so a retry that lands announces no history", () => {
	for (const state of ["pending", "failed", "missing"] as const)
		assert.deepEqual(newest(undefined, state, message), { text: undefined });
});

test("an empty log is the empty text, so its first message is news", () => {
	assert.deepEqual(newest([], "empty", message), { text: "" });
	assert.deepEqual(newest(undefined, "empty", message), { text: "" });
});
