import type { ResolvedTheme } from "@fcalell/ui-core/derive";
import {
	compactTokens,
	densityTokens,
	modeTokens,
	reducedMotionTokens,
	shadowUtilities,
	themeTokens,
} from "@fcalell/ui-core/emit";
import { MODES } from "@fcalell/ui-core/tokens";
import type { CssBlock, CssLayer } from "../types.ts";
import { renderMediaRule, renderRule } from "./codegen.ts";

// The tokens the web owns on top of the shared contract: the two keyframe
// animations in `globals.css`, timed by the contract's rungs and curves.
const WEB_ONLY: Record<string, string> = {
	"--animate-content-show":
		"content-show var(--transition-duration-base) var(--ease-out)",
	"--animate-content-hide":
		"content-hide var(--transition-duration-base) var(--ease-in)",
};

// The `@theme` block seeds the light palette, then the web's animations.
export function themeBlock(resolved: ResolvedTheme): CssBlock {
	return {
		kind: "theme",
		declarations: { ...themeTokens(resolved), ...WEB_ONLY },
	};
}

// `--shadow-*` is one of the reset namespaces, so the elevation ladder ships
// as custom utilities instead: a shadow, or under `elevation: "flat"` the
// `edge` ring.
export function shadowBlocks(resolved: ResolvedTheme): CssBlock[] {
	return Object.entries(shadowUtilities(resolved)).map(
		([name, declarations]) => ({ kind: "utility", name, declarations }),
	);
}

// `density: "desktop"` draws the controls compact where the primary pointer
// is fine: the compact sizes override the seeded touch ones in `@layer base`,
// the same cascade the dark layer rides, so every cell that names a size
// (`min-h-floor`, `py-row-y`) follows with no class of its own. A touch
// screen, a phone and a tablet keep the 44 px floor. Whatever the knob,
// `data-density` on the root pins a density: `desktop` draws the compact set,
// and `touch` puts the touch set back under a fine pointer, which is how a
// screenshot addresses either density on any device.
export const FINE_POINTER = "(pointer: fine)";
const PINNED_COMPACT = ':root[data-density="desktop"]';
const PINNED_TOUCH = ':root[data-density="touch"]';

export function densityLayer(resolved: ResolvedTheme): CssLayer {
	const compact = compactTokens(resolved);
	const rules: string[] = [];
	if (Object.keys(compact).length > 0) {
		rules.push(renderMediaRule(FINE_POINTER, renderRule(":root", compact)));
		rules.push(
			renderMediaRule(
				FINE_POINTER,
				renderRule(PINNED_TOUCH, densityTokens(resolved, "touch")),
			),
		);
	}
	rules.push(renderRule(PINNED_COMPACT, densityTokens(resolved, "compact")));
	return { name: "base", content: rules.join("\n") };
}

// Each mode is a class scope in `@layer base`, not a third block kind:
// `@theme` compiles into `@layer theme` and Tailwind sorts `base` after it,
// so the layered values win over the seeded light ones. `.dark` on the root
// is the mode; `.light` inside it restores the light set for its subtree, so
// a light frame renders light under a dark page. `color-scheme` travels with
// the colors so UA controls follow the scope.
export function modeLayer(resolved: ResolvedTheme): CssLayer {
	const rules = MODES.map((mode) => {
		const declarations: Record<string, string> = { "color-scheme": mode };
		for (const [token, value] of Object.entries(modeTokens(resolved, mode))) {
			declarations[`--color-${token}`] = value;
		}
		return renderRule(`.${mode}`, declarations);
	});
	return { name: "base", content: rules.join("\n") };
}

// Under reduced motion every duration rung is 0, so no transition or
// animation that reads one moves.
export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function motionLayer(): CssLayer {
	return {
		name: "base",
		content: renderMediaRule(
			REDUCED_MOTION,
			renderRule(":root", reducedMotionTokens()),
		),
	};
}
