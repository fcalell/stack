// The closed token contract, as data. Every value here is the approved
// Stage 1 sheet (`plugins/react-ui/design/foundations.css`, the calibration
// the verify script diffs against): the derivation keeps one base per scale
// so the numbers stay explainable, and a consumer moves the knobs below and
// never a token.

// Prefixes every error this package throws.
export const LABEL = "@fcalell/ui-core";

export const MODES = ["light", "dark"] as const;
export type Mode = (typeof MODES)[number];

// ── Knobs ───────────────────────────────────────────────────────────

// How dense everything draws. `touch` is the 44 px world on every device;
// `desktop` draws the desktop set where the primary pointer is fine (a mouse
// or a trackpad) and keeps the touch set on a coarse one. Density moves the
// type scale, the spacing roles and every size; nothing else. Native is
// touch-only and draws `touch` whatever the knob says.
export const DENSITIES = ["touch", "desktop"] as const;
export type Density = (typeof DENSITIES)[number];

export const FONT_ROLES = ["sans", "mono"] as const;
export type FontRole = (typeof FONT_ROLES)[number];

// `accentHue` re-hues the accent and nothing else: the neutrals, the three
// status hues, the chip families and the avatars are fixed. `fonts` names
// the two families; the files that carry them are each plugin's `fonts`
// option, and a missing `sans` is the platform's stack.
export interface Knobs {
	accentHue: number;
	density: Density;
	fonts: { sans?: string; mono: string };
}

export const KNOB_DEFAULTS: Knobs = {
	accentHue: 264,
	density: "desktop",
	fonts: { mono: "JetBrains Mono Variable" },
};

// The busy glyph: `circle` spins, `scramble` cycles mono glyphs in place. A
// call site picks it (`Spinner kind`, an act's `spinner`).
export const SPINNER_KINDS = ["circle", "scramble"] as const;
export type SpinnerKind = (typeof SPINNER_KINDS)[number];

// The scramble's alphabet, width and pace, shared so both platforms draw the
// same loader. Under reduced motion it holds `SCRAMBLE_STILL`.
export const SCRAMBLE_GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=?";
export const SCRAMBLE_LENGTH = 3;
export const SCRAMBLE_INTERVAL_MS = 70;
export const SCRAMBLE_STILL = "···";

// ── Colors ──────────────────────────────────────────────────────────

// The six categorical chip families, in hue order (25, 85, 145, 195, 305,
// 350), the accent's 215–290 band left out so no family ever wears it.
export const CHIP_FAMILIES = [
	"red",
	"amber",
	"green",
	"teal",
	"violet",
	"pink",
] as const;
export type ChipFamily = (typeof CHIP_FAMILIES)[number];

export const AVATAR_STEPS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type AvatarStep = (typeof AVATAR_STEPS)[number];

// The palette by what each color is for, in the order the palette reads.
export const COLOR_GROUPS = {
	surfaces: [
		"canvas",
		"surface",
		"group",
		"raised",
		"edge",
		"edge-raised",
		"edge-strong",
		"scrim",
	],
	inks: ["ink-body", "ink-meta", "ink-faint"],
	accent: ["accent", "on-accent", "accent-soft", "accent-ink"],
	status: [
		"ok",
		"ok-soft",
		"warn",
		"warn-soft",
		"danger",
		"danger-soft",
		"on-danger",
	],
	// the mark, the soft ground, the ink on the soft
	chips: CHIP_FAMILIES.flatMap(
		(family) =>
			[`chip-${family}`, `chip-${family}-soft`, `chip-${family}-ink`] as const,
	),
	// the fill and the initial on it
	avatars: AVATAR_STEPS.flatMap(
		(step) => [`avatar-${step}`, `avatar-${step}-ink`] as const,
	),
	// the body ink at an alpha, so they follow the mode and sit on any surface
	// as one more step
	washes: [
		"wash-hover",
		"wash-press",
		"wash-selected",
		"wash-selected-hover",
		"skeleton",
		"fill-disabled",
	],
	// places, each an alias of the tone that draws it
	places: [
		"ring",
		"selected-outline",
		"edge-hover",
		"edge-error",
		"ink-error",
		"ink-disabled",
	],
	// the two act fills and their states
	acts: [
		"act-accent",
		"on-act-accent",
		"act-accent-hover",
		"act-accent-press",
		"act-accent-pending",
		"act-ink",
		"on-act-ink",
		"act-ink-hover",
		"act-ink-press",
		"act-ink-pending",
	],
	switch: [
		"switch-off",
		"switch-off-hover",
		"switch-on",
		"switch-on-hover",
		"switch-thumb",
	],
} as const;
export type ColorGroup = keyof typeof COLOR_GROUPS;

