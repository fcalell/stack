// The variant matrices as data. A cva hides its config at runtime, so each
// matrix is declared here and `#variants` builds the cva from it: the harness
// then walks the same object the cva reads and no enumeration can drift from
// the matrix it describes. Internal to the package, with no subpath export.
//
// Every cell is a class both a web and a native renderer can take: fills,
// borders, ink, spacing roles, radius, type role, weight, family, a control's
// size. Display, alignment and every interaction state stay with the plugins.
//
// The text matrices are the Stage 1 port. Every other matrix is carried on
// the new vocabulary until Stage 2 replaces it, component by component, with
// the class strings of its approved artboard.

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
				"text-display leading-display tracking-display font-medium text-ink-body",
			title:
				"text-title leading-title tracking-title font-semibold text-ink-body",
			heading:
				"text-heading leading-heading tracking-heading font-semibold text-ink-body",
			body: "text-body leading-body font-normal text-ink-body",
			meta: "text-meta leading-meta font-normal text-ink-meta",
			caption:
				"text-caption leading-caption tracking-caption font-normal text-ink-meta",
			code: "text-code leading-code font-normal text-ink-body font-mono",
		},
	},
	defaultVariants: { role: "body" },
});

// Emphasis inside a line: weight 500, never a size. `display`, `title` and
// `heading` already sit at or above it.
export const TEXT_STRONG = matrix({
	base: "",
	variants: {
		role: {
			display: "",
			title: "",
			heading: "",
			body: "font-medium",
			meta: "font-medium",
			caption: "font-medium",
			code: "font-medium",
		},
	},
});

// ── Button ──────────────────────────────────────────────────────────

// `act` is the button's kind: the primary act is the accent fill, the
// secondary a hairline on the surface, the destructive one the same with
// its label in `danger`. `fit` is its container's: a control in the body,
// compact in a top bar. min-h, never h: the label must be able to grow the
// control under OS font scaling.
export const BUTTON = matrix({
	base: "rounded-control gap-inside px-control-x",
	variants: {
		act: {
			primary: "bg-act-accent",
			secondary: "border border-edge",
			destructive: "border border-edge",
		},
		fit: {
			body: "min-h-control",
			bar: "min-h-control-compact",
		},
	},
	defaultVariants: { act: "primary", fit: "body" },
});

export const BUTTON_LABEL = matrix({
	base: "font-medium text-body leading-body",
	variants: {
		act: {
			primary: "text-on-act-accent",
			secondary: "text-ink-body",
			destructive: "text-danger",
		},
	},
	defaultVariants: { act: "primary" },
});

// ── Status ──────────────────────────────────────────────────────────

export const STATUS = matrix({
	base: "text-meta leading-meta font-medium gap-inside",
	variants: {
		state: {
			active: "text-accent-ink",
			waiting: "text-ink-meta",
			done: "text-ok",
			attention: "text-warn",
			failed: "text-danger",
			idle: "text-ink-meta",
		},
	},
});

// ── Chip ────────────────────────────────────────────────────────

// A data value's tag: its family's soft ground under the family's ink, so
// the family is learnable across screens and never mistaken for a status.
export const CHIP = matrix({
	base: "rounded-full px-inside min-h-chip text-caption leading-caption tracking-caption font-normal",
	variants: {
		family: {
			red: "bg-chip-red-soft text-chip-red-ink",
			amber: "bg-chip-amber-soft text-chip-amber-ink",
			green: "bg-chip-green-soft text-chip-green-ink",
			teal: "bg-chip-teal-soft text-chip-teal-ink",
			violet: "bg-chip-violet-soft text-chip-violet-ink",
			pink: "bg-chip-pink-soft text-chip-pink-ink",
		},
	},
});

// ── Field ───────────────────────────────────────────────────────────

// A typing control's surface: white with the hairline as its boundary (the
// approved answer B), `edge-strong` under the pointer, `danger` on error.
export const FIELD = matrix({
	base: "border bg-surface px-control-x text-ink-body",
	variants: {
		kind: {
			text: "rounded-control min-h-field text-body leading-body",
			search: "rounded-control min-h-control text-body leading-body",
			code: "rounded-control min-h-field text-code leading-code font-mono",
		},
		state: {
			default: "border-edge",
			focused: "border-edge",
			error: "border-edge-error",
		},
	},
	defaultVariants: { kind: "text", state: "default" },
});

