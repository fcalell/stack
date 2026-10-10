import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PAGE_BODY } from "@fcalell/ui-core/variants";

const source = (path: string) =>
	readFileSync(new URL(`../src/ui/${path}`, import.meta.url), "utf8");

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
