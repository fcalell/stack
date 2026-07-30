// The closed token contract, as data. Every default value here is the
// calibrated one, so a zero-override derivation reproduces the reference
// design system byte for byte.

// Prefixes every error this package throws.
export const LABEL = "@fcalell/ui-core";

export const MODES = ["light", "dark"] as const;
export type Mode = (typeof MODES)[number];

// ── Knobs ───────────────────────────────────────────────────────────

export const HUE_KNOBS = [
	"neutralHue",
	"brandHue",
	"interactiveHue",
	"okHue",
	"warnHue",
	"dangerHue",
] as const;
export type HueKnob = (typeof HUE_KNOBS)[number];

// `neutralChroma` multiplies the declared chroma of every token bound to
// `neutralHue`, and nothing else. 0 makes the neutral ladder achromatic.
export type Knobs = Record<HueKnob | "neutralChroma", number>;

export const KNOB_DEFAULTS: Knobs = {
	neutralHue: 261,
	brandHue: 261,
	interactiveHue: 261,
	okHue: 160,
	warnHue: 75,
	dangerHue: 28,
	neutralChroma: 1,
};

// ── Colors ──────────────────────────────────────────────────────────

export const PER_MODE_COLORS = [
	"canvas",
	"surface",
	"surface-2",
	"surface-3",
	"thumb",
	"edge",
	"edge-2",
	"ink-1",
	"ink-2",
	"ink-3",
	"ink-4",
	"accent",
	"accent-ink",
	"brand",
	"brand-soft",
	"brand-deep",
	"interactive",
	"interactive-soft",
	"ok",
	"ok-soft",
	"warn",
	"warn-soft",
	"warn-mark",
	"danger",
	"danger-soft",
	"danger-ink",
] as const;
export type PerModeColor = (typeof PER_MODE_COLORS)[number];

export const INVARIANT_COLORS = [
	"scrim",
	"oncover-fg",
	"oncover-ink",
	"oncover-surface",
	"oncover-glass",
	"oncover-shade",
] as const;
export type InvariantColor = (typeof INVARIANT_COLORS)[number];

// A literal hue, or a knob plus a fixed offset in degrees. Offsets carry the
// sibling spread inside one hue family (a soft fill sitting off its text tone).
export type HueBinding = number | { knob: HueKnob; offset: number };

export interface ColorValue {
	l: number;
	c: number;
	hue: HueBinding;
}

export interface InvariantColorValue extends ColorValue {
	alpha?: number;
}

// `accent` / `accent-ink` are the primary-fill pair, defined as the `ink-1` /
// `canvas` values rather than colors of their own, so the law survives every
// knob setting.
export type ColorDeclaration =
	| { alias: PerModeColor }
	| { light: ColorValue; dark: ColorValue };

const neutral = (offset = 0): HueBinding => ({ knob: "neutralHue", offset });

// The set `neutralChroma` scales. Tokens land in it by binding, not by name, so
// `danger-ink` and `scrim` are members.
export function isNeutralBound(hue: HueBinding): boolean {
	return typeof hue !== "number" && hue.knob === "neutralHue";
}

