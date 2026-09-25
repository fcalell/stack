// The closed token contract, as data. Every default value here is the
// calibrated one: Marina's hues, lightness and chroma, renamed by meaning, so
// a zero-override derivation reproduces the reference design system's values
// under the roles that replaced its tokens.

// Prefixes every error this package throws.
export const LABEL = "@fcalell/ui-core";

export const MODES = ["light", "dark"] as const;
export type Mode = (typeof MODES)[number];

// ── Knobs ───────────────────────────────────────────────────────────

export const HUE_KNOBS = [
	"accentHue",
	"neutralHue",
	"okHue",
	"warnHue",
	"dangerHue",
] as const;
export type HueKnob = (typeof HUE_KNOBS)[number];

// What the primary act, a switch that is on and the selected place are filled
// with: `ink` aliases `accent` and `accent-soft` onto the ink ladder, `accent`
// binds them to `accentHue`.
export const PRIMARIES = ["ink", "accent"] as const;
export type Primary = (typeof PRIMARIES)[number];

export const WIDTHS = ["rail", "list", "column", "sheet", "reading"] as const;
export type Width = (typeof WIDTHS)[number];

export const BREAKPOINTS = ["tablet", "desktop", "wide"] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

export const FONT_ROLES = ["sans", "mono"] as const;
export type FontRole = (typeof FONT_ROLES)[number];

// `neutralChroma` multiplies the declared chroma of every token bound to
// `neutralHue`, and nothing else. 0 makes the neutral ladder achromatic.
// `space`, `radius` and `text` are the bases every rung, radius and type role
// is a ratio of. `fonts` names the two families; the files that carry them
// are each plugin's `fonts` option. A missing `sans` is the platform's stack.
export interface Knobs {
	accentHue: number;
	neutralHue: number;
	neutralChroma: number;
	okHue: number;
	warnHue: number;
	dangerHue: number;
	primary: Primary;
	space: number;
	radius: number;
	text: number;
	fonts: { sans?: string; mono: string };
	widths: Record<Width, number>;
	breakpoints: Record<Breakpoint, number>;
}

export const KNOB_DEFAULTS: Knobs = {
	accentHue: 261,
	neutralHue: 261,
	neutralChroma: 1,
	okHue: 160,
	warnHue: 75,
	dangerHue: 28,
	primary: "ink",
	space: 4,
	radius: 14,
	text: 16,
	fonts: { mono: "JetBrains Mono Variable" },
	widths: { rail: 220, list: 360, column: 300, sheet: 560, reading: 720 },
	breakpoints: { tablet: 768, desktop: 1024, wide: 1440 },
};

// ── Colors ──────────────────────────────────────────────────────────

export const AVATAR_STEPS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type AvatarStep = (typeof AVATAR_STEPS)[number];
export type AvatarColor = `avatar-${AvatarStep}`;

export const PER_MODE_COLORS = [
	"canvas",
	"surface",
	"group",
	"edge",
	"ink",
	"ink-meta",
	"ink-faint",
	"accent",
	"accent-soft",
	"on-accent",
	"tint",
	"ok",
	"ok-soft",
	"warn",
	"warn-soft",
	"danger",
	"danger-soft",
	...AVATAR_STEPS.map((step): AvatarColor => `avatar-${step}`),
] as const;
export type PerModeColor = (typeof PER_MODE_COLORS)[number];

// `scrim` is the veil behind a sheet; `thumb` is the switch's knob, white in
// both modes so it sits above its track at night: the one literal color.
export const INVARIANT_COLORS = ["scrim", "thumb"] as const;
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

export type ColorDeclaration =
	| { alias: PerModeColor }
	| { light: ColorValue; dark: ColorValue };

const neutral = (offset = 0): HueBinding => ({ knob: "neutralHue", offset });
const accent = (offset = 0): HueBinding => ({ knob: "accentHue", offset });