// ── One-time code ───────────────────────────────────────────────

export const OTP_BOX = matrix({
	base: "rounded-control border bg-surface min-h-field min-w-field",
	variants: {
		state: {
			default: "border-edge",
			focused: "border-edge",
			error: "border-edge-error",
		},
	},
	defaultVariants: { state: "default" },
});

// ── Row ─────────────────────────────────────────────────────────────

// A row in a group or a list: pressed under the press wash, selected under
// the selection wash.
export const ROW = matrix({
	base: "min-h-row px-control-x gap-inside",
	variants: {
		state: {
			rest: "",
			pressed: "bg-wash-press",
			selected: "bg-wash-selected",
		},
	},
	defaultVariants: { state: "rest" },
});

// ── Table ───────────────────────────────────────────────────────────

export const TABLE_ROW = matrix({
	base: "border-b border-edge",
	variants: {
		state: { rest: "", selected: "bg-wash-selected" },
	},
	defaultVariants: { state: "rest" },
});

// ── Switch and checkbox ─────────────────────────────────────────────

export const SWITCH = matrix({
	base: "rounded-full",
	variants: { state: { off: "bg-switch-off", on: "bg-switch-on" } },
	defaultVariants: { state: "off" },
});

export const CHECKBOX = matrix({
	base: "rounded-chip",
	variants: {
		state: {
			unchecked: "border border-edge-strong",
			checked: "bg-accent",
		},
	},
	defaultVariants: { state: "unchecked" },
});

// ── Segmented control ───────────────────────────────────────────────

export const SEGMENT = matrix({
	base: "rounded-control min-h-control-compact px-control-x text-body leading-body font-medium",
	variants: {
		state: { idle: "text-ink-meta", selected: "bg-surface text-ink-body" },
	},
	defaultVariants: { state: "idle" },
});

// ── Banner ──────────────────────────────────────────────────────────

export const BANNER = matrix({
	base: "rounded-card px-card py-pair gap-inside text-body leading-body text-ink-body",
	variants: {
		kind: {
			note: "bg-accent-soft",
			warn: "bg-warn-soft",
			danger: "bg-danger-soft",
		},
	},
	defaultVariants: { kind: "note" },
});

// ── Toast ───────────────────────────────────────────────────────

export const TOAST_STATE = matrix({
	base: "",
	variants: {
		state: {
			done: "bg-ok-soft text-ink-body",
			attention: "bg-warn-soft text-ink-body",
			failed: "bg-danger-soft text-ink-body",
		},
	},
});

// ── Diff ────────────────────────────────────────────────────────────

export const DIFF_LINE = matrix({
	base: "text-code leading-code font-mono text-ink-body",
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
			you: "rounded-card bg-group px-card py-pair",
			other: "",
			system: "text-meta leading-meta text-ink-meta",
		},
	},
});

// ── Avatar ──────────────────────────────────────────────────────────

export const AVATAR = matrix({
	base: "rounded-full size-avatar",
	variants: {
		step: {
			"1": "bg-avatar-1 text-avatar-1-ink",
			"2": "bg-avatar-2 text-avatar-2-ink",
			"3": "bg-avatar-3 text-avatar-3-ink",
			"4": "bg-avatar-4 text-avatar-4-ink",
			"5": "bg-avatar-5 text-avatar-5-ink",
			"6": "bg-avatar-6 text-avatar-6-ink",
			"7": "bg-avatar-7 text-avatar-7-ink",
			"8": "bg-avatar-8 text-avatar-8-ink",
		},
	},
});

// ── Place ───────────────────────────────────────────────────────────

// A place in the tab bar or the sidebar: the selected one is inked accent.
export const PLACE = matrix({
	base: "text-body leading-body font-medium",
	variants: {
		state: { idle: "text-ink-meta", selected: "text-accent-ink" },
	},
	defaultVariants: { state: "idle" },
});

// ── Rhythm ──────────────────────────────────────────────────────────

// The gap a container puts between its children. Every cell is exactly
// `gap-<role>`, a shape the harness pins, so the role mapping lives here
// once.
export const RHYTHM = matrix({
	base: "",
	variants: {
		unit: {
			inside: "gap-inside",
			pair: "gap-pair",
			rows: "gap-rows",
			fields: "gap-fields",
			sections: "gap-sections",
		},
	},
});
