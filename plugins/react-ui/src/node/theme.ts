import type { ResolvedTheme } from "@fcalell/ui-core/derive";
import {
	densityTokens,
	modeTokens,
	raisedGroundTokens,
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
	RAISED_GROUNDS,
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
// animations, timed by the contract's rungs and curves. `content-show` and
// `content-hide` are keyframes in `globals.css`; `spin` is Tailwind's own,
// which it emits beside this `--animate-spin`.
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
		`{bg,text,border,outline,divide}-${set(COLOR_NAMES)}`,
		`{p,px,py,pt,pb,pl,pr,gap,gap-x,gap-y,w}-${set(SPACING_ROLES)}`,
		`{h,w,min-h,min-w,size,p,translate-x}-${set(SIZES)}`,
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

// The desktop set draws where the primary pointer is fine: it overrides the
// seeded touch set in `@layer base`, the same cascade the dark layer rides,
// so every cell that names a size or a type role (`min-h-control`,
// `text-body`) follows with no class of its own. A touch screen, a phone and
// a tablet keep the touch set. `data-density` on the root pins either set on
// any device, which is how the showcase and a board address a density.
export const FINE_POINTER = "(pointer: fine)";
const PINNED_DESKTOP = ':root[data-density="desktop"]';
const PINNED_TOUCH = ':root[data-density="touch"]';

export function densityLayer(resolved: ResolvedTheme): CssLayer {
	const desktop = densityTokens(resolved, "desktop");
	const rules = [
		renderMediaRule(FINE_POINTER, renderRule(":root", desktop)),
		renderMediaRule(
			FINE_POINTER,
			renderRule(PINNED_TOUCH, densityTokens(resolved, "touch")),
		),
		renderRule(PINNED_DESKTOP, desktop),
	];
	return { name: "base", content: rules.join("\n") };
}

// `touch:` draws where the density layer draws the touch set: under the touch
// pin, or with no desktop pin where the pointer is not fine. It is how a
// molecule's structure (not a token) follows density; a size or a type role
// follows through its variable and never needs it.
export function touchVariant(): CssBlock {
	const slot = (selector: string) => `${selector} & {\n\t@slot;\n}`;
	return {
		kind: "variant",
		name: "touch",
		content: [
			slot(PINNED_TOUCH),
			renderMediaRule(
				`not ${FINE_POINTER}`,
				slot(':root:not([data-density="desktop"])'),
			),
		].join("\n"),
	};
}

// `pb-safe` keeps a bottom bar clear of the home indicator under `viewport-fit=cover`.
export function safeAreaUtility(): CssBlock {
	return {
		kind: "utility",
		name: "pb-safe",
		declarations: { "padding-bottom": "env(safe-area-inset-bottom)" },
	};
}

// Each mode is a class scope in `@layer base`, not a third block kind:
// `@theme` compiles into `@layer theme` and Tailwind sorts `base` after it,
// so the layered values win over the seeded light ones. `.dark` on the root
// is the mode; `.light` inside it restores the light set for its subtree, so
// a light frame renders light under a dark page. `color-scheme` travels with
// the colors so UA controls follow the scope. A raised ground's fill class
// then re-points the hairline for its subtree, after the mode scopes so an
// element that is both keeps the re-point.
export function modeLayer(resolved: ResolvedTheme): CssLayer {
	const rules = MODES.map((mode) =>
		renderRule(`.${mode}`, {
			"color-scheme": mode,
			...modeTokens(resolved, mode),
		}),
	);
	rules.push(
		renderRule(
			RAISED_GROUNDS.map((ground) => `.bg-${ground}`).join(", "),
			raisedGroundTokens(),
		),
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
