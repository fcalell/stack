// The variant matrices as data. A cva hides its config at runtime, so each
// matrix is declared here and `#variants` builds the cva from it: the harness
// then walks the same object the cva reads and no enumeration can drift from
// the matrix it describes. Internal to the package, with no subpath export.
//
// Every cell is a class both a web and a native renderer can take: fills,
// borders, ink, spacing roles, radius, type role, weight, family, a control's
// size. Display, alignment and every interaction state stay with the plugins.
//
// Each plugin's overlay (the states and the layout a matrix leaves out) is
// recorded per component in the overlay notes
// (`.helm/research/design-system/atoms-overlays.md`, `layout-overlays.md`,
// `shared-overlays.md`, `content-overlays.md`).

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
			figure:
				"text-figure leading-figure font-medium text-ink-body tabular-nums",
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

// Emphasis inside a line: weight 500, never a size. `display`, `figure`,
// `title` and `heading` already sit at or above it.
export const TEXT_STRONG = matrix({
	base: "",
	variants: {
		role: {
			display: "",
			figure: "",
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
// `danger`, `quiet` words in the meta ink with no fill and no hairline (a
// resend, a skip). `fit` is its container's: a body control, compact in a
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
			quiet: "text-ink-meta",
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
			quiet: "text-ink-meta",
		},
	},
	defaultVariants: { act: "primary" },
});

// An icon-only act: square, no boundary at rest, in the meta ink. `field`
// sits inside a field's end, at the compact square, reaching across the box's
// border so a bar-fit box (the compact control's height, border included)
// holds it at its own height.
export const ICON_BUTTON = matrix({
	base: "rounded-control text-ink-meta",
	variants: {
		fit: {
			body: "size-control",
			bar: "size-control-compact",
			field: "size-control-compact -my-hairline",
		},
	},
	defaultVariants: { fit: "body" },
});

// ── Link ────────────────────────────────────────────────────────────

