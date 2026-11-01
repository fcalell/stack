import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveTheme } from "./derive.ts";
import {
	contrastRatio,
	luminance,
	type Oklch,
	veiledLuminance,
} from "./oklch.ts";
import { COLORS } from "./tokens.ts";

const parse = (value: string): Oklch => {
	const match = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)/.exec(value);
	assert.ok(match, value);
	return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
};

// A badge's words are the meta ink on the meta ink's own tenth, laid over the
// ground the row stands on: the text floor holds on every ground, in both
// modes, and the ground is a step away from the one under it.
for (const mode of ["light", "dark"] as const) {
	test(`a badge's words hold 4.5:1 on its fill in ${mode}`, () => {
		const colors = deriveTheme().colors[mode];
		const ink = parse(colors["ink-meta"]);
		const alpha = COLORS["fill-badge"];
		assert.ok("veil" in alpha && alpha.veil === "ink-meta");
		for (const ground of ["canvas", "surface", "group"] as const) {
			const under = parse(colors[ground]);
			const filled = veiledLuminance(ink, alpha.alpha, under);
			assert.ok(
				contrastRatio(luminance(ink.l, ink.c, ink.h), filled) >= 4.5,
				`${mode} ${ground}`,
			);
			// The fill is seen against the ground, however faintly.
			assert.ok(
				contrastRatio(luminance(under.l, under.c, under.h), filled) > 1.05,
				`${mode} ${ground} fill`,
			);
		}
	});
}
