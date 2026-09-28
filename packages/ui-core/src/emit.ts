import type { ResolvedTheme } from "./derive.ts";
import {
	BREAKPOINTS,
	FONT_ROLES,
	INVARIANT_COLORS,
	MONO_FEATURES,
	type Mode,
	PER_MODE_COLORS,
	RADIUS_RUNGS,
	SHADOW_LEVELS,
	type ShadowLevel,
	SPACING_RUNGS,
	TRACKED_ROLES,
	TYPE_ROLES,
	WIDTHS,
	ZEROED_NAMESPACES,
} from "./tokens.ts";

export type ShadowUtility = `shadow-${ShadowLevel}`;

// The `@theme` record, keyed by full custom-property name. It carries the
// light colors as well as the mode-invariant two: in Tailwind v4 a property
// declared only inside a `@variant` block generates no utility, so without
// them `bg-canvas` would not exist. Which mode seeds it never shows: each
// platform switches every color through the active mode's variables.
//
// Each type role renders twice, from one resolved value: the Tailwind v4
// modifier so `text-title` carries its own leading on web, and the standalone
// namespace so `leading-title` exists on its own.
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
	for (const width of WIDTHS) {
		tokens[`--container-${width}`] = resolved.scales[`--container-${width}`];
	}
	for (const bp of BREAKPOINTS) {
		tokens[`--breakpoint-${bp}`] = resolved.scales[`--breakpoint-${bp}`];
	}
	for (const role of FONT_ROLES) {
		tokens[`--font-${role}`] = resolved.fonts[role];
	}
	tokens["--font-mono--font-feature-settings"] = MONO_FEATURES;
	for (const token of INVARIANT_COLORS) {
		tokens[`--color-${token}`] = resolved.invariantColors[token];
	}
	for (const token of PER_MODE_COLORS) {
		tokens[`--color-${token}`] = resolved.colors.light[token];
	}
	return tokens;
}

// One mode's colors, keyed by bare token name (`canvas`, `ink`) because the
// per-theme codegen path prefixes `--color-` itself. Never the invariant two:
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

// The declarations of each elevation utility. The `--shadow-*` theme
// namespace does not resolve into React Native's `boxShadow`, so each
// consumer wraps these in `@utility` itself. `flat` casts no shadow and draws
// the 1px `edge` ring as a border, the channel every hairline already uses on
// both platforms.
export function shadowUtilities(
	resolved: ResolvedTheme,
): Record<ShadowUtility, Record<string, string>> {
	const utilities = {} as Record<ShadowUtility, Record<string, string>>;
	for (const level of SHADOW_LEVELS) {
		const shadow = resolved.scales[`--shadow-${level}`];
		utilities[`shadow-${level}`] =
			resolved.knobs.elevation === "flat"
				? {
						"border-width": "1px",
						"border-color": "var(--color-edge)",
					}
				: { "box-shadow": shadow };
	}
	return utilities;
}