export const COLOR_NAMES: readonly ColorName[] =
	Object.values(COLOR_GROUPS).flat();
export type ColorName = (typeof COLOR_GROUPS)[ColorGroup][number];

// A literal hue in degrees, or the accent knob.
export type Hue = number | "accent";

// A contrast contract a role keeps at any accent hue: the derivation lowers
// (or raises) the role's lightness from the declared one until each ground
// holds, so a green accent's link stays readable on a group where the blue
// one is at the declared lightness already.
export interface Holds {
	on: ColorName;
	ratio: number;
}

export interface ColorValue {
	l: number;
	c: number;
	hue: Hue;
	alpha?: number;
	holds?: readonly Holds[];
}

// A color is one of: a light and a dark value; an alias of another role; a
// role at an alpha (`veil`, what `color-mix(in oklch, role α, transparent)`
// draws); or a role mixed toward another in OKLab (`mix`, what `color-mix(in
// oklab, role, toward amount)` draws), `black` standing in for the shade.
export type ColorDeclaration =
	| { light: ColorValue; dark: ColorValue }
	| { alias: ColorName }
	| { veil: ColorName; alpha: number }
	| { mix: ColorName; toward: ColorName | "black"; amount: number };

// The neutrals' hue: a cool grey on purpose, the accent's own family.
const NEUTRAL_HUE = 270;

function neutral(l: number, c: number, alpha?: number): ColorValue {
	return alpha === undefined
		? { l, c, hue: NEUTRAL_HUE }
		: { l, c, hue: NEUTRAL_HUE, alpha };
}

function accent(l: number, c: number): ColorValue {
	return { l, c, hue: "accent" };
}

const WHITE: ColorValue = { l: 1, c: 0, hue: 0 };

// The six families' hues and the lightness each mark takes, alternating
// between neighbours so the set separates by lightness as well as hue; light
// marks are floored at L 0.50 and dark marks capped at L 0.75.
const CHIP: Record<
	ChipFamily,
	{ hue: number; light: [number, number]; dark: [number, number] }
> = {
	red: { hue: 25, light: [0.56, 0.2], dark: [0.75, 0.147] },
	amber: { hue: 85, light: [0.65, 0.13], dark: [0.75, 0.15] },
	green: { hue: 145, light: [0.5, 0.154], dark: [0.6, 0.185] },
	teal: { hue: 195, light: [0.61, 0.102], dark: [0.71, 0.118] },
	violet: { hue: 305, light: [0.51, 0.2], dark: [0.65, 0.2] },
	pink: { hue: 350, light: [0.51, 0.2], dark: [0.6, 0.2] },
};

const CHIP_SOFT_LIGHT: Record<ChipFamily, number> = {
	red: 0.026,
	amber: 0.035,
	green: 0.035,
	teal: 0.035,
	violet: 0.032,
	pink: 0.031,
};

const CHIP_INK_LIGHT: Record<ChipFamily, number> = {
	red: 0.1,
	amber: 0.085,
	green: 0.1,
	teal: 0.07,
	violet: 0.1,
	pink: 0.1,
};

const CHIP_INK_DARK: Record<ChipFamily, number> = {
	red: 0.068,
	amber: 0.08,
	green: 0.08,
	teal: 0.08,
	violet: 0.078,
	pink: 0.08,
};

type ChipColor =
	| `chip-${ChipFamily}`
	| `chip-${ChipFamily}-soft`
	| `chip-${ChipFamily}-ink`;

