import type { ResolvedTheme } from "#derive";
import {
	INVARIANT_COLORS,
	type Mode,
	PER_MODE_COLORS,
	RADIUS_RUNGS,
	SHADOW_LEVELS,
	type ShadowLevel,
	SPACING_RUNGS,
	TRACKED_ROLES,
	TYPE_ROLES,
	ZEROED_NAMESPACES,
} from "#tokens";

export type ShadowUtility = `shadow-${ShadowLevel}`;

// The `@theme` record, keyed by full custom-property name. It carries the
// default mode's colors as well as the mode-invariant six: in Tailwind v4 a
// property declared only inside a `@variant` block generates no utility, so
// without them `bg-canvas` would not exist.
//
// Each type role renders twice, from one resolved value: the Tailwind v4
// modifier so `text-h1` carries its own leading on web, and the standalone
// namespace so the unitless multiplier stays available on native.
export function themeTokens(resolved: ResolvedTheme): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const namespace of ZEROED_NAMESPACES) tokens[namespace] = "initial";
	for (const rung of SPACING_RUNGS) {
		tokens[`--spacing-${rung}`] = resolved.scales[`--spacing-${rung}`];
	}
	for (const rung of RADIUS_RUNGS) {
		tokens[`--radius-${rung}`] = resolved.scales[`--radius-${rung}`];
	}
	for (const role of TYPE_ROLES) {
		tokens[`--text-${role}`] = resolved.scales[`--text-${role}`];
		tokens[`--text-${role}--line-height`] =
			resolved.scales[`--leading-${role}`];
	}
	for (const role of TRACKED_ROLES) {
		tokens[`--text-${role}--letter-spacing`] =
			resolved.scales[`--tracking-${role}`];
	}
	for (const role of TYPE_ROLES) {
		tokens[`--leading-${role}`] = resolved.scales[`--leading-${role}`];
	}
	for (const role of TRACKED_ROLES) {
		tokens[`--tracking-${role}`] = resolved.scales[`--tracking-${role}`];
	}
	for (const token of INVARIANT_COLORS) {
		tokens[`--color-${token}`] = resolved.invariantColors[token];
	}
	for (const token of PER_MODE_COLORS) {
		tokens[`--color-${token}`] = resolved.colors[resolved.defaultMode][token];
	}
	return tokens;
}

// One mode's colors, keyed by bare token name (`canvas`, `ink-1`) because the
// per-theme codegen path prefixes `--color-` itself. Never the invariant six:
// they carry no per-mode override.
export function modeTokens(
	resolved: ResolvedTheme,
	mode: Mode,
): Record<string, string> {
	const tokens: Record<string, string> = {};
	for (const token of PER_MODE_COLORS) {
		tokens[token] = resolved.colors[mode][token];
	}
	return tokens;
}

// One `box-shadow` value per level. The `--shadow-*` theme namespace does not
// resolve into React Native's `boxShadow`, so each consumer wraps these in
// `@utility` itself.
export function shadowUtilities(
	resolved: ResolvedTheme,
): Record<ShadowUtility, string> {
	const utilities = {} as Record<ShadowUtility, string>;
	for (const level of SHADOW_LEVELS) {
		utilities[`shadow-${level}`] = resolved.scales[`--shadow-${level}`];
	}
	return utilities;
}
