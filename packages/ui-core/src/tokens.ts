// The closed token contract, as data. The derivation keeps one base per scale
// so the numbers stay explainable, and a consumer moves the knobs below and
// never a token.

// Prefixes every error this package throws.
export const LABEL = "@fcalell/ui-core";

export const MODES = ["light", "dark"] as const;
export type Mode = (typeof MODES)[number];

// ── Knobs ───────────────────────────────────────────────────────────

// How dense everything draws, decided by the pointer and the width, never by
// a knob: where the primary pointer is fine (a mouse or a trackpad) and the
// viewport is at least `tablet` wide the web draws the `desktop` set,
// everywhere else the `touch` set, the 44 px world.
// `data-density` on the web root pins either set on any device, which is how
// the showcase addresses a density. Density moves the type
// scale, the spacing roles and every size; nothing else. Native is
// touch-only.
export const DENSITIES = ["touch", "desktop"] as const;
export type Density = (typeof DENSITIES)[number];

export const FONT_ROLES = ["sans", "mono"] as const;
export type FontRole = (typeof FONT_ROLES)[number];

// `accentHue` re-hues the accent. `castHue` is the hue every neutral carries
// (the grounds, the hairlines, the inks, the washes) at the chroma the sheet
// fixes per role and mode, so it tints the chrome and moves no contrast; it
// defaults to `accentHue`, so an accent alone tints the chrome toward it. The
// status hues, the chip families and the avatars are fixed. `fonts` names the
// two families; the files that carry them are each plugin's `fonts` option.
export interface Knobs {
	accentHue: number;
	castHue: number;
	fonts: Record<FontRole, string>;
}

// `castHue` has no default of its own: it is `accentHue`'s.
export const KNOB_DEFAULTS: Omit<Knobs, "castHue"> = {
	accentHue: 264,
	fonts: { sans: "IBM Plex Sans", mono: "IBM Plex Mono" },
};

// ── Colors ──────────────────────────────────────────────────────────

// The six hued chip families, in hue order (25, 85, 145, 195, 305, 350),
// the accent's 215–290 band left out so no family ever wears it.
export const CHIP_HUES = [
	"red",
	"amber",
	"green",
	"teal",
	"violet",
	"pink",
] as const;
export type ChipHue = (typeof CHIP_HUES)[number];

// Every chip family: the six hues and `neutral`, the resting neutral ground
// under the body ink (an applied filter, a tag without a category), which
// has a soft and an ink and no mark.
export const CHIP_FAMILIES = [...CHIP_HUES, "neutral"] as const;
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
	// the mark, the soft ground, the ink on the soft; neutral has no mark
	chips: [
		...CHIP_HUES.flatMap(
			(family) =>
				[
					`chip-${family}`,
					`chip-${family}-soft`,
					`chip-${family}-ink`,
				] as const,
		),
		"chip-neutral-soft",
		"chip-neutral-ink",
	],
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
		"fill-neutral",
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
		"act-danger",
		"on-act-danger",
		"act-danger-hover",
		"act-danger-press",
		"act-danger-pending",
	],
	// the switch's track and knob, and the on fill every toggle shares
	switch: [
		"switch-off",
		"switch-off-hover",
		"toggle-on",
		"toggle-on-hover",
		"switch-thumb",
	],
} as const;
export type ColorGroup = keyof typeof COLOR_GROUPS;

export const COLOR_NAMES: readonly ColorName[] =
	Object.values(COLOR_GROUPS).flat();
export type ColorName = (typeof COLOR_GROUPS)[ColorGroup][number];

// A literal hue in degrees, the accent knob, or the cast knob.
export type Hue = number | "accent" | "cast";

// A contrast contract a role keeps at any accent or cast hue: the derivation lowers
// (or raises) the role's lightness from the declared one until each ground
// holds, so a green accent's link stays readable on a group where the blue
// one is at the declared lightness already. `under` names a veil over the
// ground, composited as a browser draws a translucent fill over an opaque
// one (an alpha blend in gamma sRGB): a label on a pressed part.
export interface Holds {
	on: ColorName;
	under?: ColorName;
	ratio: number;
}

export interface ColorValue {
	l: number;
	c: number;
	hue: Hue;
	alpha?: number;
	holds?: readonly Holds[];
}