function chipColors(): Record<ChipColor, ColorDeclaration> {
	const out = {} as Record<ChipColor, ColorDeclaration>;
	for (const family of CHIP_FAMILIES) {
		const { hue, light, dark } = CHIP[family];
		out[`chip-${family}`] = {
			light: { l: light[0], c: light[1], hue },
			dark: { l: dark[0], c: dark[1], hue },
		};
		out[`chip-${family}-soft`] = {
			light: { l: 0.945, c: CHIP_SOFT_LIGHT[family], hue },
			dark: { l: 0.3, c: 0.05, hue },
		};
		out[`chip-${family}-ink`] = {
			light: { l: 0.42, c: CHIP_INK_LIGHT[family], hue },
			dark: { l: 0.87, c: CHIP_INK_DARK[family], hue },
		};
	}
	return out;
}

// Eight hues at 40–50° spacing: a pastel fill with a hue-darkened initial in
// light, a deep fill with a hue-lightened initial in dark. Each entry is the
// hue, then the chroma of the fill and of the ink, light and dark.
const AVATAR: Record<
	AvatarStep,
	{ hue: number; fill: [number, number]; ink: [number, number] }
> = {
	1: { hue: 20, fill: [0.062, 0.08], ink: [0.1, 0.04] },
	2: { hue: 60, fill: [0.07, 0.08], ink: [0.088, 0.05] },
	3: { hue: 100, fill: [0.07, 0.08], ink: [0.078, 0.05] },
	4: { hue: 150, fill: [0.07, 0.08], ink: [0.1, 0.05] },
	5: { hue: 190, fill: [0.07, 0.068], ink: [0.064, 0.05] },
	6: { hue: 230, fill: [0.07, 0.078], ink: [0.074, 0.047] },
	7: { hue: 270, fill: [0.057, 0.08], ink: [0.1, 0.037] },
	8: { hue: 320, fill: [0.07, 0.08], ink: [0.1, 0.05] },
};

type AvatarColor = `avatar-${AvatarStep}` | `avatar-${AvatarStep}-ink`;

function avatarColors(): Record<AvatarColor, ColorDeclaration> {
	const out = {} as Record<AvatarColor, ColorDeclaration>;
	for (const step of AVATAR_STEPS) {
		const { hue, fill, ink } = AVATAR[step];
		out[`avatar-${step}`] = {
			light: { l: 0.88, c: fill[0], hue },
			dark: { l: 0.4, c: fill[1], hue },
		};
		out[`avatar-${step}-ink`] = {
			light: { l: 0.38, c: ink[0], hue },
			dark: { l: 0.92, c: ink[1], hue },
		};
	}
	return out;
}

