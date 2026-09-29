import type { ResolvedTheme } from "@fcalell/ui-core/derive";
import {
	densityTokens,
	finePointerTokens,
	modeTokens,
	reducedMotionTokens,
	rootTokens,
	shadowUtilities,
	themeTokens,
} from "@fcalell/ui-core/emit";
import {
	COLOR_NAMES,
	DURATIONS,
	EASINGS,
	MODES,
	RADIUS_ROLES,
	SHADOW_LEVELS,
	SIZES,
	SPACING_ROLES,
	TRACKED_ROLES,
	TYPE_ROLES,
	WIDTHS,
} from "@fcalell/ui-core/tokens";
import type { CssBlock, CssLayer, CssSourceInline } from "../types.ts";
import { renderMediaRule, renderRule } from "./codegen.ts";

// The tokens the web owns on top of the shared contract: the keyframe
// animations in `globals.css`, timed by the contract's rungs and curves.
const WEB_ONLY: Record<string, string> = {
	"--animate-content-show":
		"content-show var(--transition-duration-base) var(--ease-out)",
	"--animate-content-hide":
		"content-hide var(--transition-duration-base) var(--ease-in)",
	"--animate-spin": "spin var(--transition-duration-loop) linear infinite",
};

// The `@theme` block seeds the light palette and the touch set, then the
// web's animations.
export function themeBlock(resolved: ResolvedTheme): CssBlock {
	return {
		kind: "theme",
		declarations: { ...themeTokens(resolved), ...WEB_ONLY },
	};
}

// Every contract utility, generated whether or not a source spells it: a
// Stage 2 artboard is drawn on the emitted sheet in contract classes before
// any component spells them, and the showcase's foundations page builds its
// classes from the token names. The vocabulary is the contract's, not a
// usage scan's; the cost is the whole contract in every sheet.
export function tokenSources(): CssSourceInline[] {
	const set = (names: readonly string[]) => `{${names.join(",")}}`;
	return [
		`{bg,text,border,outline}-${set(COLOR_NAMES)}`,
		`{p,px,py,pt,pb,pl,pr,gap,gap-x,gap-y,w}-${set(SPACING_ROLES)}`,
		`{h,w,min-h,min-w,size}-${set(SIZES)}`,
		`{w,max-w}-${set(WIDTHS)}`,
		`{text,leading}-${set(TYPE_ROLES)}`,
		`tracking-${set(TRACKED_ROLES)}`,
		`rounded-${set(RADIUS_ROLES)}`,
		`shadow-${set(SHADOW_LEVELS)}`,
		`duration-${set([...DURATIONS, "loop"])}`,
		`ease-${set(EASINGS)}`,
	];
}

// `--shadow-*` is one of the reset namespaces, so the elevation ladder ships
// as custom utilities, each reading its mode's variable.
export function shadowBlocks(): CssBlock[] {
	return Object.entries(shadowUtilities()).map(([name, declarations]) => ({
		kind: "utility",
		name,
		declarations,
	}));
}

// The root's own values: the hairline, the focus ring and the light shadows,
// which no utility reads and no mode scope has to be present for.
export function rootLayer(resolved: ResolvedTheme): CssLayer {
	return { name: "base", content: renderRule(":root", rootTokens(resolved)) };
}

// `density: "desktop"` draws the desktop set where the primary pointer is
// fine: it overrides the seeded touch set in `@layer base`, the same cascade
// the dark layer rides, so every cell that names a size or a type role
// (`min-h-control`, `text-body`) follows with no class of its own. A touch
// screen, a phone and a tablet keep the touch set. Whatever the knob,
// `data-density` on the root pins a density, which is how a screenshot
// addresses either density on any device.
export const FINE_POINTER = "(pointer: fine)";
const PINNED_DESKTOP = ':root[data-density="desktop"]';
const PINNED_TOUCH = ':root[data-density="touch"]';

export function densityLayer(resolved: ResolvedTheme): CssLayer {
	const fine = finePointerTokens(resolved);
	const rules: string[] = [];
	if (Object.keys(fine).length > 0) {
		rules.push(renderMediaRule(FINE_POINTER, renderRule(":root", fine)));
		rules.push(
			renderMediaRule(
				FINE_POINTER,
				renderRule(PINNED_TOUCH, densityTokens(resolved, "touch")),
			),
		);
	}
	rules.push(renderRule(PINNED_DESKTOP, densityTokens(resolved, "desktop")));
	return { name: "base", content: rules.join("\n") };
}

// Each mode is a class scope in `@layer base`, not a third block kind:
// `@theme` compiles into `@layer theme` and Tailwind sorts `base` after it,
// so the layered values win over the seeded light ones. `.dark` on the root
// is the mode; `.light` inside it restores the light set for its subtree, so
// a light frame renders light under a dark page. `color-scheme` travels with
// the colors so UA controls follow the scope.
export function modeLayer(resolved: ResolvedTheme): CssLayer {
	const rules = MODES.map((mode) =>
		renderRule(`.${mode}`, {
			"color-scheme": mode,
			...modeTokens(resolved, mode),
		}),
	);
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
