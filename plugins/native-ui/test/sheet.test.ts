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
	assert.match(
		base,
		/const tall =\s*\(form === "menu" && above !== undefined\) \|\| holdsTextArea\(children\)/,
	);
});

test("a Form in a sheet hands its ActionBar to the sheet's foot slot, a store the sheet subscribes to", () => {
	const form = source("form/index.tsx");
	assert.match(form, /liftBars\(children, ActionBar, lifted\)/);
	assert.match(form, /useLayoutEffect\(\(\) => slot\?\.set\(foot\)\)/);
	assert.match(form, /useLayoutEffect\(\(\) => \(\) => slot\?\.set\(null\)/);
	const base = source("sheet/base.tsx");
	// The foot draws the acts, then the slot's bar, and a slot makes the sheet footed.
	assert.match(
		base,
		/\{acts \? <ActionBar acts=\{acts\} \/> : null\}\s*\{bar\}/,
	);
	assert.match(base, /acts !== undefined \|\| handed/);
	// The slot is a store, never state, so setting it does not render the Form.
	assert.doesNotMatch(base, /useState<ReactNode>/);
});