// Surfaces step in CIE L*: light canvas 96.9 under surface 100 and over
// group 93.8; dark canvas 3.6, surface 8.1, group and raised 12.3. The dark
// hairline is two tokens, `edge` over canvas and surface and `edge-raised`
// inside group and lifted layers, since the dark ladder spans more than one
// hairline can straddle; in light both are one hairline. `edge-strong` is a
// control's boundary at 3:1. Inks are three levels: `ink-faint` is disabled
// text only, about 3:1, which WCAG exempts. The accent is a blue between
// Linear's indigo and Vercel's blue, on the neutrals' own hue; `accent-ink`
// is the accent itself in light and lightens in dark so a link and a ring
// read on the near-black ground. The dark status tones are capped at L 0.75
// like the chip marks, and their lightness is spread so they separate under
// protanopia and deuteranopia.
export const COLORS: Record<ColorName, ColorDeclaration> = {
	canvas: { light: neutral(0.974, 0.002), dark: neutral(0.16, 0.005) },
	surface: { light: WHITE, dark: neutral(0.207, 0.006) },
	group: { light: neutral(0.947, 0.004), dark: neutral(0.243, 0.007) },
	raised: { light: WHITE, dark: neutral(0.243, 0.007) },
	edge: { light: neutral(0.915, 0.004), dark: neutral(0.298, 0.008) },
	"edge-raised": { light: neutral(0.915, 0.004), dark: neutral(0.332, 0.008) },
	"edge-strong": { light: neutral(0.62, 0.01), dark: neutral(0.53, 0.01) },
	scrim: {
		light: neutral(0.2, 0.01, 0.45),
		dark: { l: 0, c: 0, hue: 0, alpha: 0.5 },
	},
	"ink-body": { light: neutral(0.2, 0.008), dark: neutral(0.97, 0.002) },
	"ink-meta": { light: neutral(0.45, 0.012), dark: neutral(0.76, 0.01) },
	"ink-faint": { light: neutral(0.665, 0.01), dark: neutral(0.506, 0.01) },
	accent: { light: accent(0.52, 0.19), dark: accent(0.52, 0.19) },
	"on-accent": { light: WHITE, dark: WHITE },
	"accent-soft": { light: accent(0.95, 0.023), dark: accent(0.29, 0.06) },
	"accent-ink": {
		light: {
			...accent(0.52, 0.19),
			holds: [
				{ on: "group", ratio: 4.5 },
				{ on: "accent-soft", ratio: 4.5 },
			],
		},
		dark: {
			...accent(0.72, 0.13),
			holds: [
				{ on: "group", ratio: 4.5 },
				{ on: "accent-soft", ratio: 4.5 },
			],
		},
	},
	ok: {
		light: { l: 0.49, c: 0.129, hue: 150 },
		dark: { l: 0.64, c: 0.17, hue: 150 },
	},
	"ok-soft": {
		light: { l: 0.965, c: 0.04, hue: 150 },
		dark: { l: 0.28, c: 0.05, hue: 150 },
	},
	warn: {
		light: { l: 0.48, c: 0.099, hue: 70 },
		dark: { l: 0.75, c: 0.15, hue: 80 },
	},
	"warn-soft": {
		light: { l: 0.965, c: 0.036, hue: 85 },
		dark: { l: 0.28, c: 0.05, hue: 75 },
	},
	danger: {
		light: { l: 0.55, c: 0.19, hue: 25 },
		dark: { l: 0.71, c: 0.178, hue: 25 },
	},
	"danger-soft": {
		light: { l: 0.965, c: 0.016, hue: 20 },
		dark: { l: 0.28, c: 0.06, hue: 25 },
	},
	"on-danger": { light: WHITE, dark: neutral(0.16, 0.005) },
	...chipColors(),
	...avatarColors(),
	// Measured on surface in CIE L*: light 100 → hover 95.8 → selected 91.0 →
	// selected + hover 87.8; dark 8.1 → 13.1 → 19.7 → 23.8.
	"wash-hover": { veil: "ink-body", alpha: 0.05 },
	"wash-press": { veil: "ink-body", alpha: 0.08 },
	"wash-selected": { veil: "ink-body", alpha: 0.11 },
	"wash-selected-hover": { veil: "ink-body", alpha: 0.15 },
	skeleton: { veil: "ink-body", alpha: 0.09 },
	"fill-disabled": { veil: "ink-body", alpha: 0.06 },
	ring: { alias: "accent-ink" },
	"selected-outline": { alias: "accent-ink" },
	"edge-hover": { alias: "edge-strong" },
	"edge-error": { alias: "danger" },
	"ink-error": { alias: "danger" },
	"ink-disabled": { alias: "ink-faint" },
	// Hover and press move a fill 12 % and 22 % toward a second color: the
	// accent toward black, so its label only gains contrast; the ink fill
	// toward its own label, which lightens it in light and darkens it in
	// dark. Pending recedes 30 % toward the label (the accent) or the page
	// (the ink fill).
	"act-accent": { alias: "accent" },
	"on-act-accent": { alias: "on-accent" },
	"act-accent-hover": { mix: "accent", toward: "black", amount: 0.12 },
	"act-accent-press": { mix: "accent", toward: "black", amount: 0.22 },
	"act-accent-pending": { mix: "accent", toward: "on-accent", amount: 0.3 },
	"act-ink": { alias: "ink-body" },
	"on-act-ink": { alias: "canvas" },
	"act-ink-hover": { mix: "ink-body", toward: "canvas", amount: 0.12 },
	"act-ink-press": { mix: "ink-body", toward: "canvas", amount: 0.22 },
	"act-ink-pending": { mix: "ink-body", toward: "canvas", amount: 0.3 },
	"switch-off": { alias: "edge-strong" },
	"switch-off-hover": { mix: "edge-strong", toward: "ink-body", amount: 0.15 },
	"switch-on": { alias: "accent" },
	"switch-on-hover": { mix: "accent", toward: "black", amount: 0.12 },
	"switch-thumb": { alias: "on-accent" },
};

