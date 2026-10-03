import type { ResolvedTheme } from "./derive.ts";
import {
	BREAKPOINTS,
	COLOR_NAMES,
	type Density,
	DURATIONS,
	EASINGS,
	FONT_ROLES,
	HAIRLINE_PX,
	MEASURES,
	type Mode,
	RADIUS_ROLES,
	RING_OFFSET_PX,
	RING_PX,
	SHADOW_LEVELS,
	type ShadowLevel,
	SIZES,
	SPACING_ROLES,
	TRACKED_ROLES,
	TYPE_ROLES,
	WIDTHS,
	ZEROED_NAMESPACES,
} from "./tokens.ts";

export type ShadowUtility = `shadow-${ShadowLevel}`;

// The `@theme` record, keyed by full custom-property name. It carries the
// light colors and the touch density set: in Tailwind v4 a property declared
// only inside a variant block generates no utility, so without them
// `bg-canvas` and `min-h-control` would not exist. Which mode and density
// seed it never shows: each platform switches every value through the active
// scope's variables, since a non-inline `@theme` utility reads its variable.
//
// Each type role renders twice, from one resolved value: the Tailwind v4
// modifier so `text-title` carries its own leading on web, and the standalone
// namespace so `leading-title` exists on its own.
export function themeTokens(resolved: ResolvedTheme): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const namespace of ZEROED_NAMESPACES) tokens[namespace] = "initial";
	Object.assign(tokens, densityTokens(resolved, "touch"));
	for (const role of TRACKED_ROLES) {
		tokens[`--text-${role}--letter-spacing`] = resolved.tracking[role];
	}
	for (const role of TRACKED_ROLES) {
		tokens[`--tracking-${role}`] = resolved.tracking[role];
	}
	for (const role of RADIUS_ROLES) {
		tokens[`--radius-${role}`] = resolved.radii[role];
	}
	for (const width of WIDTHS) {
		tokens[`--container-${width}`] = resolved.widths[width];
	}
	for (const bp of BREAKPOINTS) {
		tokens[`--breakpoint-${bp}`] = resolved.breakpoints[bp];
	}
	for (const role of FONT_ROLES) {
		tokens[`--font-${role}`] = resolved.fonts[role];
	}
	for (const rung of DURATIONS) {
		tokens[`--transition-duration-${rung}`] =
			`${resolved.motion.durations[rung]}ms`;
	}
	tokens["--transition-duration-loop"] = `${resolved.motion.loop}ms`;
	for (const easing of EASINGS) {
		tokens[`--ease-${easing}`] =
			`cubic-bezier(${resolved.motion.easings[easing].join(", ")})`;
	}
	// A bare `transition` takes the base rung and `out`, through the variables,
	// so it stills with them under reduced motion.
	tokens["--default-transition-duration"] = "var(--transition-duration-base)";
	tokens["--default-transition-timing-function"] = "var(--ease-out)";
	for (const name of COLOR_NAMES) {
		tokens[`--color-${name}`] = resolved.colors.light[name];
	}
	return tokens;
}

// The values that are neither utilities nor per mode, rendered on the root
// outside `@theme`: the hairline and the focus ring's width and offset, which
// a platform's base rules read, and the light shadows, seeded so the root
// carries them ahead of any mode scope.
export function rootTokens(resolved: ResolvedTheme): Record<string, string> {
	const tokens: Record<string, string> = {
		"--hairline": `${HAIRLINE_PX}px`,
		"--focus-ring": `${RING_PX}px`,
		"--focus-ring-offset": `${RING_OFFSET_PX}px`,
	};
	for (const level of SHADOW_LEVELS) {
		tokens[`--shadow-${level}`] = resolved.shadows.light[level];
	}
	return tokens;
}

// One density's set, keyed by full custom-property name: the type scale,
// the spacing roles and the sizes. `themeTokens` seeds the touch set on both
// platforms; the web draws the desktop set under a fine pointer at `tablet`
// width and wider, and either set under a `data-density` attribute on the
// root, which is how the showcase and a board pin a density.
export function densityTokens(
	resolved: ResolvedTheme,
	density: Density,
): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const role of TYPE_ROLES) {
		const { size, leading } = resolved.type[density][role];
		tokens[`--text-${role}`] = size;
		tokens[`--text-${role}--line-height`] = leading;
	}
	for (const role of TYPE_ROLES) {
		tokens[`--leading-${role}`] = resolved.type[density][role].leading;
	}
	for (const role of SPACING_ROLES) {
		tokens[`--spacing-${role}`] = resolved.spacing[density][role];
	}
	for (const size of SIZES) {
		tokens[`--spacing-${size}`] = resolved.sizes[density][size];
	}
	return tokens;
}

// Every duration rung at 0, which the web renders under
// `prefers-reduced-motion: reduce`: each transition reads its duration
// through a rung's variable, so none moves. The loop stays: a spinner that
// stops is a wait that looks over.
export function reducedMotionTokens(): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const rung of DURATIONS) tokens[`--transition-duration-${rung}`] = "0ms";
	return tokens;
}

// One mode's values, keyed by full custom-property name: every color and
// the two shadows.
export function modeTokens(
	resolved: ResolvedTheme,
	mode: Mode,
): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const name of COLOR_NAMES) {
		tokens[`--color-${name}`] = resolved.colors[mode][name];
	}
	for (const level of SHADOW_LEVELS) {
		tokens[`--shadow-${level}`] = resolved.shadows[mode][level];
	}
	return tokens;
}

// What a raised ground (`RAISED_GROUNDS`) declares for everything inside
// it: the hairline read through `edge-raised`. The web scopes it on the
// grounds' fill classes, after the mode scopes, so a ground that is also a
// mode scope still re-points; native scopes it on each raised surface's
// content, resolving each `var()` read in the mode.
export function raisedGroundTokens(): Record<string, string> {
	return { "--color-edge": "var(--color-edge-raised)" };
}

// The declarations of each elevation utility. The `--shadow-*` theme
// namespace does not resolve into React Native's `boxShadow`, so each
// consumer wraps these in `@utility` itself; each reads its mode's variable.
export function shadowUtilities(): Record<
	ShadowUtility,
	Record<string, string>
> {
	const utilities = {} as Record<ShadowUtility, Record<string, string>>;
	for (const level of SHADOW_LEVELS) {
		utilities[`shadow-${level}`] = { "box-shadow": `var(--shadow-${level})` };
	}
	return utilities;
}

// Native's two measures over the web's `ch`: uniwind reads no `ch`, so native
// declares them in px at the sans figure advance of the touch body size, a
// label's own size lost.
export function nativeMeasureTokens(
	resolved: ResolvedTheme,
): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const measure of MEASURES) {
		tokens[`--container-${measure}`] = resolved.nativeMeasures[measure];
	}
	return tokens;
}
