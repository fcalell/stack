import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

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