// A switch, which has no label of its own, disables by opacity.
export const DISABLED_OPACITY = 0.45;

// ── Type ────────────────────────────────────────────────────────────

// Two rules decide which role a piece of text takes. Size follows structure,
// never emphasis: the primary line of anything is `body`, a secondary line
// is `meta`, and emphasis inside a line is weight 500 (`strong`), never a
// size change. A size role names a place, once: `title` is the page's name,
// once per screen; `heading` a section's or a card's name, never inside a
// row; `caption` text inside a small component (a chip, a key hint), never
// a sentence; `code` what a machine reads. So there is no label role: a
// field label and a row's leading cell are `body` at 500, a table header is
// `meta` at 500, menu and picker items are `body`.
export const TYPE_ROLES = [
	"display",
	"title",
	"heading",
	"body",
	"meta",
	"caption",
	"code",
] as const;
export type TypeRole = (typeof TYPE_ROLES)[number];

// The roles that carry tracking; the rest are 0 and emit none.
export const TRACKED_ROLES = [
	"display",
	"title",
	"heading",
	"caption",
] as const;
export type TrackedRole = (typeof TRACKED_ROLES)[number];

export type FontWeight = "regular" | "medium" | "semibold";

// The body size per density, the one base of the scale: 16 is also the
// input size below which iOS Safari zooms on focus.
export const BODY_SIZE: Record<Density, number> = { desktop: 13, touch: 16 };

// `size` is a ratio of the body size, rounded to the pixel; `leading` a ratio
// of the size, its line box rounded to the even pixel (a tie rounds up).
// Tracking is in em and density-invariant: Inter's opsz axis already
// tightens the display cut. Ink is a color role, family a font role.
export interface TypeRoleSpec {
	size: number;
	leading: number;
	weight: FontWeight;
	ink: "ink-body" | "ink-meta";
	family: FontRole;
}

export const TYPE_SCALE: Record<TypeRole, TypeRoleSpec> = {
	display: {
		size: 2.77,
		leading: 1.1,
		weight: "medium",
		ink: "ink-body",
		family: "sans",
	},
	title: {
		size: 1.385,
		leading: 1.3,
		weight: "semibold",
		ink: "ink-body",
		family: "sans",
	},
	heading: {
		size: 1.154,
		leading: 1.3,
		weight: "semibold",
		ink: "ink-body",
		family: "sans",
	},
	body: {
		size: 1,
		leading: 1.5,
		weight: "regular",
		ink: "ink-body",
		family: "sans",
	},
	meta: {
		size: 0.923,
		leading: 1.5,
		weight: "regular",
		ink: "ink-meta",
		family: "sans",
	},
	caption: {
		size: 0.846,
		leading: 1.5,
		weight: "regular",
		ink: "ink-meta",
		family: "sans",
	},
	code: {
		size: 0.923,
		leading: 1.5,
		weight: "regular",
		ink: "ink-body",
		family: "mono",
	},
};

export const TYPE_TRACKING: Record<TrackedRole, string> = {
	display: "-0.02em",
	title: "-0.01em",
	heading: "-0.005em",
	caption: "0.01em",
};

// Emphasis inside a line; muted text is never above it.
export const STRONG_WEIGHT: FontWeight = "medium";

// ── Space ───────────────────────────────────────────────────────────

// One base, 4 px; every role is a multiple of it, picked per density, so a
// density moves roles up and down one ladder rather than inventing values.
export const SPACE_BASE = 4;

// Roles, by use: `inside` within a control (icon to label, dot to text);
// `control-x` a control's inline padding; `pair` between paired elements
// (label over input, title over description); `rows` between rows in a menu
// or a nav list (rows in a hairline list abut); `card` a card's or a
// popover's inset; `fields` between fields; `sections` between sections of a
// page; `page` the page inset.
export const SPACING_ROLES = [
	"inside",
	"control-x",
	"pair",
	"rows",
	"card",
	"fields",
	"sections",
	"page",
] as const;
export type SpacingRole = (typeof SPACING_ROLES)[number];

