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

// ── Row ─────────────────────────────────────────────────────────────

// A row in a group, a list or a popover. `lines` is what it stands
// for: one line, a title over its meta, or a setting (a label over its
// description); the two taller forms pad so a wrapped line keeps air. Highlighted (the
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

// A box one line of a type role tall: a control or a skeleton bar centred on
// the line it stands beside or in for (a checkbox on its label's line, a
// loading line at its text's height).
export const LINE_BOX = matrix({
	base: "",
	variants: {
		role: {
			body: "text-body leading-body",
			meta: "text-meta leading-meta",
			heading: "text-heading leading-heading",
			code: "text-code leading-code",
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
// fit) in a toolbar, or a row's trailing value in a `PILL_ACT`, its ink the
// meta ink for the chevron beside the value.
export const PICKER = matrix({
	base: "",
	variants: {
		fit: {
			field: "",
			row: "gap-inside text-ink-meta",
		},
	},
	defaultVariants: { fit: "field" },
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

// The side sheet on the desktop, raised at its end with its leading corners
// rounded. `fit` is what it holds: a form at the sheet's width, or a
// Split's record pane at the pane's (the Split passes it).
export const SHEET_SIDE = matrix({
	base: "bg-raised border-l border-edge-raised rounded-l-sheet shadow-modal",
	variants: {
		fit: {
			form: "w-sheet",
			pane: "w-pane",
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
// `warn`, over in `danger`; never the accent.
export const METER_FILL = matrix({
	base: "h-full rounded-chip",
	variants: {
		level: {
			under: "bg-ink-meta",
			near: "bg-warn",
			over: "bg-danger",
		},
	},
	defaultVariants: { level: "under" },
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

// A series' mark (a column, a stacked part, a key's dot) in the chip marks,
// in `CHART_SERIES` order: one series takes the first.
export const CHART_FILL = matrix({
	base: "",
	variants: {
		series: {
			teal: "bg-chip-teal",
			violet: "bg-chip-violet",
			amber: "bg-chip-amber",
			pink: "bg-chip-pink",
			green: "bg-chip-green",
			red: "bg-chip-red",
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

// A form's one column: its children fields apart, or sections apart when it
// holds sections (each section's fields then at the fields rhythm). On a page
// the column is at most a line of running text wide, so its fields, banners
// and act end together; in a sheet the sheet is the column.
export const FORM = matrix({
	base: "",
	variants: {
		holds: {
			fields: "gap-fields",
			sections: "gap-sections",
		},
		in: {
			page: "max-w-measure",
			sheet: "",
		},
	},
	defaultVariants: { holds: "fields", in: "page" },
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
// stands in for, at that part's size (a checkbox's box, a row's glyph, a
// status's dot, a meter's bar, a chart's plot among them).
export const SKELETON = matrix({
	base: "",
	variants: {
		kind: {
			line: "h-skeleton rounded-chip bg-skeleton",
			avatar: "size-avatar rounded-full bg-skeleton",
			switch: "w-switch-w h-switch-h rounded-full bg-skeleton",
			count: "min-h-chip min-w-chip rounded-full bg-skeleton",
			field: "min-h-field rounded-control bg-skeleton",
			check: "size-check rounded-chip bg-skeleton",
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
// gap), a record's facts line (at the height of the status that opens on
// it), or a one-line row in a list or in a group (a file row's).
export const SKELETON_ROW = matrix({
	base: "",
	variants: {
		kind: {
			setting: "gap-fields min-h-row-setting px-card py-pair",
			field: "gap-pair",
			facts: "gap-x-fields min-h-target",
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