// The grounds that re-point the hairline for everything inside them: on a
// group tile or a lifted layer a part that names `edge` draws
// `edge-raised`, so no part picks between the two.
export const RAISED_GROUNDS = [
	"group",
	"raised",
] as const satisfies readonly ColorName[];

// A color is one of: a light and a dark value; an alias of another role; a
// role at an alpha (`veil`, what `color-mix(in oklch, role α, transparent)`
// draws); or a role mixed toward another in OKLab (`mix`, what `color-mix(in
// oklab, role, toward amount)` draws), `black` standing in for the shade. A
// mix names one `toward` for both modes or one per mode, and may carry
// `holds` per mode, the mix being where the hold starts.
export type MixTarget = ColorName | "black";

export type ColorDeclaration =
	| { light: ColorValue; dark: ColorValue }
	| { alias: ColorName }
	| { veil: ColorName; alpha: number }
	| {
			mix: ColorName;
			toward: MixTarget | Record<Mode, MixTarget>;
			amount: number;
			holds?: Record<Mode, readonly Holds[]>;
	  };

// A neutral wears the cast knob's hue at the chroma declared here, a
// constant per role and mode: the chroma decides whether a cast is a tint or
// a color, so only the hue is a knob.
function neutral(l: number, c: number, alpha?: number): ColorValue {
	return alpha === undefined
		? { l, c, hue: "cast" }
		: { l, c, hue: "cast", alpha };
}

function accent(l: number, c: number): ColorValue {
	return { l, c, hue: "accent" };
}

const WHITE: ColorValue = { l: 1, c: 0, hue: 0 };

// The six families' hues and the lightness each mark takes, alternating
// between neighbours so the set separates by lightness as well as hue; light
// marks are floored at L 0.50 and dark marks capped at L 0.75.
const CHIP: Record<
	ChipHue,
	{ hue: number; light: [number, number]; dark: [number, number] }
> = {
	red: { hue: 25, light: [0.56, 0.2], dark: [0.75, 0.147] },
	amber: { hue: 85, light: [0.65, 0.13], dark: [0.75, 0.15] },
	green: { hue: 145, light: [0.5, 0.154], dark: [0.6, 0.185] },
	teal: { hue: 195, light: [0.61, 0.102], dark: [0.71, 0.118] },
	violet: { hue: 305, light: [0.51, 0.2], dark: [0.65, 0.2] },
	pink: { hue: 350, light: [0.51, 0.2], dark: [0.6, 0.2] },
};

const CHIP_SOFT_LIGHT: Record<ChipHue, number> = {
	red: 0.026,
	amber: 0.035,
	green: 0.035,
	teal: 0.035,
	violet: 0.032,
	pink: 0.031,
};

const CHIP_INK_LIGHT: Record<ChipHue, number> = {
	red: 0.1,
	amber: 0.085,
	green: 0.1,
	teal: 0.07,
	violet: 0.1,
	pink: 0.1,
};

const CHIP_INK_DARK: Record<ChipHue, number> = {
	red: 0.068,
	amber: 0.08,
	green: 0.08,
	teal: 0.08,
	violet: 0.078,
	pink: 0.08,
};

type ChipColor =
	| `chip-${ChipHue}`
	| `chip-${ChipFamily}-soft`
	| `chip-${ChipFamily}-ink`;