// The set `neutralChroma` scales. Tokens land in it by binding, not by name.
export function isNeutralBound(hue: HueBinding): boolean {
	return typeof hue !== "number" && hue.knob === "neutralHue";
}

// Every role whose value is the same under both primaries.
export const COLORS: Record<
	Exclude<PerModeColor, "accent" | "accent-soft" | AvatarColor>,
	ColorDeclaration
> = {
	canvas: {
		light: { l: 0.966, c: 0.006, hue: neutral() },
		dark: { l: 0.2, c: 0.034, hue: neutral() },
	},
	surface: {
		light: { l: 1, c: 0, hue: neutral() },
		dark: { l: 0.285, c: 0.044, hue: neutral() },
	},
	group: {
		light: { l: 0.935, c: 0.009, hue: neutral() },
		dark: { l: 0.35, c: 0.052, hue: neutral() },
	},
	edge: {
		light: { l: 0.91, c: 0.01, hue: neutral() },
		dark: { l: 0.37, c: 0.056, hue: neutral() },
	},
	ink: {
		light: { l: 0.22, c: 0.043, hue: neutral() },
		dark: { l: 0.967, c: 0.008, hue: neutral() },
	},
	"ink-meta": {
		light: { l: 0.44, c: 0.036, hue: neutral() },
		dark: { l: 0.755, c: 0.028, hue: neutral() },
	},
	"ink-faint": {
		light: { l: 0.75, c: 0.02, hue: neutral() },
		dark: { l: 0.45, c: 0.048, hue: neutral() },
	},
	// Text on `accent`: the canvas value keeps AA in both modes under either
	// primary, by the ladder's symmetry.
	"on-accent": { alias: "canvas" },
	// The four marks' dark values sit above the calibration's 0.7 so each
	// clears 4.5:1 on `group` as well as `surface`: a status, an act and a
	// destructive label are drawn inside groups.
	tint: {
		light: { l: 0.5, c: 0.16, hue: accent() },
		dark: { l: 0.75, c: 0.155, hue: accent() },
	},
	ok: {
		light: { l: 0.5, c: 0.105, hue: { knob: "okHue", offset: 0 } },
		dark: { l: 0.75, c: 0.14, hue: { knob: "okHue", offset: 0 } },
	},
	"ok-soft": {
		light: { l: 0.92, c: 0.04, hue: { knob: "okHue", offset: 0 } },
		dark: { l: 0.32, c: 0.07, hue: { knob: "okHue", offset: 0 } },
	},
	warn: {
		light: { l: 0.5, c: 0.106, hue: { knob: "warnHue", offset: 0 } },
		dark: { l: 0.75, c: 0.14, hue: { knob: "warnHue", offset: 0 } },
	},
	"warn-soft": {
		light: { l: 0.912, c: 0.048, hue: { knob: "warnHue", offset: 5 } },
		dark: { l: 0.32, c: 0.06, hue: { knob: "warnHue", offset: 0 } },
	},
	danger: {
		light: { l: 0.5, c: 0.18, hue: { knob: "dangerHue", offset: 0 } },
		dark: { l: 0.76, c: 0.17, hue: { knob: "dangerHue", offset: 0 } },
	},
	"danger-soft": {
		light: { l: 0.915, c: 0.045, hue: { knob: "dangerHue", offset: 0 } },
		dark: { l: 0.32, c: 0.08, hue: { knob: "dangerHue", offset: 0 } },
	},
};

// The two roles `primary` decides. Under `ink` the act fill is the ink ladder
// and its soft is the neutral-bound soft; under `accent` both bind to
// `accentHue`, the soft at `tint`'s soft values.
export const PRIMARY_COLORS: Record<
	Primary,
	Record<"accent" | "accent-soft", ColorDeclaration>