// Accent ink at 500 in the type of the line it sits in. `inline` is
// underlined at rest; `standalone` is not, and stands on the target height
// (`LINK_TARGET`).
export const LINK = matrix({
	base: "font-medium text-accent-ink",
	variants: {
		fit: {
			inline: "underline",
			standalone: "no-underline",
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
// `running` draws no dot: a spinner stands in its place (`STATUS_SPINNER`).
export const STATUS_DOT = matrix({
	base: "size-dot rounded-full",
	variants: {
		state: {
			active: "bg-accent-ink",
			waiting: "bg-ink-meta",
			done: "bg-ok",
			attention: "bg-chip-amber",
			failed: "bg-danger",
			idle: "border border-ink-meta",
		},
	},
});

// A row's change mark: its glyph in the kind's ink in a lane one icon wide.
// A marked row's lane stands ahead of its label, so the marked rows of a
// change set align; an unmarked row draws no lane. Added is `ok`, removed
// `danger`, changed and stale `warn` (told apart by their glyphs), unchanged
// the meta ink.
export const CHANGE_MARK = matrix({
	base: "size-icon",
	variants: {
		kind: {
			added: "text-ok",
			changed: "text-warn",
			removed: "text-danger",
			unchanged: "text-ink-meta",
			stale: "text-warn",
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
	base: "max-w-measure-short text-caption leading-caption tracking-caption font-normal",
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

// A typing or choosing control's box: the surface with the hairline as its
// boundary, `edge-error` in error. `fit` is its container's: a form's
// field height, or the compact control's in a bar (a toolbar's search box
// or picker); `trailing` its right inset (an in-field act sits `inside`
// from the edge).
export const FIELD = matrix({
	base: "gap-inside rounded-control border bg-surface",
	variants: {
		fit: {
			form: "min-h-field",
			bar: "min-h-control-compact",
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
	defaultVariants: { fit: "form", trailing: "none", state: "rest" },
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

// A single-choice option's radio: a ring at the box's size, the chosen one
// in the checkbox's fill around its dot (`OPTION_RADIO_DOT`).
export const OPTION_RADIO = matrix({
	base: "size-check rounded-full border",
	variants: {
		state: {
			unchecked: "border-edge-strong",
			checked: "border-toggle-on",
		},
	},
	defaultVariants: { state: "unchecked" },
});

// ── Row ─────────────────────────────────────────────────────────────

// A row in a group, a list or a popover. `lines` is what it stands
// for: one line, a title over its meta, or a setting (a label over its
// description), or `whole`, a title wrapped to every line it needs (no
// minimum height, the lines set it); the taller forms pad so a wrapped line
// keeps air. Highlighted (the
// keyboard's or the pointer's current option) under the hover wash, pressed
// under the press wash, selected under the selection wash, and the selection
// under the pointer a step darker. `ground` is what holds it: a list or a
// popover insets it as a rounded wash (a Select's option row), a group runs it edge to edge at the card's inset, the group
// drawing the hairline between its rows. A list row is square on touch,
// where the list's inset is none and its wash meets the screen's edge: a
// density flip, so an overlay over `list` (the web's under `touch:`), never
// a cell.
export const ROW = matrix({
	base: "gap-inside",
	variants: {
		lines: {
			one: "min-h-row",
			two: "min-h-row-2 py-rows",
			setting: "min-h-row-setting py-pair",
			whole: "py-pair",
		},
		state: {
			rest: "",
			highlighted: "bg-wash-hover",
			pressed: "bg-wash-press",
			selected: "bg-wash-selected",
			"selected-hover": "bg-wash-selected-hover",
		},
		ground: {
			list: "px-control-x rounded-row",
			group: "px-card",
		},
	},
	defaultVariants: { lines: "one", state: "rest", ground: "list" },
});

// A tree row's levels and fold lane run the row's full height, over the
// padding its `lines` form takes (`ROW`), so a level's rail is unbroken from
// row to row: the bleed is that padding's negative.
export const TREE_BLEED = matrix({
	base: "",
	variants: {
		lines: {
			one: "",
			two: "-my-rows",
			setting: "-my-pair",
			whole: "-my-pair",
		},
	},
	defaultVariants: { lines: "one" },
});

// A list row's title at body size, its weight and ink by how it stands:
// `strong` a row's name (500); `dim` a row off a highlighted path, in the
// meta ink at 400, never faded, so it keeps the text floor; `whole` a title
// read as a passage (a note) at 400, wrapped to every line, and `whole-dim`
// the same off the path.
export const ROW_TITLE = matrix({
	base: "text-body leading-body",
	variants: {
		form: {
			strong: "font-medium text-ink-body",
			dim: "font-normal text-ink-meta",
			whole: "font-normal text-ink-body",
			"whole-dim": "font-normal text-ink-meta",
		},
	},
	defaultVariants: { form: "strong" },
});

// One step of a row's step list: a status mark beside its label at meta
// size, the running step in the body ink and the others (done, waiting) in
// the meta ink; the status colour stays on the mark.
export const ROW_STEP = matrix({
	base: "gap-inside text-meta leading-meta font-normal",
	variants: {
		state: {
			running: "text-ink-body",
			rest: "text-ink-meta",
		},
	},
	defaultVariants: { state: "rest" },
});

// A box one line of a type role tall: a control or a skeleton bar centred on
// the line it stands beside or in for (a checkbox on its label's line, a
// loading line at its text's height).
export const LINE_BOX = matrix({
	base: "",
	variants: {
		role: {
			body: "text-body leading-body",
			meta: "text-meta leading-meta",
			title: "text-title leading-title",
			heading: "text-heading leading-heading",
			code: "text-code leading-code",
			figure: "text-figure leading-figure",
			display: "text-display leading-display",
		},
	},
	defaultVariants: { role: "body" },
});

// ── Table ───────────────────────────────────────────────────────────

// A data table's row: a hairline under it, washed under the pointer and
// pressed, and the open record selected (a step darker under the pointer).
// The header row is the rest row.
export const TABLE_ROW = matrix({
	base: "border-b border-edge",
	variants: {
		state: {
			rest: "",
			highlighted: "bg-wash-hover",
			pressed: "bg-wash-press",
			selected: "bg-wash-selected",
			"selected-hover": "bg-wash-selected-hover",
		},
	},
	defaultVariants: { state: "rest" },
});

// A sortable column's header: a cell-wide act at the row's height behind a
// transparent side border, so its label stands on the values' x.
export const TABLE_HEAD = matrix({
	base: "gap-inside min-h-row border-x border-transparent px-control-x",
	variants: {
		state: {
			rest: "",
			highlighted: "bg-wash-hover",
			pressed: "bg-wash-press",
		},
	},
	defaultVariants: { state: "rest" },
});

// A header's label at meta 500, never bold, in the meta ink, the body ink on
// the column the table sorts by. Its sort glyph takes the label's ink.
export const TABLE_HEAD_LABEL = matrix({
	base: "text-meta leading-meta font-medium",
	variants: {
		sort: {
			none: "text-ink-meta",
			sorted: "text-ink-body",
		},
	},
	defaultVariants: { sort: "none" },
});

// The frozen leading column's content: its hairline at its end, and the
// row's wash repeated over the frozen cell's own surface (`TABLE_FROZEN`).
export const TABLE_FROZEN_CELL = matrix({
	base: "border-r-edge",
	variants: {
		state: {
			rest: "",
			highlighted: "bg-wash-hover",
			pressed: "bg-wash-press",
			selected: "bg-wash-selected",
			"selected-hover": "bg-wash-selected-hover",
		},
	},
	defaultVariants: { state: "rest" },
});

// A change cell's value at the body role: the old value in the meta ink and
// the new in the body ink, neither tinted; an added value on `ok-soft` and a
// removed one on `danger-soft`, struck, each a soft pill.
export const TABLE_CHANGE_VALUE = matrix({
	base: "text-body leading-body font-normal",
	variants: {
		kind: {
			before: "text-ink-meta",
			after: "text-ink-body",
			added: "rounded-chip bg-ok-soft px-inside text-ink-body",
			removed:
				"rounded-chip bg-danger-soft px-inside text-ink-body line-through",
		},
	},
	defaultVariants: { kind: "after" },
});

// ── Segmented control ───────────────────────────────────────────────

// A segment flush in its track at the compact control's height, selected
// under the selection wash, and the selection under the pointer a step
// darker. The box carries its ink for a web glyph; the label repeats it,
// since a native Text inherits none.
export const SEGMENT = matrix({
	base: "rounded-control min-h-control-compact px-control-x",
	variants: {
		state: {
			idle: "text-ink-meta",
			selected: "bg-wash-selected text-ink-body",
			"selected-hover": "bg-wash-selected-hover text-ink-body",
		},
	},
	defaultVariants: { state: "idle" },
});

export const SEGMENT_LABEL = matrix({
	base: "text-body leading-body font-medium",
	variants: {
		state: {
			idle: "text-ink-meta",
			selected: "text-ink-body",
			"selected-hover": "text-ink-body",
		},
	},
	defaultVariants: { state: "idle" },
});

// ── Picker ──────────────────────────────────────────────────────────

// The pick's trigger by where it stands: a field box (`FIELD` at the bar
// fit) in a toolbar, a field box that fills its column in a rule row (`bar`:
// its value, or the chips of a several pick, wrap inside it), or a row's
// trailing value in a `WORD_ACT` box, its ink the meta ink for the chevron beside
// the value.
export const PICKER = matrix({
	base: "",
	variants: {
		fit: {
			field: "",
			bar: "gap-inside text-ink-meta",
			row: "gap-inside text-ink-meta",
		},
	},
	defaultVariants: { fit: "field" },
});

// ── Rules ───────────────────────────────────────────────────────────

// A pair row's arrow, in the meta ink while both sides are set and the
// disabled ink while either is not.
export const RULE_ARROW = matrix({
	base: "",
	variants: {
		state: {
			set: "text-ink-meta",
			unset: "text-ink-disabled",
		},
	},
	defaultVariants: { state: "set" },
});

// ── Form field ──────────────────────────────────────────────────────

// A field by what it holds: the label over a field box, the label beside a
// switch at its end, or a checkbox on the label's line ahead of it.
export const FORM_FIELD = matrix({
	base: "",
	variants: {
		holds: {
			field: "gap-pair",
			switch: "gap-fields",
			checkbox: "gap-inside",
		},
	},
	defaultVariants: { holds: "field" },
});

// ── Banner ──────────────────────────────────────────────────────────

// A page's notice on its kind's soft ground, a pair inset around its content
// (the act's height on a line with an act); the kind's colour is its glyph's
// alone.
export const BANNER = matrix({
	base: "rounded-control px-control-x py-pair gap-pair text-body leading-body text-ink-body",
	variants: {
		kind: {
			note: "bg-accent-soft",
			warn: "bg-warn-soft",
			danger: "bg-danger-soft",
		},
	},
	defaultVariants: { kind: "note" },
});

export const BANNER_GLYPH = matrix({
	base: "",
	variants: {
		kind: {
			note: "text-accent-ink",
			warn: "text-warn",
			danger: "text-danger",
		},
	},
	defaultVariants: { kind: "note" },
});

// ── Toast ───────────────────────────────────────────────────────

// The state is the glyph's ink alone; the toast's ground is every state's.
export const TOAST_STATE = matrix({
	base: "",
	variants: {
		state: {
			done: "text-ok",
			attention: "text-warn",
			failed: "text-danger",
		},
	},
});

// ── Menu ────────────────────────────────────────────────────────────

// A menu's acts by its form: a popover at the popover's width (its ground
// and inset are `POPOVER`'s), or the rows inside a touch sheet at the
// popover's rhythm and inset.
export const MENU = matrix({
	base: "",
	variants: {
		form: {
			popover: "w-popover",
			sheet: "gap-pair p-float",
		},
	},
	defaultVariants: { form: "popover" },
});

// A menu's group of rows (its acts, or the destructive acts last): the first
// group stands alone, a group after another under a hairline between them.
export const MENU_GROUP = matrix({
	base: "gap-rows",
	variants: {
		place: {
			first: "",
			after: "border-t border-edge pt-float",
		},
	},
	defaultVariants: { place: "first" },
});

// A menu act's label: the body role's, in `danger` for an act that removes
// or ends something.
export const MENU_LABEL = matrix({
	base: "",
	variants: {
		kind: {
			act: "",
			destructive: "text-danger",
		},
	},
	defaultVariants: { kind: "act" },
});

// ── Sheet ───────────────────────────────────────────────────────────

// The sheet on the desktop, raised over the scrim. `fit` is what it holds: a
// form at the sheet's width, hung at the end with its leading corners rounded;
// a Split's record pane at the pane's (the Split passes it); or a short form
// as a card at the dialog's width, centred, its hairline and radius on all
// four sides (the Sheet chooses it by measuring its content).
export const SHEET_SIDE = matrix({
	base: "bg-raised border-edge-raised shadow-modal",
	variants: {
		fit: {
			form: "w-sheet border-l rounded-l-sheet",
			pane: "w-pane border-l rounded-l-sheet",
			short: "w-dialog border rounded-sheet",
		},
	},
	defaultVariants: { fit: "form" },
});

// ── Prose ───────────────────────────────────────────────────────────

// A list item's marker in a slot the icon's width, in the meta ink: a
// bullet, or an ordered item's figures at one width.
export const PROSE_MARKER = matrix({
	base: "min-w-icon text-body leading-body font-normal text-ink-meta",
	variants: {
		list: {
			bullet: "",
			ordered: "tabular-nums",
		},
	},
	defaultVariants: { list: "bullet" },
});

// A ProseDiff's runs on the diff's own grounds: the added run underlined, the
// removed run struck through.
export const PROSE_DIFF_RUN = matrix({
	base: "",
	variants: {
		kind: {
			added: "bg-ok-soft underline",
			removed: "bg-danger-soft line-through",
		},
	},
});

// ── Code ────────────────────────────────────────────────────────────

// The code's text at the compact card inset or, beside the copy act's own
// column (no title), without the end inset that column carries.
export const CODE_TEXT = matrix({
	base: "",
	variants: {
		act: {
			none: "p-tile",
			beside: "py-tile pl-tile",
		},
	},
	defaultVariants: { act: "none" },
});

// ── Diff ────────────────────────────────────────────────────────────

// A unified diff's line at the code role, Code's line: its kind is its
// ground, the hunk header on the group ground in the meta ink.
export const DIFF_LINE = matrix({
	base: "text-code leading-code font-normal font-mono",
	variants: {
		kind: {
			context: "text-ink-body",
			added: "text-ink-body bg-ok-soft",
			removed: "text-ink-body bg-danger-soft",
			header: "bg-group text-ink-meta",
		},
	},
	defaultVariants: { kind: "context" },
});

// ── File row ────────────────────────────────────────────────────────

// A file's path split before its last slash: the directory in the meta
// ink, the name (its slash first) at 500.
export const FILE_PATH_PART = matrix({
	base: "",
	variants: {
		part: {
			directory: "text-ink-meta",
			name: "font-medium text-ink-body",
		},
	},
});

// A count in its lane, four figures wide so the lanes line up down a list:
// the diff's own marks, added in `ok`, removed in `danger`.
export const FILE_COUNT = matrix({
	base: "min-w-figures",
	variants: {
		kind: {
			added: "text-ok",
			removed: "text-danger",
		},
	},
});

// ── Message ─────────────────────────────────────────────────────────

// A message by its author: yours and another's a pair over their parts, a
// system line a row at the target height.
export const MESSAGE = matrix({
	base: "",
	variants: {
		author: {
			you: "gap-pair",
			other: "gap-pair",
			system: "min-h-target",
		},
	},
});

// ── Meter ───────────────────────────────────────────────────────────

// A meter's fill by its level (`METER_NEAR`): under in the meta ink, near in
// the amber mark, over in `danger`; never the accent.
export const METER_FILL = matrix({
	base: "h-full rounded-chip",
	variants: {
		level: {
			under: "bg-ink-meta",
			near: "bg-chip-amber",
			over: "bg-danger",
		},
	},
	defaultVariants: { level: "under" },
});

// ── Step count ──────────────────────────────────────────────────────

// One segment of an onboarding step count at the meter's height: the steps
// done and the current one in the meta ink, the later ones a wash; never the
// accent. The segments share the row's width.
export const STEP_COUNT_SEGMENT = matrix({
	base: "h-meter rounded-chip",
	variants: {
		state: {
			done: "bg-ink-meta",
			current: "bg-ink-meta",
			later: "bg-fill-neutral",
		},
	},
	defaultVariants: { state: "later" },
});

// ── Stages ──────────────────────────────────────────────────────────

// A stage's label by where the rail stands at it: done at body, current at
// body 500, later at meta, the terminal row at body 500 as the current one
// is. The ink is the label's own in every state; a stage's hue is its mark's.
export const STAGE = matrix({
	base: "",
	variants: {
		state: {
			done: "text-body leading-body font-normal text-ink-body",
			current: "text-body leading-body font-medium text-ink-body",
			later: "text-meta leading-meta font-normal text-ink-meta",
			ended: "text-body leading-body font-medium text-ink-body",
		},
	},
});

// A stage's mark at the meta icon size, the shape saying where the rail
// stands: done a filled disc (its check drawn on it, `STAGE_CHECK`), current
// a ring in the accent, later a hollow ring in the meta ink. An ended rail's
// mark is a cross (`STAGE_CROSS`) with no shape of its own.
export const STAGE_MARK = matrix({
	base: "size-icon-meta rounded-full",
	variants: {
		state: {
			done: "bg-ink-meta",
			current: "border-2 border-accent-ink",
			later: "border border-ink-meta",
		},
	},
	defaultVariants: { state: "later" },
});

// The rail from a stage's mark to the next: solid in the strong hairline
// through the done stages, the plain hairline after.
export const STAGE_RAIL = matrix({
	base: "border-l",
	variants: {
		state: {
			done: "border-edge-strong",
			ahead: "border-edge",
		},
	},
	defaultVariants: { state: "ahead" },
});

// ── Bar chart ───────────────────────────────────────────────────────

// One of the four bands the plot's height splits into, its top a gridline
// (the last band's bottom the baseline too); the axis beside the plot
// stands the same bands with clear lines, so each tick centres on its line.
export const CHART_BAND = matrix({
	base: "",
	variants: {
		kind: {
			grid: "border-edge",
			axis: "border-transparent",
		},
		rule: {
			top: "border-t",
			both: "border-y",
		},
	},
	defaultVariants: { kind: "grid", rule: "top" },
});

// A series' mark (a column, a stacked part, a key's dot) in the chart fills,
// in `CHART_SERIES` order: one series takes the first.
export const CHART_FILL = matrix({
	base: "",
	variants: {
		series: {
			teal: "bg-chart-teal",
			violet: "bg-chart-violet",
			amber: "bg-chart-amber",
			pink: "bg-chart-pink",
			green: "bg-chart-green",
			red: "bg-chart-red",
		},
	},
	defaultVariants: { series: "teal" },
});

// ── QR code ─────────────────────────────────────────────────────────

// The code's SVG scaled into its tile in the body ink (the tile is a light
// scope, so the modules are dark in both modes), or its square in the
// skeleton ink while loading.
export const QR_CODE = matrix({
	base: "size-full",
	variants: {
		state: {
			rest: "text-ink-body",
			loading: "text-skeleton",
		},
	},
	defaultVariants: { state: "rest" },
});

// ── Image ───────────────────────────────────────────────────────────

// The frame an image stands in, a hairline on the page. A thumbnail is a
// square tile at its radius; the content fit takes its container's width and
// the card's radius, down to the height cap. Waiting it is a skeleton and
// failed a group ground holding a glyph over the alt text, each at the
// loaded height: the thumbnail's side, and the content fit's aspect, which
// its consumer always gives since its bytes have none yet.
export const IMAGE = matrix({
	base: "border border-edge",
	variants: {
		fit: {
			thumb: "size-image-tile rounded-control",
			content: "w-full max-h-image-cap rounded-card",
		},
		state: {
			rest: "",
			loading: "bg-skeleton",
			error: "gap-inside p-inside bg-group",
		},
	},
	defaultVariants: { fit: "content", state: "rest" },
});

// The picture inside its frame: a thumbnail fills its square; the content fit
// fills the width at the image's own aspect, down to the height cap.
export const IMAGE_PICTURE = matrix({
	base: "",
	variants: {
		fit: {
			thumb: "size-full",
			content: "w-full max-h-image-cap",
		},
	},
	defaultVariants: { fit: "content" },
});

// ── Canvas ──────────────────────────────────────────────────────────

// A node's box on the group ground and the colour of its outline: the rest
// hairline, the selection's, or the problem's. Off and path-dimmed nodes draw
// the rest box and differ in their text's ink; the path's `at` node draws
// `selected`.
export const CANVAS_NODE = matrix({
	base: "w-node min-h-row-2 gap-pair px-control-x py-inside rounded-card border bg-group",
	variants: {
		state: {
			rest: "border-edge",
			selected: "border-selected-outline",
			problem: "border-edge-error",
		},
	},
	defaultVariants: { state: "rest" },
});

// A node's text: the type role rides on the part, the ink on the tone. A rest
// overline and line are meta, a rest title is body; off and dimmed recolour
// every part they reach. A problem's words keep the rest ink.
export const CANVAS_NODE_TEXT = matrix({
	base: "",
	variants: {
		part: {
			overline: "text-caption leading-caption tracking-caption font-normal",
			title: "text-body leading-body font-medium",
			line: "text-meta leading-meta font-normal",
		},
		tone: {
			rest: "",
			off: "text-ink-meta",
			dimmed: "text-ink-disabled",
		},
	},
	compoundVariants: [
		{ part: "overline", tone: "rest", class: "text-ink-meta" },
		{ part: "line", tone: "rest", class: "text-ink-meta" },
		{ part: "title", tone: "rest", class: "text-ink-body" },
	],
	defaultVariants: { part: "line", tone: "rest" },
});

// A node under the text floor: its glyph alone in a control-sized box. The state
// is the outline's colour, as the node's own.
export const CANVAS_NODE_GLYPH = matrix({
	base: "size-control rounded-card border bg-group",
	variants: {
		state: {
			rest: "border-edge",
			selected: "border-selected-outline",
			problem: "border-edge-error",
		},
	},
	defaultVariants: { state: "rest" },
});

// A node's name in the overview, between the full node and the glyph alone: the
// caption role in body ink at 500, on the canvas's own ground so an edge never
// strikes through it, one line cut at the short measure. The tone recolours it as
// it does the node's words (off meta, dimmed disabled).
export const CANVAS_NODE_NAME = matrix({
	base: "max-w-measure-short truncate whitespace-nowrap px-inside bg-canvas text-caption leading-caption tracking-caption font-medium",
	variants: {
		tone: {
			rest: "text-ink-body",
			off: "text-ink-meta",
			dimmed: "text-ink-disabled",
		},
	},
	defaultVariants: { tone: "rest" },
});

// A group's dashed frame: the dash says a group, the outline's colour says it
// is selected.
export const CANVAS_GROUP = matrix({
	base: "rounded-card border border-dashed",
	variants: {
		state: {
			rest: "border-edge-strong",
			selected: "border-selected-outline",
		},
	},
	defaultVariants: { state: "rest" },
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

// The record beside the list: its sections apart at the page inset, in a
// column that holds the measure inside that inset and stands at the main's
// start (so a Section, a Group, a Code and an ActionBar end where a Prose
// does), or, with nothing open, the empty state alone at the inset. While a
// Thread fills it, the inset holds the record's head alone: the Thread bleeds
// through the sides, its log and its docked foot carrying the page inset
// themselves. A record the main opened (`beside`) draws its body in the same
// `rest` cell, so both end where a Prose does.
export const SPLIT_MAIN = matrix({
	base: "",
	variants: {
		state: {
			rest: "gap-sections p-page max-w-measure-inset",
			empty: "p-page",
			fills: "px-page pt-page",
		},
	},
	defaultVariants: { state: "rest" },
});

// ── Section ─────────────────────────────────────────────────────────

// A section's head-to-body step follows where it sits: on a page (over a
// Group, a List, a column's cards) the head is paired to the body; in a form
// it is the fields rhythm. The body's own parts stand apart at the fields
// rhythm wherever the section sits (`SECTION_BODY`).
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

// A form's one column: its children fields apart, or sections apart when it
// holds sections (each section's fields then at the fields rhythm). On a page
// the column is at most a line of running text wide, so its fields, banners
// and act end together; in a sheet the sheet is the column, in a `Gate` the
// gate's, and in a Split's pane the pane's.
export const FORM = matrix({
	base: "",
	variants: {
		holds: {
			fields: "gap-fields",
			sections: "gap-sections",
		},
		in: {
			page: "max-w-measure",
			pane: "",
			sheet: "",
			auth: "",
		},
	},
	defaultVariants: { holds: "fields", in: "page" },
});

// ── Columns ─────────────────────────────────────────────────────────

// A page's sections side by side. `fit` is where they stand: `board` is a
// row at the column width scrolling sideways from the page inset (a web
// overlay bleeds it to the Place's edge); `half` is two to a row filling the
// body from the Place's `desktop` width and stacking in order below it (a
// web overlay), at the sections rhythm between rows and columns. The phone
// stacks every fit.
export const COLUMNS = matrix({
	base: "",
	variants: {
		fit: {
			board: "gap-fields px-page",
			half: "gap-sections",
		},
	},
	defaultVariants: { fit: "board" },
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
// width, a web overlay, stands it at its text's length) or the part it
// stands in for, at that part's size (a checkbox's box, a radio's ring, a row's glyph, a
// status's dot, a meter's bar, a chart's plot among them); `bar` stands for a
// control at the compact height (a row's act, its entry's field).
export const SKELETON = matrix({
	base: "",
	variants: {
		kind: {
			line: "h-skeleton rounded-chip bg-skeleton",
			avatar: "size-avatar rounded-full bg-skeleton",
			switch: "w-switch-w h-switch-h rounded-full bg-skeleton",
			count: "h-skeleton rounded-chip bg-skeleton",
			field: "min-h-field rounded-control bg-skeleton",
			bar: "min-h-control-compact rounded-control bg-skeleton",
			check: "size-check rounded-chip bg-skeleton",
			radio: "size-check rounded-full bg-skeleton",
			icon: "size-icon rounded-full bg-skeleton",
			dot: "size-dot rounded-full bg-skeleton",
			meter: "h-meter rounded-chip bg-skeleton",
			chart: "h-chart rounded-chip bg-skeleton",
		},
	},
	defaultVariants: { kind: "line" },
});

// A loading row at the height of the row it stands in for: a group's setting
// row, a form's field (a label line over the field's box at the label's
// gap), a record's facts line (at the meta line's height), or a one-line row in a list or in a group (a file row's).
export const SKELETON_ROW = matrix({
	base: "",
	variants: {
		kind: {
			setting: "gap-fields min-h-row-setting px-card py-pair",
			field: "gap-pair",
			facts: "gap-x-fields",
			"one-line": "gap-inside min-h-row px-control-x",
			"one-line-group": "gap-inside min-h-row px-card",
		},
	},
	defaultVariants: { kind: "setting" },
});

// The lane a loading label's bar runs in: a short label's measure, in the ch
// of the role it stands in for (a group label's meta from its line box, an
// option's body).
export const SKELETON_LANE = matrix({
	base: "max-w-measure-short",
	variants: {
		role: {
			meta: "",
			body: "text-body",
		},
	},
	defaultVariants: { role: "body" },
});