function chipColors(): Record<ChipColor, ColorDeclaration> {
	const out = {
		"chip-neutral-soft": { alias: "fill-neutral" },
		"chip-neutral-ink": { alias: "ink-body" },
	} as Record<ChipColor, ColorDeclaration>;
	for (const family of CHIP_HUES) {
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

const EDGE_STRONG_HOLDS: readonly Holds[] = [
	{ on: "surface", under: "wash-press", ratio: 3 },
	{ on: "surface", under: "wash-selected", ratio: 3 },
];

// Surfaces step in CIE L*: light canvas 96.9 under surface 100 and over
// group 93.8; dark canvas 3.6, surface 8.1, group and raised 13.1. The dark
// hairline is two tokens, `edge` over canvas and surface and `edge-raised`
// inside group and lifted layers, since the dark ladder spans more than one
// hairline can straddle; in light both are one hairline. `edge-strong` is a
// control's boundary at 3:1. Inks are three levels: `ink-faint` is disabled
// text only, about 3:1, which WCAG exempts. The accent is a blue between
// Linear's indigo and Vercel's blue, whose hue the neutrals wear unless the
// cast names another; `accent-ink` is the accent itself in light and
// lightens in dark so a link and a ring read on the near-black ground. The dark status tones are capped at L 0.75
// like the chip marks, and their lightness is spread so they separate under
// protanopia and deuteranopia.
export const COLORS: Record<ColorName, ColorDeclaration> = {
	canvas: { light: neutral(0.974, 0.002), dark: neutral(0.16, 0.005) },
	surface: { light: WHITE, dark: neutral(0.207, 0.006) },
	group: { light: neutral(0.947, 0.004), dark: neutral(0.25, 0.007) },
	raised: { light: WHITE, dark: neutral(0.25, 0.007) },
	edge: { light: neutral(0.915, 0.004), dark: neutral(0.298, 0.008) },
	"edge-raised": { light: neutral(0.915, 0.004), dark: neutral(0.332, 0.008) },
	// A control's boundary stays one on a pressed or selected row, the
	// checkbox and radio in a list among them.
	"edge-strong": {
		light: { ...neutral(0.62, 0.01), holds: EDGE_STRONG_HOLDS },
		dark: { ...neutral(0.53, 0.01), holds: EDGE_STRONG_HOLDS },
	},
	scrim: {
		light: neutral(0.2, 0.01, 0.45),
		dark: { l: 0, c: 0, hue: 0, alpha: 0.5 },
	},
	"ink-body": { light: neutral(0.2, 0.008), dark: neutral(0.97, 0.002) },
	"ink-meta": { light: neutral(0.45, 0.012), dark: neutral(0.76, 0.01) },
	"ink-faint": { light: neutral(0.665, 0.01), dark: neutral(0.506, 0.01) },
	// In dark the accent fill is a control's boundary on a group tile (a
	// checked box, a switch on), so it holds 3:1 there.
	accent: {
		light: accent(0.52, 0.19),
		dark: { ...accent(0.52, 0.19), holds: [{ on: "group", ratio: 3 }] },
	},
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
	// A hairline destructive act's label holds text contrast under its press
	// wash on a group, the darkest ground it takes in light; the filled
	// danger act holds its own label.
	danger: {
		light: {
			l: 0.55,
			c: 0.19,
			hue: 25,
			holds: [
				{ on: "group", under: "wash-press", ratio: 4.5 },
				{ on: "on-danger", ratio: 4.5 },
			],
		},
		dark: {
			l: 0.71,
			c: 0.178,
			hue: 25,
			holds: [{ on: "on-danger", ratio: 4.5 }],
		},
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
	"fill-neutral": { veil: "ink-body", alpha: 0.08 },
	ring: { alias: "accent-ink" },
	"selected-outline": { alias: "accent-ink" },
	"edge-hover": { alias: "edge-strong" },
	"edge-error": { alias: "danger" },
	"ink-error": { alias: "danger" },
	"ink-disabled": { alias: "ink-faint" },
	// Hover and press move a fill 12 % and 22 % away from its label, so the
	// label only gains contrast: the accent act (a white label in both modes)
	// and the danger act in light (white) toward black, the danger act in dark
	// (a near-black label) toward `ink-body`.
	// Pending is inert and recedes 30 %: a filled act toward its label in
	// light and toward the page in dark, held at 3:1 under its label, where
	// the spinner draws. A labelled act's fill
	// takes no ground floor in any state: its label names it.
	"act-accent": { alias: "accent" },
	"on-act-accent": { alias: "on-accent" },
	"act-accent-hover": { mix: "accent", toward: "black", amount: 0.12 },
	"act-accent-press": { mix: "accent", toward: "black", amount: 0.22 },
	"act-accent-pending": {
		mix: "accent",
		toward: { light: "on-accent", dark: "canvas" },
		amount: 0.3,
		holds: {
			light: [{ on: "on-act-accent", ratio: 3 }],
			dark: [{ on: "on-act-accent", ratio: 3 }],
		},
	},
	"act-danger": { alias: "danger" },
	"on-act-danger": { alias: "on-danger" },
	"act-danger-hover": {
		mix: "danger",
		toward: { light: "black", dark: "ink-body" },
		amount: 0.12,
	},
	"act-danger-press": {
		mix: "danger",
		toward: { light: "black", dark: "ink-body" },
		amount: 0.22,
	},
	"act-danger-pending": {
		mix: "danger",
		toward: { light: "on-danger", dark: "canvas" },
		amount: 0.3,
		holds: {
			light: [{ on: "on-act-danger", ratio: 3 }],
			dark: [{ on: "on-act-danger", ratio: 3 }],
		},
	},
	// A toggle on (a switch's track, a checked box, a slider's fill) has no
	// label to carry it, so it is a boundary at 3:1 on every ground, and its
	// hover moves away from the ground: darker in light, lighter in dark.
	"switch-off": { alias: "edge-strong" },
	"switch-off-hover": { mix: "edge-strong", toward: "ink-body", amount: 0.15 },
	"toggle-on": { alias: "accent" },
	"toggle-on-hover": {
		mix: "accent",
		toward: { light: "black", dark: "on-accent" },
		amount: 0.12,
	},
	"switch-thumb": { alias: "on-accent" },
};

// A switch, which has no label of its own, disables by opacity.
export const DISABLED_OPACITY = 0.45;

// The order a chart's series take the chip marks (`chip-<hue>`): one series
// takes the first.
export const CHART_SERIES = [
	"teal",
	"violet",
	"amber",
	"pink",
	"green",
	"red",
] as const satisfies readonly ChipHue[];

// The share of its max at or above which a meter is near; above the max it
// is over.
export const METER_NEAR = 0.9;

export type MeterLevel = "under" | "near" | "over";

// The level a share of the max stands at: past the max over, from `near` near
// (`METER_NEAR`, or a meter's own mark), else under. Both platforms read it, so
// one meter draws one level.
export function levelOf(share: number, near: number = METER_NEAR): MeterLevel {
	if (share > 1) return "over";
	if (share >= near) return "near";
	return "under";
}

export type StepState = "done" | "current" | "later";

// The state of a step counted from one when the flow stands at `at`. Both
// platforms read it, so one step count draws one state per segment.
export function stepStateOf(step: number, at: number): StepState {
	if (step < at) return "done";
	if (step === at) return "current";
	return "later";
}

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
// Tracking is in em and density-invariant. Ink is a color role, family a
// font role.
// `tabular` draws the figures at one width: a display is a stat.
export interface TypeRoleSpec {
	size: number;
	leading: number;
	weight: FontWeight;
	ink: "ink-body" | "ink-meta";
	family: FontRole;
	tabular: boolean;
}

export const TYPE_SCALE: Record<TypeRole, TypeRoleSpec> = {
	display: {
		size: 2.77,
		leading: 1.1,
		weight: "medium",
		ink: "ink-body",
		family: "sans",
		tabular: true,
	},
	title: {
		size: 1.385,
		leading: 1.3,
		weight: "semibold",
		ink: "ink-body",
		family: "sans",
		tabular: false,
	},
	heading: {
		size: 1.154,
		leading: 1.3,
		weight: "semibold",
		ink: "ink-body",
		family: "sans",
		tabular: false,
	},
	body: {
		size: 1,
		leading: 1.5,
		weight: "regular",
		ink: "ink-body",
		family: "sans",
		tabular: false,
	},
	meta: {
		size: 0.923,
		leading: 1.5,
		weight: "regular",
		ink: "ink-meta",
		family: "sans",
		tabular: false,
	},
	caption: {
		size: 0.846,
		leading: 1.5,
		weight: "regular",
		ink: "ink-meta",
		family: "sans",
		tabular: false,
	},
	code: {
		size: 0.923,
		leading: 1.5,
		weight: "regular",
		ink: "ink-body",
		family: "mono",
		tabular: false,
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

// The mono family's character advance in em: IBM Plex Mono's 600 over its
// 1000 em. A size counted in code figures (`figures`) is derived from it,
// since native has no `ch` unit; a named mono with a narrower advance fits
// inside it, a wider one does not.
export const MONO_ADVANCE = 0.6;

// The sans family's figure advance in em: IBM Plex Sans's "0", 600 over
// its 1000 em. Native has no `ch` unit, so its two measures are derived from
// it at the touch body size: a label's own size is lost there (a caption's
// cap is the body's), and a named sans with a wider "0" overflows them.
export const SANS_ADVANCE = 0.6;

// ── Space ───────────────────────────────────────────────────────────

// One base, 4 px; every role is a multiple of it, picked per density, so a
// density moves roles up and down one ladder rather than inventing values.
export const SPACE_BASE = 4;

// Roles, by use: `inside` within a control (icon to label, dot to text);
// `control-x` a control's inline padding; `pair` between paired elements
// (label over input, title over description); `acts` between the acts of a
// bar (a page header, a toolbar, an action bar); `rows` between rows in a menu
// or a nav list (rows in a hairline list abut); `card` a card's inset;
// `tile` a compact card's inset (a board card);
// `float` a floating surface's inset (a select's list, a menu, a picker
// popover), so a row's wash sits just inside its edge; `fields` between
// fields; `sections` between sections of a page; `page` the page inset. A role never takes a width's name: `w-*` reads the spacing role first,
// which would shadow the width.
export const SPACING_ROLES = [
	"inside",
	"control-x",
	"pair",
	"acts",
	"rows",
	"card",
	"tile",
	"float",
	"fields",
	"sections",
	"page",
] as const;
export type SpacingRole = (typeof SPACING_ROLES)[number];

// The roles a container may put between its children; the other six are
// insets. A cell spells a gap only on one of these.
export const GAP_ROLES = [
	"inside",
	"pair",
	"acts",
	"rows",
	"fields",
	"sections",
] as const;
export type GapRole = (typeof GAP_ROLES)[number];

// Multiples of `SPACE_BASE`. Touch is the same roles one rung looser, except
// the float inset and the acts gap, which hold, and the page inset, which a
// phone narrows.
export const SPACING_RATIO: Record<Density, Record<SpacingRole, number>> = {
	desktop: {
		inside: 1.5,
		"control-x": 3,
		pair: 1.5,
		acts: 2,
		rows: 0.5,
		card: 4,
		tile: 3,
		float: 1,
		fields: 4,
		sections: 8,
		page: 6,
	},
	touch: {
		inside: 2,
		"control-x": 4,
		pair: 2,
		acts: 2,
		rows: 1,
		card: 4,
		tile: 4,
		float: 1,
		fields: 6,
		sections: 10,
		page: 4,
	},
};

// ── Sizes per density ───────────────────────────────────────────────

// Heights and squares, in the `--spacing-*` namespace so a cell names them as
// it names a role (`min-h-control`, `size-avatar`). Desktop: control 32,
// compact 28 (menus, toolbars), field 38, one-line row 32, two-line row 48,
// setting row 64, strip 40 (a page header bar: the title and its acts),
// target 24. Touch: every target at least 44. An
// icon is sized by what it sits beside: `icon-meta` meta or caption text,
// `icon` body text, `icon-control` the inside of a control. The spinner is
// the `icon` rung: it replaces a row's glyph and sits beside body text.
// `meter` is a meter's bar, `chart` a chart's plot, `qr` a QR code's
// square, `figures` four tabular figures at the code size (a diff's number
// columns, a file row's count lanes), `message-input` the
// tallest a message input's text grows before it scrolls, `image-tile` an
// image thumbnail's side and `image-cap` the tallest an image grows at its
// container's width (`thumb` is the switch's knob).
export const SIZES = [
	"control",
	"control-compact",
	"field",
	"row",
	"row-2",
	"row-setting",
	"strip",
	"target",
	"dot",
	"chip",
	"avatar",
	"spinner",
	"switch-w",
	"switch-h",
	"thumb",
	"switch-inset",
	"switch-travel",
	"skeleton",
	"icon-meta",
	"icon",
	"icon-control",
	"check",
	"track",
	"otp",
	"text-area",
	"meter",
	"chart",
	"qr",
	"figures",
	"message-input",
	"image-tile",
	"image-cap",
] as const;
export type Size = (typeof SIZES)[number];

// Derived and declared nowhere: the thumb's travel, the track less the thumb
// and its inset on both sides; a text area's least value height, three body
// line boxes; `figures`, four tabular figures at the code size at
// `MONO_ADVANCE`, rounded up to the pixel; a message input's tallest text,
// eight body line boxes; an image thumbnail's side, four body line boxes (the
// provenance lines it stands beside); an image's height cap, twenty.
export type DerivedSize =
	| "switch-travel"
	| "text-area"
	| "figures"
	| "message-input"
	| "image-tile"
	| "image-cap";

export const SIZE_PX: Record<
	Density,
	Record<Exclude<Size, DerivedSize>, number>
> = {
	desktop: {
		control: 32,
		"control-compact": 28,
		field: 38,
		row: 32,
		"row-2": 48,
		"row-setting": 64,
		strip: 40,
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
		"icon-meta": 12,
		icon: 14,
		"icon-control": 16,
		check: 16,
		track: 2,
		otp: 44,
		meter: 6,
		chart: 128,
		qr: 160,
	},
	touch: {
		control: 44,
		"control-compact": 44,
		field: 48,
		row: 48,
		"row-2": 64,
		"row-setting": 72,
		strip: 44,
		target: 44,
		dot: 8,
		chip: 24,
		avatar: 32,
		spinner: 18,
		"switch-w": 40,
		"switch-h": 24,
		thumb: 20,
		"switch-inset": 2,
		skeleton: 12,
		"icon-meta": 14,
		icon: 18,
		"icon-control": 20,
		check: 20,
		track: 4,
		otp: 48,
		meter: 8,
		chart: 192,
		qr: 240,
	},
};

// ── Radius, hairline, ring, widths, breakpoints ─────────────────────

// Spent by role: chip 4; control and row 6; card, popover and sheet 8 (a
// centred sheet too); `full` only on dots, avatars and the pill chip or
// status.
// Density-invariant: a radius names the role, not the size.
export const RADIUS_ROLES = [
	"chip",
	"control",
	"row",
	"card",
	"popover",
	"sheet",
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
	full: 9999,
};

// One hairline width for region edges, row splits and field boundaries. The
// focus ring is `ring`, drawn outside the box at an offset so it never
// covers the control's own edge; inside a list it is drawn inward.
export const HAIRLINE_PX = 1;
export const RING_PX = 2;
export const RING_OFFSET_PX = 2;

// The measure of a short label (a chip's, a status word, a skeleton label's
// lane), the widths of lifted layers, each at its pattern's range (a layer
// never stretches to its container), the one measure for running text, and
// the fixed regions of a frame (the sidebar, a split's list column and record
// pane, a board column, the auth column, an empty state's column).
// A width name never repeats a size name: `max-w-*` reads `--spacing-*` first.
export const WIDTHS = [
	"measure-short",
	"popover",
	"toast",
	"dialog",
	"sheet",
	"measure",
	"sidebar",
	"list",
	"pane",
	"column",
	"auth",
	"empty",
] as const;
export type Width = (typeof WIDTHS)[number];

// The widths counted in characters of the label's own font: `ch` on the
// web; native draws them in px at `SANS_ADVANCE` of the touch body size,
// rounded up to the pixel.
export const MEASURES = ["measure-short", "measure"] as const;
export type Measure = (typeof MEASURES)[number];

export const MEASURE_CHARACTERS: Record<Measure, number> = {
	"measure-short": 18,
	measure: 58,
};

export const WIDTH_VALUE: Record<Width, string> = {
	"measure-short": `${MEASURE_CHARACTERS["measure-short"]}ch`,
	popover: "240px",
	toast: "360px",
	dialog: "520px",
	sheet: "640px",
	measure: `${MEASURE_CHARACTERS.measure}ch`,
	sidebar: "240px",
	list: "360px",
	pane: "320px",
	column: "300px",
	auth: "400px",
	empty: "320px",
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
// tight contact shadow plus a soft ambient one, tinted with the cast in
// light; in dark the lift is carried by the raised step and the hairline,
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

// ── Stacking order ──────────────────────────────────────────────────

// The layers over the page, lowest first, each one step above the one before
// it and the first one step above the page's own (the root's 0): a sheet with
// its scrim, a popover over it (a picker's list opened from a sheet's field),
// and the toasts over both, so a toast raised while a sheet or a confirm is
// open is seen and its dismiss pressed. A stacking order inside one component
// is its own structural class, never a layer. (The roster's `LAYERS` are the
// component tiers, a different concept.)
export const STACK_ORDER = ["sheet", "popover", "toasts"] as const;

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
// live: the roles name their weights, and the ownership rule keeps a numeric
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

// The stacks each family falls back to on both platforms, after the knob's
// family and its metric fallback face.
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
	"running",
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
	"download",
	"back",
	"close",
	"cancel",
	"dismiss",
	"more",
	"send",
	"stop",
	"attach",
	"search",
	"loading",
	"checking",
	"retry",
	"saving",
	"saved",
	"notSaved",
	"add",
	"remove",
	"edit",
	"details",
	"places",
	"notifications",
	"code",
	"added",
	"removed",
	"sort",
	"ascending",
	"descending",
	"time",
	"message",
	"seen",
	"unseen",
	"copyFailed",
	"latest",
	"missing",
	"chooseFile",
	"typeValue",
	"pickValue",
	"locked",
] as const;
export type WordKey = (typeof WORD_KEYS)[number];

// A word drawn with a number: `one` where the count is one, `other` at
// every other count, each spelling `{count}` where the number stands.
export const COUNTED_WORD_KEYS = ["earlierLines"] as const;
export type CountedWordKey = (typeof COUNTED_WORD_KEYS)[number];

export interface CountedWord {
	one: string;
	other: string;
}

// A word drawn with values: each spells its slots as `{name}` where the
// value stands, drawn through `filled()`.
export const SLOT_WORDS = {
	meterValue: ["value", "max"],
	meterOver: ["amount"],
	meterMark: ["name", "value"],
	linesAdded: ["count"],
	linesRemoved: ["count"],
	changed: ["before", "after"],
	wrongType: ["name", "types"],
	stepOf: ["at", "of"],
} as const satisfies Record<string, readonly string[]>;
export type SlotWordKey = keyof typeof SLOT_WORDS;
// `Object.keys` widens to `string`; the keys are the record's own.
export const SLOT_WORD_KEYS = Object.keys(SLOT_WORDS) as SlotWordKey[];

export type Words = Record<WordKey, string> &
	Record<CountedWordKey, CountedWord> &
	Record<SlotWordKey, string>;

export const ENGLISH: Words = {
	active: "Active",
	running: "Running",
	waiting: "Waiting",
	done: "Done",
	attention: "Attention",
	failed: "Failed",
	idle: "Idle",
	recommended: "Recommended",
	copy: "Copy",
	copied: "Copied",
	download: "Download",
	back: "Back",
	close: "Close",
	cancel: "Cancel",
	dismiss: "Dismiss",
	more: "More",
	send: "Send",
	stop: "Stop",
	attach: "Attach",
	search: "Search",
	loading: "Loading",
	checking: "Checking the code",
	retry: "Retry",
	saving: "Saving…",
	saved: "Saved",
	notSaved: "Not saved",
	add: "Add",
	remove: "Remove",
	edit: "Edit",
	details: "Details",
	places: "Places",
	notifications: "Notifications",
	code: "Code",
	added: "Added",
	removed: "Removed",
	sort: "Sort",
	ascending: "Ascending",
	descending: "Descending",
	time: "Time",
	message: "Message",
	seen: "Seen",
	unseen: "Not seen",
	copyFailed: "Couldn't copy",
	latest: "Latest",
	missing: "This no longer exists.",
	chooseFile: "Choose file",
	typeValue: "Type a value",
	pickValue: "Pick a field",
	locked: "Locked",
	earlierLines: {
		one: "Show {count} earlier line",
		other: "Show {count} earlier lines",
	},
	meterValue: "{value} of {max}",
	meterOver: "{amount} over",
	meterMark: "{name} at {value}",
	linesAdded: "{count} added",
	linesRemoved: "{count} removed",
	changed: "from {before} to {after}",
	wrongType: "{name} isn't one of {types}",
	stepOf: "Step {at} of {of}",
};

// A slot word with its values: `filled(words.meterValue, { value, max })`.
export function filled(word: string, values: Record<string, string>): string {
	return word.replace(
		/\{(\w+)\}/g,
		(slot, name: string) => values[name] ?? slot,
	);
}

// A counted word at a count: `counted(words.earlierLines, 3)`.
export function counted(word: CountedWord, count: number): string {
	return (count === 1 ? word.one : word.other).replace(
		"{count}",
		String(count),
	);
}