> = {
	ink: {
		accent: { alias: "ink" },
		"accent-soft": {
			light: { l: 0.895, c: 0.04, hue: neutral() },
			dark: { l: 0.37, c: 0.095, hue: neutral() },
		},
	},
	accent: {
		accent: { alias: "tint" },
		"accent-soft": {
			light: { l: 0.915, c: 0.045, hue: accent() },
			dark: { l: 0.32, c: 0.1, hue: accent() },
		},
	},
};

// One lightness and chroma, the hue stepped 45° from `accentHue` per rung, so
// a fill per name is a token and never a computed hue.
export const AVATAR_STEP_DEGREES = 45;
export const AVATAR_VALUE: Record<Mode, { l: number; c: number }> = {
	light: { l: 0.88, c: 0.06 },
	dark: { l: 0.38, c: 0.09 },
};

export const INVARIANT: Record<InvariantColor, InvariantColorValue> = {
	scrim: { l: 0.22, c: 0.043, hue: neutral(), alpha: 0.8 },
	thumb: { l: 1, c: 0, hue: 0 },
};

// ── Scales, each a ratio of one knob ────────────────────────────────

export const SPACING_RUNGS = [
	"pair",
	"row",
	"stack",
	"inset",
	"section",
	"room",
] as const;
export type SpacingRung = (typeof SPACING_RUNGS)[number];

// Multiples of `space`.
export const SPACING_RATIO: Record<SpacingRung, number> = {
	pair: 1,
	row: 2,
	stack: 3,
	inset: 4,
	section: 6,
	room: 8,
};

export const RADIUS_RUNGS = ["group", "sheet", "full"] as const;
export type RadiusRung = (typeof RADIUS_RUNGS)[number];

// `group` is `radius` itself, `sheet` is 1.75× rounded down, `full` is a pill.
export const RADIUS_RATIO: Record<Exclude<RadiusRung, "full">, number> = {
	group: 1,
	sheet: 1.75,
};

export const TYPE_ROLES = [
	"display",
	"title",
	"heading",
	"body",
	"meta",
	"label",
	"mono",
] as const;
export type TypeRole = (typeof TYPE_ROLES)[number];

// Three roles carry tracking. The list is its own name list so the tracking
// map is total and the emitters need no per-role presence check.
export const TRACKED_ROLES = ["display", "title", "heading"] as const;
export type TrackedRole = (typeof TRACKED_ROLES)[number];

export type FontWeight = "regular" | "medium" | "semibold" | "bold";

// `size` is a ratio of `text`, rounded to the whole pixel; `leading` is a
// ratio of the size, its line box rounded to the even pixel. Ink is a color
// role, family a font role.
export interface TypeRoleSpec {
	size: number;
	leading: number;
	weight: FontWeight;
	ink: "ink" | "ink-meta";
	family: FontRole;
}

export const TYPE_SCALE: Record<TypeRole, TypeRoleSpec> = {
	display: {
		size: 2.125,
		leading: 1.18,
		weight: "bold",
		ink: "ink",
		family: "sans",
	},
	title: {
		size: 1.75,
		leading: 1.29,
		weight: "bold",
		ink: "ink",
		family: "sans",
	},
	heading: {
		size: 1.125,
		leading: 1.33,
		weight: "semibold",
		ink: "ink",
		family: "sans",
	},
	body: {
		size: 1,
		leading: 1.5,
		weight: "regular",
		ink: "ink",
		family: "sans",
	},
	meta: {
		size: 0.875,
		leading: 1.43,
		weight: "regular",
		ink: "ink-meta",
		family: "sans",
	},
	label: {
		size: 0.8125,
		leading: 1.23,
		weight: "medium",
		ink: "ink-meta",
		family: "sans",
	},
	mono: {
		size: 0.875,
		leading: 1.43,
		weight: "regular",
		ink: "ink",
		family: "mono",
	},
};

export const TYPE_TRACKING: Record<TrackedRole, string> = {
	display: "-0.025em",
	title: "-0.02em",
	heading: "-0.005em",
};

export const SHADOW_LEVELS = ["float", "sheet"] as const;
export type ShadowLevel = (typeof SHADOW_LEVELS)[number];

