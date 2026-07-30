// The variant matrices as data. A cva hides its config at runtime, so each
// matrix is declared here and `#variants` builds the cva from it: the harness
// then walks the same object the cva reads and no enumeration can drift from
// the matrix it describes. Internal to the package, with no subpath export.
//
// Every cell is a class both a web and a native renderer can take: fills,
// borders, ink, rungs, radius, type role, font weight, control minimum height.
// Display, alignment, font family and every interaction state stay with the
// plugins.

export type Axes = Record<string, Record<string, string>>;

export interface Matrix<T extends Axes> {
	base: string;
	variants: T;
	compoundVariants?: Array<{ [K in keyof T]?: keyof T[K] } & { class: string }>;
	defaultVariants?: { [K in keyof T]?: keyof T[K] };
}

// Identity, for the contextual typing: it keeps each cell key literal so a
// compound row or a default naming an absent key fails to compile.
function matrix<T extends Axes>(config: Matrix<T>): Matrix<T> {
	return config;
}

// ── Button ──────────────────────────────────────────────────────────

// Two orthogonal axes: `emphasis` is action importance, `tone` is consequence.
// All six cells are spelled out so a reader sees which ones are deliberately
// empty and the matrix cannot drift.
export const BUTTON = matrix({
	base: "gap-row rounded-control",
	variants: {
		emphasis: {
			primary: "",
			secondary: "border bg-transparent",
			tertiary: "bg-transparent",
		},
		tone: { neutral: "", danger: "" },
		// min-h, never h: the label must be able to grow the control under OS
		// font scaling instead of clipping inside a pinned height.
		size: {
			sm: "min-h-11 px-3.5 py-1.5",
			md: "min-h-11 px-4 py-2",
			lg: "min-h-12 px-6 py-2.5",
		},
	},
	compoundVariants: [
		{ emphasis: "primary", tone: "neutral", class: "bg-accent" },
		{ emphasis: "primary", tone: "danger", class: "bg-danger" },
		{ emphasis: "secondary", tone: "neutral", class: "border-edge-2" },
		{ emphasis: "secondary", tone: "danger", class: "border-danger" },
		{ emphasis: "tertiary", tone: "neutral", class: "" },
		{ emphasis: "tertiary", tone: "danger", class: "" },
	],
	defaultVariants: { emphasis: "primary", tone: "neutral", size: "md" },
});

export const BUTTON_LABEL = matrix({
	base: "font-semibold",
	variants: {
		emphasis: { primary: "", secondary: "", tertiary: "" },
		tone: { neutral: "", danger: "" },
		size: { sm: "text-caption", md: "text-callout", lg: "text-body" },
	},
	compoundVariants: [
		{ emphasis: "primary", tone: "neutral", class: "text-accent-ink" },
		{ emphasis: "primary", tone: "danger", class: "text-danger-ink" },
		{ emphasis: "secondary", tone: "neutral", class: "text-ink-1" },
		{ emphasis: "secondary", tone: "danger", class: "text-danger" },
		{ emphasis: "tertiary", tone: "neutral", class: "text-ink-1" },
		{ emphasis: "tertiary", tone: "danger", class: "text-danger" },
	],
	defaultVariants: { emphasis: "primary", tone: "neutral", size: "md" },
});

// Muted chrome for a true disabled. A transparent tertiary mutes through its
// label alone, which is why its cell is empty.
export const BUTTON_MUTED = matrix({
	base: "",
	variants: {
		emphasis: {
			primary: "bg-surface-3",
			secondary: "border-edge",
			tertiary: "",
		},
	},
});

// ── Text ────────────────────────────────────────────────────────────

// `rowtitle` composes the `body` size at a heavier weight.
export const TEXT = matrix({
	base: "",
	variants: {
		variant: {
			display: "text-display font-bold tracking-display leading-display",
			h1: "text-h1 font-bold tracking-h1 leading-h1",
			h2: "text-h2 font-semibold tracking-h2 leading-h2",
			h3: "text-h3 font-semibold tracking-h3 leading-h3",
			body: "text-body font-medium leading-body",
			callout: "text-callout font-bold leading-callout",
			caption: "text-caption font-medium leading-caption",
			micro: "text-micro font-medium leading-micro tracking-micro",
			rowtitle: "text-body font-semibold leading-body",
		},
		tone: {
			"ink-1": "text-ink-1",
			"ink-2": "text-ink-2",
			"ink-3": "text-ink-3",
			"ink-4": "text-ink-4",
			brand: "text-brand",
			interactive: "text-interactive",
			ok: "text-ok",
			warn: "text-warn",
			danger: "text-danger",
			"accent-ink": "text-accent-ink",
			"oncover-fg": "text-oncover-fg",
			"oncover-ink": "text-oncover-ink",
		},
	},
});

// `strong` lifts a role one weight step. `display`, `h1` and `callout` already
// carry their peak weight, so their cells are empty.
export const TEXT_STRONG = matrix({
	base: "",
	variants: {
		variant: {
			display: "",
			h1: "",
			h2: "font-bold",
			h3: "font-bold",
			body: "font-semibold",
			callout: "",
			caption: "font-semibold",
			micro: "font-semibold",
			rowtitle: "font-bold",
		},
	},
});

// ── Badge ───────────────────────────────────────────────────────────

export const BADGE = matrix({
	base: "rounded-full px-2.5 py-1",
	variants: {
		tone: {
			neutral: "bg-surface-2",
			brand: "bg-brand-soft",
			interactive: "bg-interactive-soft",
			ok: "bg-ok-soft",
			warn: "bg-warn-soft",
			danger: "bg-danger-soft",
			oncover: "bg-oncover-surface",
		},
	},
	defaultVariants: { tone: "neutral" },
});

export const BADGE_LABEL = matrix({
	base: "",
	variants: {
		tone: {
			neutral: "text-ink-1",
			brand: "text-brand",
			interactive: "text-interactive",
			ok: "text-ok",
			warn: "text-warn",
			danger: "text-danger",
			oncover: "text-oncover-ink",
		},
	},
	defaultVariants: { tone: "neutral" },
});

// The dot carries the tone as a mark, so `warn` rides `warn-mark` for the 3:1
// non-text floor while the label above it keeps the AA `warn` ink.
export const BADGE_DOT = matrix({
	base: "",
	variants: {
		tone: {
			neutral: "bg-ink-1",
			brand: "bg-brand",
			interactive: "bg-interactive",
			ok: "bg-ok",
			warn: "bg-warn-mark",
			danger: "bg-danger",
			oncover: "bg-oncover-ink",
		},
	},
	defaultVariants: { tone: "neutral" },
});

// ── Card ────────────────────────────────────────────────────────────

// `overflow-hidden` clips the corners. RN renders the `shadow-1` lift on a
// layer outside that clip, so fill, clip and shadow ride one view.
export const CARD = matrix({
	base: "overflow-hidden rounded-xl bg-surface shadow-1",
	variants: {
		padding: { card: "p-card", none: "" },
		ring: { none: "", warn: "border-2 border-warn-mark" },
	},
	defaultVariants: { padding: "card", ring: "none" },
});

// ── Field ───────────────────────────────────────────────────────────

// The two layouts gap differently on purpose: an input packs its leading media
// at `row` (8px), a trigger row breathes at `stack` (12px).
export const FIELD = matrix({
	base: "rounded-control border bg-surface px-3.5",
	variants: {
		state: {
			default: "border-edge",
			focused: "border-ink-1",
			error: "border-danger",
		},
		layout: { input: "gap-row min-h-12", row: "gap-stack py-2" },
	},
	defaultVariants: { state: "default", layout: "input" },
});
