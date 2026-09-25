// The variant matrices as data. A cva hides its config at runtime, so each
// matrix is declared here and `#variants` builds the cva from it: the harness
// then walks the same object the cva reads and no enumeration can drift from
// the matrix it describes. Internal to the package, with no subpath export.
//
// Every cell is a class both a web and a native renderer can take: fills,
// borders, ink, rungs, radius, type role, weight, family, control minimum
// size. Display, alignment and every interaction state stay with the plugins.

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

// ── Text ────────────────────────────────────────────────────────────

// The role is the only way to set type; its ink and family ride with it.
// Every cell is spelled out: Tailwind reads source text, so a cell built from
// a template would compile to nothing in a consumer build. c19 pins each cell
// to TYPE_SCALE, so the two cannot drift.
export const TEXT = matrix({
	base: "",
	variants: {
		role: {
			display:
				"text-display leading-display tracking-display font-bold text-ink",
			title: "text-title leading-title tracking-title font-bold text-ink",
			heading:
				"text-heading leading-heading tracking-heading font-semibold text-ink",
			body: "text-body leading-body font-normal text-ink",
			meta: "text-meta leading-meta font-normal text-ink-meta",
			label: "text-label leading-label font-medium text-ink-meta",
			mono: "text-mono leading-mono font-normal text-ink font-mono",
		},
	},
	defaultVariants: { role: "body" },
});

// One step up per role, for a row's title and a definition's label.
// `display`, `title` and `heading` already carry their peak weight.
export const TEXT_STRONG = matrix({
	base: "",
	variants: {
		role: {
			display: "",
			title: "",
			heading: "font-bold",
			body: "font-medium",
			meta: "font-medium",
			label: "font-semibold",
			mono: "font-medium",
		},
	},
});

// ── Button ──────────────────────────────────────────────────────────

// `act` is the button's kind: the primary act is filled, the other two sit on
// the group fill and differ by their label's ink. `fit` is its container's:
// 44 px in the body, compact in a top bar, where the plugin keeps the 44 px
// hit area around the smaller pill. min-h, never h: the label must be able to
// grow the control under OS font scaling.
export const BUTTON = matrix({
	base: "rounded-full gap-row",
	variants: {
		act: {
			primary: "bg-accent",
			secondary: "bg-group",
			destructive: "bg-group",
		},
		fit: {
			body: "min-h-11 px-5 py-2",
			bar: "min-h-8 px-3.5 py-1",
		},
	},
	defaultVariants: { act: "primary", fit: "body" },
});

export const BUTTON_LABEL = matrix({
	base: "font-medium",
	variants: {
		act: {
			primary: "text-on-accent",
			secondary: "text-ink",
			destructive: "text-danger",
		},
		fit: {
			body: "text-body leading-body",
			bar: "text-meta leading-meta",
		},
	},
	defaultVariants: { act: "primary", fit: "body" },
});

// ── Status ──────────────────────────────────────────────────────────

export const STATUS = matrix({
	base: "text-meta leading-meta font-medium gap-pair",
	variants: {
		state: {
			active: "text-tint",
			waiting: "text-ink-meta",
			done: "text-ok",
			attention: "text-warn",
			failed: "text-danger",
			idle: "text-ink-faint",
		},
	},
});

// ── Field ───────────────────────────────────────────────────────────

// A typing control's surface. `search` is a pill, `text` takes the group
// radius, `code` is the same box in the mono role. The border is transparent
// at rest so focus and error change no geometry.
export const FIELD = matrix({
	base: "border bg-group px-4 text-ink",
	variants: {
		kind: {
			text: "rounded-group min-h-11 py-2 text-body leading-body",
			search: "rounded-full min-h-11 text-body leading-body",
			code: "rounded-group min-h-11 py-2 text-mono leading-mono font-mono",
		},
		state: {
			default: "border-transparent",
			focused: "border-tint",
			error: "border-danger",
		},
	},
	defaultVariants: { kind: "text", state: "default" },
});

// ── Row ─────────────────────────────────────────────────────────────

// A row in a group or a list: the touch floor, the group's inset, the rhythm
// between its atoms; pressed on `edge`, selected on `accent-soft`.
export const ROW = matrix({
	base: "min-h-11 px-inset py-stack gap-stack",
	variants: {
		state: { rest: "", pressed: "bg-edge", selected: "bg-accent-soft" },
	},
	defaultVariants: { state: "rest" },
});

// ── Switch and checkbox ─────────────────────────────────────────────

// The on fill is `accent` for both, so the two controls read as one family.
export const SWITCH = matrix({
	base: "rounded-full",
	variants: { state: { off: "bg-edge", on: "bg-accent" } },
	defaultVariants: { state: "off" },
});

export const CHECKBOX = matrix({
	base: "rounded-full",
	variants: {
		state: { unchecked: "border border-ink-faint", checked: "bg-accent" },
	},
	defaultVariants: { state: "unchecked" },
});

// ── Segmented control ───────────────────────────────────────────────

export const SEGMENT = matrix({
	base: "rounded-full min-h-9 px-3 text-meta leading-meta font-medium",
	variants: {
		state: { idle: "text-ink-meta", selected: "bg-surface text-ink" },
	},
	defaultVariants: { state: "idle" },
});

// ── Banner ──────────────────────────────────────────────────────────

export const BANNER = matrix({
	base: "px-inset py-stack gap-row text-meta leading-meta text-ink",
	variants: {
		kind: {
			note: "bg-accent-soft",
			warn: "bg-warn-soft",
			danger: "bg-danger-soft",
		},
	},
	defaultVariants: { kind: "note" },
});

// ── Diff ────────────────────────────────────────────────────────────

export const DIFF_LINE = matrix({
	base: "text-mono leading-mono font-mono text-ink",
	variants: {
		kind: {
			context: "",
			added: "bg-ok-soft",
			removed: "bg-danger-soft",
			header: "bg-group text-ink-meta",
		},
	},
	defaultVariants: { kind: "context" },
});

// ── Message ─────────────────────────────────────────────────────────

export const MESSAGE = matrix({
	base: "",
	variants: {
		author: {
			you: "rounded-sheet bg-group px-inset py-stack",
			other: "",
			system: "text-meta leading-meta text-ink-meta",
		},
	},
});

// ── Avatar ──────────────────────────────────────────────────────────

export const AVATAR = matrix({
	base: "rounded-full text-ink",
	variants: {
		step: {
			"1": "bg-avatar-1",
			"2": "bg-avatar-2",
			"3": "bg-avatar-3",
			"4": "bg-avatar-4",
			"5": "bg-avatar-5",
			"6": "bg-avatar-6",
			"7": "bg-avatar-7",
			"8": "bg-avatar-8",
		},
	},
});

// ── Place ───────────────────────────────────────────────────────────

// A place in the tab bar or the sidebar: the selected one is inked `accent`.
export const PLACE = matrix({
	base: "text-label leading-label font-medium",
	variants: { state: { idle: "text-ink-meta", selected: "text-accent" } },
	defaultVariants: { state: "idle" },
});

// ── Rhythm ──────────────────────────────────────────────────────────

// The gap a container bakes between its children. Every cell is exactly
// `gap-<rung>`, a shape the harness pins, so the rung mapping lives here once.
export const RHYTHM = matrix({
	base: "",
	variants: {
		unit: {
			pair: "gap-pair",
			row: "gap-row",
			stack: "gap-stack",
			inset: "gap-inset",
			section: "gap-section",
			room: "gap-room",
		},
	},
});
