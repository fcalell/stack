// The variant matrices as data. A cva hides its config at runtime, so each
// matrix is declared here and `#variants` builds the cva from it: the harness
// then walks the same object the cva reads and no enumeration can drift from
// the matrix it describes. Internal to the package, with no subpath export.
//
// Every cell is a class both a web and a native renderer can take: fills,
// borders, ink, spacing roles, radius, type role, weight, family, a control's
// size. Display, alignment and every interaction state stay with the plugins.
//
// The text matrices are the Stage 1 port. The atoms' and the layout
// molecules' matrices are the class strings of their approved artboards
// (`plugins/react-ui/design/1*-*.dc.html`, `3*-*.dc.html`), the states and
// the layout recorded beside them in the overlay notes
// (`.helm/research/design-system/atoms-overlays.md`, `layout-overlays.md`).
// Every other matrix is carried on the new vocabulary until its artboard
// replaces it.

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

// The role is the only way to set type; its ink, family and figures ride
// with it.
// Every cell is spelled out: Tailwind reads source text, so a cell built from
// a template would compile to nothing in a consumer build. c19 pins each cell
// to TYPE_SCALE, so the two cannot drift.
export const TEXT = matrix({
	base: "",
	variants: {
		role: {
			display:
				"text-display leading-display tracking-display font-medium text-ink-body tabular-nums",
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

// ── Icon ────────────────────────────────────────────────────────────

// `fit` is what the icon sits beside: meta or caption text, body text, or
// the inside of a control. Its ink is the place's (currentColor on the web).
export const ICON = matrix({
	base: "",
	variants: {
		fit: {
			meta: "size-icon-meta",
			body: "size-icon",
			control: "size-icon-control",
		},
	},
	defaultVariants: { fit: "body" },
});

// ── Button ──────────────────────────────────────────────────────────

// `act` is the button's kind: `primary` the accent fill (one per screen),
// `danger` the danger fill (a confirm's one filled act), `secondary` a
// hairline with no fill, `destructive` the hairline with its label in
// `danger`. `fit` is its container's: a body control, compact in a
// bar, or full width at a field's height under the field it submits. min-h,
// never h: the label must be able to grow the control under OS font scaling.
// The fill carries the act's ink for the web's glyph and spinner
// (currentColor); the label repeats it, since a native Text inherits none.
export const BUTTON = matrix({
	base: "gap-inside rounded-control px-control-x",
	variants: {
		act: {
			primary: "bg-act-accent text-on-act-accent",
			danger: "bg-act-danger text-on-act-danger",
			secondary: "border border-edge text-ink-body",
			destructive: "border border-edge text-danger",
		},
		fit: {
			body: "min-h-control",
			bar: "min-h-control-compact",
			field: "min-h-field w-full",
		},
	},
	defaultVariants: { act: "primary", fit: "body" },
});

export const BUTTON_LABEL = matrix({
	base: "text-body leading-body font-medium",
	variants: {
		act: {
			primary: "text-on-act-accent",
			danger: "text-on-act-danger",
			secondary: "text-ink-body",
			destructive: "text-danger",
		},
	},
	defaultVariants: { act: "primary" },
});

// An icon-only act: square, no boundary at rest, in the meta ink. `field`
// sits inside a field's end, at the compact square.
export const ICON_BUTTON = matrix({
	base: "rounded-control text-ink-meta",
	variants: {
		fit: {
			body: "size-control",
			bar: "size-control-compact",
			field: "size-control-compact",
		},
	},
	defaultVariants: { fit: "body" },
});

// ── Link ────────────────────────────────────────────────────────────

// Accent ink at 500 in the type of the line it sits in. `inline` is
// underlined at rest; `standalone` stands on the target height.
export const LINK = matrix({
	base: "font-medium text-accent-ink",
	variants: {
		fit: {
			inline: "underline",
			standalone: "min-h-target",
		},
	},
	defaultVariants: { fit: "inline" },
});

// ── Avatar ──────────────────────────────────────────────────────────

// The step's fill under its initials; the image form draws the base alone.
export const AVATAR = matrix({
	base: "rounded-full size-avatar",
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

export const AVATAR_LABEL = matrix({
	base: "text-caption leading-caption tracking-caption font-medium",
	variants: {
		step: {
			"1": "text-avatar-1-ink",
			"2": "text-avatar-2-ink",
			"3": "text-avatar-3-ink",
			"4": "text-avatar-4-ink",
			"5": "text-avatar-5-ink",
			"6": "text-avatar-6-ink",
			"7": "text-avatar-7-ink",
			"8": "text-avatar-8-ink",
		},
	},
});

// ── Status ──────────────────────────────────────────────────────────

// The status colour is the dot's alone; the word is meta ink in every
// state. `idle` is the hollow dot, so it reads apart from `waiting`.
export const STATUS_DOT = matrix({
	base: "size-dot rounded-full",
	variants: {
		state: {
			active: "bg-accent-ink",
			waiting: "bg-ink-meta",
			done: "bg-ok",
			attention: "bg-warn",
			failed: "bg-danger",
			idle: "border border-ink-meta",
		},
	},
});

// ── Chip ────────────────────────────────────────────────────────────

// A data value's tag: its family's soft ground under the family's ink, so
// the family is learnable across screens and never mistaken for a status.
// `trailing` is what closes its right end: its own padding, or the remove
// act's round hit box. The fill carries the ink for the web's remove glyph;
// the label repeats it, since a native Text inherits none.
export const CHIP = matrix({
	base: "rounded-full min-h-chip",
	variants: {
		family: {
			red: "bg-chip-red-soft text-chip-red-ink",
			amber: "bg-chip-amber-soft text-chip-amber-ink",
			green: "bg-chip-green-soft text-chip-green-ink",
			teal: "bg-chip-teal-soft text-chip-teal-ink",
			violet: "bg-chip-violet-soft text-chip-violet-ink",
			pink: "bg-chip-pink-soft text-chip-pink-ink",
			neutral: "bg-chip-neutral-soft text-chip-neutral-ink",
		},
		trailing: {
			none: "px-inside",
			remove: "pl-inside",
		},
	},
	defaultVariants: { trailing: "none" },
});

// Bounded, so a long chip truncates before the row's title does.
export const CHIP_LABEL = matrix({
	base: "max-w-chip-label text-caption leading-caption tracking-caption font-normal",
	variants: {
		family: {
			red: "text-chip-red-ink",
			amber: "text-chip-amber-ink",
			green: "text-chip-green-ink",
			teal: "text-chip-teal-ink",
			violet: "text-chip-violet-ink",
			pink: "text-chip-pink-ink",
			neutral: "text-chip-neutral-ink",
		},
	},
});

// ── Field ───────────────────────────────────────────────────────────

// A typing control's box: the surface with the hairline as its boundary,
// `edge-error` in error. `kind` sets its height (a search box stands at the
// control's, in a toolbar), `trailing` its right inset (an in-field act
// sits `inside` from the edge).
export const FIELD = matrix({
	base: "gap-inside rounded-control border bg-surface",
	variants: {
		kind: {
			text: "min-h-field",
			code: "min-h-field",
			search: "min-h-control-compact",
		},
		trailing: {
			none: "px-control-x",
			act: "pl-control-x pr-inside",
		},
		state: {
			rest: "border-edge",
			error: "border-edge-error",
		},
	},
	defaultVariants: { kind: "text", trailing: "none", state: "rest" },
});

// The value a field holds, typed or chosen: body, or mono code.
export const FIELD_VALUE = matrix({
	base: "",
	variants: {
		kind: {
			text: "text-body leading-body font-normal text-ink-body",
			code: "text-code leading-code font-normal font-mono text-ink-body",
			search: "text-body leading-body font-normal text-ink-body",
		},
	},
	defaultVariants: { kind: "text" },
});

// Many lines: the box grows with its value and stacks the budget under it.
export const TEXT_AREA = matrix({
	base: "gap-rows rounded-control border px-control-x py-inside bg-surface",
	variants: {
		state: {
			rest: "border-edge",
			error: "border-edge-error",
		},
	},
	defaultVariants: { state: "rest" },
});

// The word budget's counter, in the error ink once over it.
export const TEXT_AREA_BUDGET = matrix({
	base: "text-caption leading-caption tracking-caption font-normal tabular-nums",
	variants: {
		state: {
			rest: "text-ink-meta",
			error: "text-ink-error",
		},
	},
	defaultVariants: { state: "rest" },
});

// ── One-time code ───────────────────────────────────────────────────

// One box per digit; the row is one input and one target. `otp` is the
// box's largest side: it stands at that size and shrinks, square, when its
// row is narrower than the boxes.
export const OTP_BOX = matrix({
	base: "w-otp min-w-0 shrink aspect-square rounded-control border bg-surface",
	variants: {
		state: {
			rest: "border-edge",
			error: "border-edge-error",
		},
	},
	defaultVariants: { state: "rest" },
});

// ── Switch and checkbox ─────────────────────────────────────────────

// `on` draws `toggle-on`, the fill the checkbox and the slider share.
export const SWITCH = matrix({
	base: "p-switch-inset w-switch-w h-switch-h rounded-full",
	variants: { state: { off: "bg-switch-off", on: "bg-toggle-on" } },
	defaultVariants: { state: "off" },
});

// The on thumb sits at the far end by transform, the one thing a toggle
// animates.
export const SWITCH_THUMB = matrix({
	base: "size-thumb rounded-full bg-switch-thumb",
	variants: { state: { off: "", on: "translate-x-switch-travel" } },
	defaultVariants: { state: "off" },
});

export const CHECKBOX = matrix({
	base: "size-check rounded-chip",
	variants: {
		state: {
			unchecked: "border border-edge-strong bg-surface",
			checked: "bg-toggle-on",
			mixed: "bg-toggle-on",
		},
	},
	defaultVariants: { state: "unchecked" },
});

// ── Row ─────────────────────────────────────────────────────────────

// A row in a group, a list or a popover: highlighted (the keyboard's or the
// pointer's current option) under the hover wash, pressed under the press
// wash, selected under the selection wash. `ground` is what holds it: a
// list or a popover insets it as a rounded wash (the option row of the
// approved Select frame), a group runs it edge to edge at the card's inset,
// the group drawing the hairline between its rows.
export const ROW = matrix({
	base: "min-h-row gap-inside",
	variants: {
		state: {
			rest: "",
			highlighted: "bg-wash-hover",
			pressed: "bg-wash-press",
			selected: "bg-wash-selected",
		},
		ground: {
			list: "px-control-x rounded-row",
			group: "px-card",
		},
	},
	defaultVariants: { state: "rest", ground: "list" },
});

// ── Table ───────────────────────────────────────────────────────────

export const TABLE_ROW = matrix({
	base: "border-b border-edge",
	variants: {
		state: { rest: "", selected: "bg-wash-selected" },
	},
	defaultVariants: { state: "rest" },
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

// ── Place ───────────────────────────────────────────────────────────

// Navigation keeps the accent out: a place is selected by a grey fill in the
// sidebar and by ink alone in the tab bar.

// A place in the sidebar: the row under its state's wash; the label is
// `TEXT.body` in every state.
export const PLACE_ROW = matrix({
	base: "gap-inside min-h-row px-control-x rounded-row",
	variants: {
		state: {
			rest: "",
			hover: "bg-wash-hover",
			active: "bg-wash-press",
			selected: "bg-wash-selected",
			"selected-hover": "bg-wash-selected-hover",
		},
	},
	defaultVariants: { state: "rest" },
});

// The sidebar place's glyph: the meta ink until the place is selected.
export const PLACE_ROW_GLYPH = matrix({
	base: "",
	variants: {
		state: { rest: "text-ink-meta", selected: "text-ink-body" },
	},
	defaultVariants: { state: "rest" },
});

// A place in the tab bar: glyph over label, the box carrying the tab's ink
// for the glyph inside it (currentColor on the web) and the label caption
// repeating it, since a native Text inherits none. The box keeps no side
// inset, so its label takes the tab's whole share of the bar.
export const PLACE_TAB = matrix({
	base: "gap-rows min-h-row rounded-row",
	variants: {
		state: { idle: "text-ink-meta", selected: "text-ink-body" },
	},
	defaultVariants: { state: "idle" },
});

// The selected tab's label steps to 500: ink alone is the only other cue.
export const PLACE_TAB_LABEL = matrix({
	base: "text-caption leading-caption tracking-caption",
	variants: {
		state: {
			idle: "font-normal text-ink-meta",
			selected: "font-medium text-ink-body",
		},
	},
	defaultVariants: { state: "idle" },
});

// ── Split ───────────────────────────────────────────────────────────

// The record beside the list: its sections apart at the page inset, or, with
// nothing open, the empty state alone at the inset.
export const SPLIT_MAIN = matrix({
	base: "",
	variants: {
		state: {
			rest: "gap-sections p-page",
			empty: "p-page",
		},
	},
	defaultVariants: { state: "rest" },
});

// ── Section ─────────────────────────────────────────────────────────

// A section's rhythm follows where it sits: on a page (over a Group, a List,
// a column's cards) the head sits over the body and the body's children
// stack at the pair rhythm; in a form both are the fields rhythm. The same
// cell spaces the section (head to body) and its body (child to child).
export const SECTION = matrix({
	base: "",
	variants: {
		in: {
			page: "gap-pair",
			form: "gap-fields",
		},
	},
	defaultVariants: { in: "page" },
});

// ── Form ────────────────────────────────────────────────────────────

// The rhythm between a form's children: fields apart, or sections apart when
// it holds sections (each section's fields then at the fields rhythm).
export const FORM = matrix({
	base: "",
	variants: {
		holds: {
			fields: "gap-fields",
			sections: "gap-sections",
		},
	},
	defaultVariants: { holds: "fields" },
});

// ── Action bar ──────────────────────────────────────────────────────

// The acts row over a blocked act's reason. `fit` is where the bar stands:
// at the end of its container at the acts' natural width, or across it with
// each act at the field's height. The two differ only in structure (a
// platform overlay) and in the `Button` fit the bar passes, so neither
// carries a cell.
export const ACTION_BAR = matrix({
	base: "gap-pair",
	variants: {
		fit: {
			end: "",
			full: "",
		},
	},
	defaultVariants: { fit: "end" },
});

// ── Skeleton ────────────────────────────────────────────────────────

// What a loading form draws in place of a part: a text line (a fraction
// width, a web overlay, stands it at its text's length) or the atom it
// stands in for, at that atom's size.
export const SKELETON = matrix({
	base: "",
	variants: {
		kind: {
			line: "h-skeleton rounded-chip bg-skeleton",
			avatar: "size-avatar rounded-full bg-skeleton",
			switch: "w-switch-w h-switch-h rounded-full bg-skeleton",
			count: "min-h-chip min-w-chip rounded-full bg-skeleton",
			field: "min-h-field rounded-control bg-skeleton",
		},
	},
	defaultVariants: { kind: "line" },
});

// A loading row at the height of the row it stands in for: a two-line list
// row, a group's setting row, or a form's field (a label line
// over the field's box at the label's gap).
export const SKELETON_ROW = matrix({
	base: "",
	variants: {
		kind: {
			"two-line": "gap-inside min-h-row-2 px-control-x",
			setting: "gap-fields min-h-row-setting px-card py-pair",
			field: "gap-pair",
		},
	},
	defaultVariants: { kind: "two-line" },
});
