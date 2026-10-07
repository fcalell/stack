import assert from "node:assert/strict";
import { test } from "node:test";
import type { PreviewGlobal } from "../src/types.ts";
import {
	applyGlobals,
	globalTypes,
	initialGlobals,
} from "../src/ui/globals.ts";

const mode: PreviewGlobal = {
	name: "mode",
	title: "Mode",
	values: ["light", "dark"],
	default: "light",
	apply: { classes: { dark: "dark" } },
};
const density: PreviewGlobal = {
	name: "density",
	title: "Density",
	values: ["desktop", "touch"],
	default: "desktop",
	apply: { attribute: "data-density" },
};

function root() {
	const attributes = new Map<string, string>();
	const classes = new Set<string>();
	return {
		attributes,
		classes,
		setAttribute: (name: string, value: string) => attributes.set(name, value),
		classList: {
			toggle: (name: string, force: boolean) =>
				force ? classes.add(name) : classes.delete(name),
		},
	};
}

test("each global is a toolbar select that opens on its default", () => {
	assert.deepEqual(initialGlobals([mode, density]), {
		mode: "light",
		density: "desktop",
	});
	assert.deepEqual(globalTypes([mode]), {
		mode: {
			description: "Mode",
			toolbar: {
				title: "Mode",
				items: ["light", "dark"],
				dynamicTitle: true,
			},
		},
	});
});

test("a chosen value reaches the root by the global's own rule", () => {
	const r = root();
	applyGlobals(r, [mode, density], { mode: "dark", density: "touch" });
	assert.equal(r.attributes.get("data-density"), "touch");
	assert.deepEqual([...r.classes], ["dark"]);

	applyGlobals(r, [mode, density], { mode: "light", density: "desktop" });
	assert.equal(r.attributes.get("data-density"), "desktop");
	assert.deepEqual([...r.classes], []);
});

test("a global the toolbar never set applies its default", () => {
	const r = root();
	applyGlobals(r, [density], {});
	assert.equal(r.attributes.get("data-density"), "desktop");
});
