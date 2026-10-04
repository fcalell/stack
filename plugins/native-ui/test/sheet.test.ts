import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type * as sheet from "../src/ui/components/sheet/index.tsx";

const source = (path: string) =>
	readFileSync(
		new URL(`../src/ui/components/${path}`, import.meta.url),
		"utf8",
	);

test("a sheet's height is read off what it holds: a TextArea reads no sheet context and the sheet takes no grow", () => {
	const unhooked: "useSheetGrow" extends keyof typeof sheet ? never : true =
		true;
	void unhooked;
	const textArea = source("text-area/index.tsx");
	assert.doesNotMatch(textArea, /from "\.\.\/sheet"/);
	assert.doesNotMatch(textArea, /useEffect/);
	const base = source("sheet/base.tsx");
	assert.doesNotMatch(base, /GrowContext|useSheetGrow|setTall|\bgrow:/);
	assert.match(base, /const tall = holdsTextArea\(children\)/);
});