// Offsets, blur and alpha per level; the color is the light ink at
// `neutralHue`, converted to sRGB by the derivation because React Native's
// `boxShadow` takes no oklch.
export const SHADOW_GEOMETRY: Record<
	ShadowLevel,
	{ y: number; blur: number; alpha: number }
> = {
	float: { y: 7, blur: 18, alpha: 0.13 },
	sheet: { y: 12, blur: 28, alpha: 0.16 },
};

// Namespaces reset to `initial`, so an off-contract utility compiles to
// nothing. The numeric `--spacing` base and the `--font-weight-*` ladder stay
// live: controls pad on numerics and the roles name their weights.
export const ZEROED_NAMESPACES = [
	"--color-*",
	"--radius-*",
	"--text-*",
	"--leading-*",
	"--tracking-*",
	"--shadow-*",
	"--font-*",
	"--container-*",
	"--breakpoint-*",
] as const;

// The stacks each family falls back to on both platforms; `sans` alone is the
// platform's stack when the knob names no family.
export const FONT_FALLBACKS: Record<FontRole, string> = {
	sans: "ui-sans-serif, system-ui, sans-serif",
	mono: "ui-monospace, SFMono-Regular, monospace",
};

// Every non-color token, keyed by its full custom-property name. This is also
// the closed key set `overrides.scales` accepts. A role's leading and tracking
// appear once each: `themeTokens` renders both emitted shapes (the Tailwind v4
// modifier `--text-title--line-height` and the standalone `--leading-title`)
// from this one entry, so one override moves both and they cannot disagree.
export type ScaleKey =
	| `--spacing-${SpacingRung}`
	| `--radius-${RadiusRung}`
	| `--text-${TypeRole}`
	| `--leading-${TypeRole}`
	| `--tracking-${TrackedRole}`
	| `--shadow-${ShadowLevel}`
	| `--container-${Width}`
	| `--breakpoint-${Breakpoint}`;

export const SCALE_KEYS: readonly ScaleKey[] = [
	...SPACING_RUNGS.map((rung): ScaleKey => `--spacing-${rung}`),
	...RADIUS_RUNGS.map((rung): ScaleKey => `--radius-${rung}`),
	...TYPE_ROLES.map((role): ScaleKey => `--text-${role}`),
	...TYPE_ROLES.map((role): ScaleKey => `--leading-${role}`),
	...TRACKED_ROLES.map((role): ScaleKey => `--tracking-${role}`),
	...SHADOW_LEVELS.map((level): ScaleKey => `--shadow-${level}`),
	...WIDTHS.map((width): ScaleKey => `--container-${width}`),
	...BREAKPOINTS.map((bp): ScaleKey => `--breakpoint-${bp}`),
];

// ── Words ───────────────────────────────────────────────────────────

// Every word a molecule draws or reads aloud on its own. A consumer's sentence
// is a prop on the molecule that draws it, never a key here.
export const STATUS_STATES = [
	"active",
	"waiting",
	"done",
	"attention",
	"failed",
	"idle",
] as const;
export type StatusState = (typeof STATUS_STATES)[number];

export const WORD_KEYS = [
	...STATUS_STATES,
	"recommended",
	"copy",
	"copied",
	"back",
	"close",
	"more",
	"send",
	"stop",
	"attach",
	"search",
	"loading",
	"retry",
] as const;
export type WordKey = (typeof WORD_KEYS)[number];

export type Words = Record<WordKey, string>;

export const ENGLISH: Words = {
	active: "Active",
	waiting: "Waiting",
	done: "Done",
	attention: "Attention",
	failed: "Failed",
	idle: "Idle",
	recommended: "Recommended",
	copy: "Copy",
	copied: "Copied",
	back: "Back",
	close: "Close",
	more: "More",
	send: "Send",
	stop: "Stop",
	attach: "Attach",
	search: "Search",
	loading: "Loading",
	retry: "Retry",
};
