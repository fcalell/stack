import assert from "node:assert/strict";
import { test } from "node:test";
import { modeScript } from "./mode.ts";

// The script run against a page stood in: the stored choice, the system's
// scheme and the `dark` class on the root, with the system's change listener
// the script registers handed back to fire.
function page(stored: string | null, dark: boolean, defaultMode?: "dark") {
	const classes = new Set<string>();
	let choice = stored;
	let listener: ((event: { matches: boolean }) => void) | undefined;
	const document = {
		documentElement: {
			dataset: {},
			classList: {
				add: (name: string) => classes.add(name),
				toggle: (name: string, force: boolean) =>
					force ? classes.add(name) : classes.delete(name),
			},
		},
	};
	const localStorage = { getItem: () => choice };
	const matchMedia = () => ({
		matches: dark,
		addEventListener: (_: string, fn: typeof listener) => {
			listener = fn;
		},
	});
	new Function(
		"document",
		"localStorage",
		"matchMedia",
		modeScript(defaultMode),
	)(document, localStorage, matchMedia);
	return {
		dark: () => classes.has("dark"),
		listens: () => listener !== undefined,
		store: (value: string) => {
			choice = value;
		},
		system: (matches: boolean) => listener?.({ matches }),
	};
}

test("a mode that came from the system follows the system's change", () => {
	const p = page(null, false);
	assert.equal(p.dark(), false);
	p.system(true);
	assert.equal(p.dark(), true);
	p.system(false);
	assert.equal(p.dark(), false);
});

test("a stored choice is not moved by the system, even one stored after load", () => {
	const kept = page("light", false);
	assert.equal(kept.listens(), true);
	kept.system(true);
	assert.equal(kept.dark(), false);
	const later = page(null, true);
	later.store("dark");
	later.system(false);
	assert.equal(later.dark(), true);
});

test("a default mode is the page's own and listens to nothing", () => {
	const p = page(null, false, "dark");
	assert.equal(p.dark(), true);
	assert.equal(p.listens(), false);
});