// The roles a container may put between its children; the other three are
// insets. The gate's gap vocabulary and the rhythm matrix are this list.
export const GAP_ROLES = [
	"inside",
	"pair",
	"rows",
	"fields",
	"sections",
] as const;
export type GapRole = (typeof GAP_ROLES)[number];

// Multiples of `SPACE_BASE`. Touch is the same roles one rung looser, except
// the page inset, which a phone narrows.
export const SPACING_RATIO: Record<Density, Record<SpacingRole, number>> = {
	desktop: {
		inside: 1.5,
		"control-x": 3,
		pair: 1.5,
		rows: 0.5,
		card: 4,
		fields: 4,
		sections: 8,
		page: 6,
	},
	touch: {
		inside: 2,
		"control-x": 4,
		pair: 2,
		rows: 1,
		card: 4,
		fields: 6,
		sections: 10,
		page: 4,
	},
};

// ── Sizes per density ───────────────────────────────────────────────

// Heights and squares, in the `--spacing-*` namespace so a cell names them as
// it names a role (`min-h-control`, `size-avatar`). Desktop: control 32,
// compact 28 (menus, toolbars), field 38, one-line row 32, two-line row 48,
// setting row 64, header 32, target 24. Touch: every target at least 44.
export const SIZES = [
	"control",
	"control-compact",
	"field",
	"row",
	"row-2",
	"row-setting",
	"header",
	"target",
	"dot",
	"chip",
	"avatar",
	"spinner",
	"switch-w",
	"switch-h",
	"thumb",
	"switch-inset",
	"skeleton",
] as const;
export type Size = (typeof SIZES)[number];

export const SIZE_PX: Record<Density, Record<Size, number>> = {
	desktop: {
		control: 32,
		"control-compact": 28,
		field: 38,
		row: 32,
		"row-2": 48,
		"row-setting": 64,
		header: 32,
		target: 24,
		dot: 6,
		chip: 20,
		avatar: 24,
		spinner: 14,
		"switch-w": 28,
		"switch-h": 16,
		thumb: 12,
		"switch-inset": 2,
		skeleton: 12,
	},
	touch: {
		control: 44,
		"control-compact": 44,
		field: 48,
		row: 48,
		"row-2": 64,
		"row-setting": 72,
		header: 44,
		target: 44,
		dot: 8,
		chip: 24,
		avatar: 32,
		spinner: 16,
		"switch-w": 40,
		"switch-h": 24,
		thumb: 20,
		"switch-inset": 2,
		skeleton: 12,
	},
};

// ── Radius, hairline, ring, widths, breakpoints ─────────────────────

// Spent by role: chip 4; control and row 6; card, popover and sheet 8;
// dialog 12; `full` only on dots, avatars and the pill chip or status.
// Density-invariant: a radius names the role, not the size.
export const RADIUS_ROLES = [
	"chip",
	"control",
	"row",
	"card",
	"popover",
	"sheet",
	"dialog",
	"full",
] as const;
export type RadiusRole = (typeof RADIUS_ROLES)[number];

export const RADIUS_PX: Record<RadiusRole, number> = {
	chip: 4,
	control: 6,
	row: 6,
	card: 8,
	popover: 8,
	sheet: 8,
	dialog: 12,
	full: 9999,
};

// One hairline width for region edges, row splits and field boundaries. The
// focus ring is `ring`, drawn outside the box at an offset so it never
// covers the control's own edge; inside a list it is drawn inward.
export const HAIRLINE_PX = 1;
export const RING_PX = 2;
export const RING_OFFSET_PX = 2;

// The widths of lifted layers, each at its pattern's range (a layer never
// stretches to its container), and the one measure for running text.
export const WIDTHS = [
	"popover",
	"toast",
	"dialog",
	"sheet",
	"measure",
] as const;
export type Width = (typeof WIDTHS)[number];

export const WIDTH_VALUE: Record<Width, string> = {
	popover: "240px",
	toast: "360px",
	dialog: "440px",
	sheet: "640px",
	measure: "66ch",
};

export const BREAKPOINTS = ["tablet", "desktop", "wide"] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

export const BREAKPOINT_PX: Record<Breakpoint, number> = {
	tablet: 768,
	desktop: 1024,
	wide: 1440,
};

