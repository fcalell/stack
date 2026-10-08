import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PAGE_BODY } from "@fcalell/ui-core/variants";

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

const classes = (path: string, name: string) => {
	const found = new RegExp(`const ${name} = "([^"]*)"`).exec(source(path));
	assert.ok(found, `${name} is declared in ${path}`);
	return (found[1] ?? "").split(" ");
};

test("a part above a filling Thread keeps `PAGE_BODY`'s inset at the sides and the top, and the body its gap", () => {
	const gap = /gap-\S+/.exec(PAGE_BODY)?.[0];
	const inset = /(?:^| )p-(\S+)/.exec(PAGE_BODY)?.[1];
	assert.ok(gap && inset, "PAGE_BODY sets a gap and an inset");
	const pair = "components/item-header/pair.tsx";
	assert.deepEqual(
		[...classes(pair, "ABOVE"), ...classes(pair, "ABOVE_FIRST")],
		[`mx-${inset}`, `mt-${inset}`],
	);
	assert.ok(classes("components/place/index.tsx", "BODY_FILLED").includes(gap));
});

test("`replying` ends only the loaded log on one waiting message of the other author", () => {
	const code = source("components/thread/index.tsx");
	const loaded = code.indexOf('state === "empty" && props.empty');
	const replying = code.indexOf('<Message key="replying" author="other"');
	assert.ok(
		loaded > 0 && replying > loaded,
		"after every other state returned",
	);
	assert.match(code, /props\.replying \? \(/);
});
