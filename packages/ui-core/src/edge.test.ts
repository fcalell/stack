import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveTheme } from "./derive.ts";
import { softGroundTokens } from "./emit.ts";
import {
	contrastRatio,
	luminance,
	type Oklch,
	veiledLuminance,
} from "./oklch.ts";
import { COLORS, SOFT_GROUNDS } from "./tokens.ts";

const parse = (value: string): Oklch => {
	const match = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)/.exec(value);
	assert.ok(match, value);
	return { l: Number(match[1]), c: Number(match[2]), h: Number(match[3]) };
};

test("a soft ground re-points the hairline to the strong edge", () => {
	assert.deepEqual(softGroundTokens(), {
		"--color-edge": "var(--color-edge-strong)",
	});
});

// A part on a tone's soft ground names `edge` and draws `edge-strong`, so the
// strong edge is a boundary (3:1) on every soft ground, in both modes, a veiled
// ground over each ground it can lie on.
for (const mode of ["light", "dark"] as const) {
	test(`the strong edge holds 3:1 on every soft ground in ${mode}`, () => {
		const colors = deriveTheme().colors[mode];
		const edge = parse(colors["edge-strong"]);
		const edgeLuminance = luminance(edge.l, edge.c, edge.h);
		for (const ground of SOFT_GROUNDS) {
			let declared = COLORS[ground];
			while ("alias" in declared) declared = COLORS[declared.alias];
			const grounds =
				"veil" in declared
					? (["canvas", "surface", "group"] as const).map((under) =>
							veiledLuminance(
								parse(colors[declared.veil]),
								declared.alpha,
								parse(colors[under]),
							),
						)
					: [luminance(...tuple(parse(colors[ground])))];
			for (const luminanceOf of grounds)
				assert.ok(
					contrastRatio(edgeLuminance, luminanceOf) >= 3,
					`${mode} ${ground}`,
				);
		}
	});
}

function tuple(color: Oklch): [number, number, number] {
	return [color.l, color.c, color.h];
}