// ── Elevation ───────────────────────────────────────────────────────

// Two levels, spent on lifted layers only: `float` a popover, a menu, a
// picker, a toast; `modal` a dialog, a sheet, a command palette. Each is a
// tight contact shadow plus a soft ambient one, tinted with the neutral hue
// in light; in dark the lift is carried by the raised step and the hairline,
// so the shadow is pure black at a higher opacity.
export const SHADOW_LEVELS = ["float", "modal"] as const;
export type ShadowLevel = (typeof SHADOW_LEVELS)[number];

export interface ShadowLayer {
	y: number;
	blur: number;
	alpha: number;
}

export const SHADOW_INK: Record<Mode, ColorValue> = {
	light: neutral(0.2, 0.01),
	dark: { l: 0, c: 0, hue: 0 },
};

export const SHADOW_LAYERS: Record<
	ShadowLevel,
	Record<Mode, readonly ShadowLayer[]>
> = {
	float: {
		light: [
			{ y: 1, blur: 2, alpha: 0.06 },
			{ y: 4, blur: 12, alpha: 0.08 },
		],
		dark: [
			{ y: 1, blur: 2, alpha: 0.4 },
			{ y: 4, blur: 12, alpha: 0.5 },
		],
	},
	modal: {
		light: [
			{ y: 2, blur: 4, alpha: 0.06 },
			{ y: 16, blur: 40, alpha: 0.14 },
		],
		dark: [
			{ y: 2, blur: 4, alpha: 0.4 },
			{ y: 16, blur: 40, alpha: 0.65 },
		],
	},
};

// ── Motion ──────────────────────────────────────────────────────────

// One scale from a base of 200 ms: `instant` is press feedback only, the
// rest the 150–300 band a micro-interaction lives in. Only transform and
// opacity animate: a state switches its color, fill and boundary at once,
// and motion is spent on what enters and leaves and on the switch thumb.
export const DURATIONS = ["instant", "fast", "base", "slow"] as const;
export type Duration = (typeof DURATIONS)[number];

export const DURATION_MS: Record<Duration, number> = {
	instant: 100,
	fast: 150,
	base: 200,
	slow: 300,
};

// A loop, not a transition: outside the scale and kept under reduced motion,
// because the spin is the only sign a wait is live.
export const LOOP_MS = 800;

export const EASINGS = ["out", "in", "in-out"] as const;
export type Easing = (typeof EASINGS)[number];

// `out` for what enters or answers a touch, `in` for what leaves, `in-out`
// for what moves between two places. No curve overshoots.
export const EASING: Record<Easing, readonly [number, number, number, number]> =
	{
		out: [0.16, 1, 0.3, 1],
		in: [0.7, 0, 0.84, 0],
		"in-out": [0.65, 0, 0.35, 1],
	};

// ── Fonts and the reset ─────────────────────────────────────────────

// Namespaces reset to `initial`, so an off-contract utility compiles to
// nothing. The numeric `--spacing` base and the `--font-weight-*` ladder stay
// live: the roles name their weights, and the geometry gate keeps a numeric
// off a call site. A bare `duration-150` stays live too: Tailwind turns a
// number into milliseconds without reading the theme.
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
	"--transition-duration-*",
	"--ease-*",
] as const;

// Code reads character for character: the mono family's ligatures and
// contextual alternates stay off, so `!==` never draws as `≢`.
export const MONO_FEATURES = '"liga" 0, "calt" 0';

// The stacks each family falls back to on both platforms; `sans` alone is the
// platform's stack when the knob names no family.
export const FONT_FALLBACKS: Record<FontRole, string> = {
	sans: "ui-sans-serif, system-ui, sans-serif",
	mono: 'ui-monospace, "SFMono-Regular", Menlo, monospace',
};

// The face a family's metric fallback is declared under: a local platform
// font sized to the family's box, so the swap moves nothing. The web plugin
// declares it beside the family's own face and the family stack names it
// second; a platform that declares no such face skips the name.
export function fallbackFace(family: string): string {
	return `${family} Fallback`;
}

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
	"add",
	"remove",
	"duplicate",
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
	add: "Add",
	remove: "Remove",
	duplicate: "Already in the list",
};