export const COLORS: Record<PerModeColor, ColorDeclaration> = {
	canvas: {
		light: { l: 0.966, c: 0.006, hue: neutral() },
		dark: { l: 0.2, c: 0.034, hue: neutral() },
	},
	surface: {
		light: { l: 1, c: 0, hue: neutral() },
		dark: { l: 0.285, c: 0.044, hue: neutral() },
	},
	"surface-2": {
		light: { l: 0.935, c: 0.009, hue: neutral() },
		dark: { l: 0.35, c: 0.052, hue: neutral() },
	},
	"surface-3": {
		light: { l: 0.905, c: 0.012, hue: neutral() },
		dark: { l: 0.41, c: 0.057, hue: neutral() },
	},
	thumb: {
		light: { l: 1, c: 0, hue: neutral() },
		dark: { l: 0.48, c: 0.05, hue: neutral() },
	},
	edge: {
		light: { l: 0.91, c: 0.01, hue: neutral() },
		dark: { l: 0.37, c: 0.056, hue: neutral() },
	},
	"edge-2": {
		light: { l: 0.85, c: 0.014, hue: neutral() },
		dark: { l: 0.45, c: 0.063, hue: neutral() },
	},
	"ink-1": {
		light: { l: 0.22, c: 0.043, hue: neutral() },
		dark: { l: 0.967, c: 0.008, hue: neutral() },
	},
	"ink-2": {
		light: { l: 0.44, c: 0.036, hue: neutral() },
		dark: { l: 0.755, c: 0.028, hue: neutral() },
	},
	"ink-3": {
		light: { l: 0.515, c: 0.032, hue: neutral() },
		dark: { l: 0.66, c: 0.033, hue: neutral() },
	},
	"ink-4": {
		light: { l: 0.75, c: 0.02, hue: neutral() },
		dark: { l: 0.45, c: 0.048, hue: neutral() },
	},
	accent: { alias: "ink-1" },
	"accent-ink": { alias: "canvas" },
	brand: {
		light: { l: 0.22, c: 0.043, hue: { knob: "brandHue", offset: 0 } },
		// The dark accent steps off the interactive axis so the two accents stay
		// two at night, and it tracks `brandHue` rather than pinning a literal.
		dark: { l: 0.72, c: 0.075, hue: { knob: "brandHue", offset: 14 } },
	},
	"brand-soft": {
		light: { l: 0.895, c: 0.04, hue: { knob: "brandHue", offset: 0 } },
		dark: { l: 0.37, c: 0.095, hue: { knob: "brandHue", offset: 0 } },
	},
	"brand-deep": {
		light: { l: 0.175, c: 0.045, hue: { knob: "brandHue", offset: 0 } },
		dark: { l: 0.262, c: 0.066, hue: { knob: "brandHue", offset: 0 } },
	},
	interactive: {
		light: { l: 0.5, c: 0.16, hue: { knob: "interactiveHue", offset: 0 } },
		dark: { l: 0.7, c: 0.155, hue: { knob: "interactiveHue", offset: 0 } },
	},
	"interactive-soft": {
		light: { l: 0.915, c: 0.045, hue: { knob: "interactiveHue", offset: 0 } },
		dark: { l: 0.32, c: 0.1, hue: { knob: "interactiveHue", offset: 0 } },
	},
	ok: {
		light: { l: 0.5, c: 0.105, hue: { knob: "okHue", offset: 0 } },
		dark: { l: 0.7, c: 0.14, hue: { knob: "okHue", offset: 0 } },
	},
	"ok-soft": {
		light: { l: 0.92, c: 0.04, hue: { knob: "okHue", offset: 0 } },
		dark: { l: 0.32, c: 0.07, hue: { knob: "okHue", offset: 0 } },
	},
	warn: {
		light: { l: 0.5, c: 0.106, hue: { knob: "warnHue", offset: 0 } },
		dark: { l: 0.7, c: 0.14, hue: { knob: "warnHue", offset: 0 } },
	},
	"warn-soft": {
		light: { l: 0.912, c: 0.048, hue: { knob: "warnHue", offset: 5 } },
		dark: { l: 0.32, c: 0.06, hue: { knob: "warnHue", offset: 0 } },
	},
	"warn-mark": {
		light: { l: 0.62, c: 0.13, hue: { knob: "warnHue", offset: 3 } },
		dark: { l: 0.7, c: 0.14, hue: { knob: "warnHue", offset: 0 } },
	},
	danger: {
		light: { l: 0.5, c: 0.18, hue: { knob: "dangerHue", offset: 0 } },
		dark: { l: 0.7, c: 0.17, hue: { knob: "dangerHue", offset: 0 } },
	},
	"danger-soft": {
		light: { l: 0.915, c: 0.045, hue: { knob: "dangerHue", offset: 0 } },
		dark: { l: 0.32, c: 0.08, hue: { knob: "dangerHue", offset: 0 } },
	},
	// The canvas value of each mode, so it is neutral-bound despite the name.
	"danger-ink": {
		light: { l: 0.966, c: 0.006, hue: neutral() },
		dark: { l: 0.2, c: 0.034, hue: neutral() },
	},
};

// Surfaces that stay dark in both modes, plus the veil. They carry no per-mode
// override on purpose, so they never invert.
export const INVARIANT: Record<InvariantColor, InvariantColorValue> = {
	scrim: { l: 0.22, c: 0.043, hue: neutral(), alpha: 0.8 },
	"oncover-fg": { l: 1, c: 0, hue: 0 },
	"oncover-ink": { l: 0.22, c: 0.043, hue: neutral() },
	"oncover-surface": { l: 1, c: 0, hue: 0 },
	"oncover-glass": { l: 1, c: 0, hue: 0, alpha: 0.149 },
	"oncover-shade": { l: 0.2, c: 0.036, hue: neutral(), alpha: 0.549 },
};

// ── Scales ──────────────────────────────────────────────────────────

export const SPACING_RUNGS = [
	"room",
	"section",
	"stack",
	"row",
	"pair",
	"gutter",
	"card",
] as const;
export type SpacingRung = (typeof SPACING_RUNGS)[number];

export const SPACING: Record<SpacingRung, string> = {
	room: "32px",
	section: "24px",
	stack: "12px",
	row: "8px",
	pair: "4px",
	gutter: "16px",
	card: "16px",
};

export const RADIUS_RUNGS = ["md", "control", "xl", "sheet", "full"] as const;
export type RadiusRung = (typeof RADIUS_RUNGS)[number];

export const RADIUS: Record<RadiusRung, string> = {
	md: "10px",
	control: "14px",
	xl: "16px",
	sheet: "24px",
	full: "9999px",
};

export const TYPE_ROLES = [
	"display",
	"h1",
	"h2",
	"h3",
	"body",
	"callout",
	"caption",
	"micro",
] as const;
export type TypeRole = (typeof TYPE_ROLES)[number];

// Five of the eight roles carry tracking. The list is its own name list so the
// tracking map is total and the emitters need no per-role presence check.
export const TRACKED_ROLES = ["display", "h1", "h2", "h3", "micro"] as const;
export type TrackedRole = (typeof TRACKED_ROLES)[number];

// `leading` is unitless: a multiplier that scales with OS font scaling instead
// of pinning a pixel line box.
export interface TypeScaleEntry {
	size: string;
	leading: string;
}

export const TYPE_SCALE: Record<TypeRole, TypeScaleEntry> = {
	display: { size: "34px", leading: "1.18" },
	h1: { size: "28px", leading: "1.29" },
	h2: { size: "22px", leading: "1.27" },
	h3: { size: "18px", leading: "1.33" },
	body: { size: "16px", leading: "1.5" },
	callout: { size: "14px", leading: "1.43" },
	caption: { size: "13px", leading: "1.23" },
	micro: { size: "12px", leading: "1.33" },
};

export const TYPE_TRACKING: Record<TrackedRole, string> = {
	display: "-0.025em",
	h1: "-0.02em",
	h2: "-0.015em",
	h3: "-0.005em",
	micro: "0.03em",
};

export const SHADOW_LEVELS = ["1", "2", "3"] as const;
export type ShadowLevel = (typeof SHADOW_LEVELS)[number];

export const SHADOWS: Record<ShadowLevel, string> = {
	"1": "0 1px 2px rgba(14, 26, 46, 0.04), 0 6px 18px rgba(14, 26, 46, 0.08)",
	"2": "0 7px 18px rgba(14, 26, 46, 0.13)",
	"3": "0 12px 28px rgba(14, 26, 46, 0.16)",
};

// The four namespaces reset to `initial`, so an off-contract utility compiles
// to nothing. `--leading-*`, `--tracking-*` and the numeric `--spacing` base
// stay live: see the README on what the reset does not catch.
export const ZEROED_NAMESPACES = [
	"--color-*",
	"--radius-*",
	"--text-*",
	"--shadow-*",
] as const;

// Font families stay with the platform plugins; only the fallback stacks are
// shared, so both plugins append the same tail.
export const FONT_FALLBACKS = {
	sans: "ui-sans-serif, system-ui, sans-serif",
	mono: "ui-monospace, SFMono-Regular, monospace",
	serif: "ui-serif, Georgia, serif",
} as const;

// Every non-color token, keyed by its full custom-property name. This is also
// the closed key set `overrides.scales` accepts. A role's leading and tracking
// appear once each: `themeTokens` renders both emitted shapes (the Tailwind v4
// modifier `--text-h1--line-height` and the standalone `--leading-h1`) from
// this one entry, so one override moves both and they cannot disagree.
export type ScaleKey =
	| `--spacing-${SpacingRung}`
	| `--radius-${RadiusRung}`
	| `--text-${TypeRole}`
	| `--leading-${TypeRole}`
	| `--tracking-${TrackedRole}`
	| `--shadow-${ShadowLevel}`;

function scaleDefaults(): Record<ScaleKey, string> {
	const scales = {} as Record<ScaleKey, string>;
	for (const rung of SPACING_RUNGS) scales[`--spacing-${rung}`] = SPACING[rung];
	for (const rung of RADIUS_RUNGS) scales[`--radius-${rung}`] = RADIUS[rung];
	for (const role of TYPE_ROLES)
		scales[`--text-${role}`] = TYPE_SCALE[role].size;
	for (const role of TYPE_ROLES) {
		scales[`--leading-${role}`] = TYPE_SCALE[role].leading;
	}
	for (const role of TRACKED_ROLES) {
		scales[`--tracking-${role}`] = TYPE_TRACKING[role];
	}
	for (const level of SHADOW_LEVELS) {
		scales[`--shadow-${level}`] = SHADOWS[level];
	}
	return scales;
}

export const SCALE_DEFAULTS: Record<ScaleKey, string> = scaleDefaults();
