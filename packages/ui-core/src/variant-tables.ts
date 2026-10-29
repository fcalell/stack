// The variant matrices as data. A cva hides its config at runtime, so each
// matrix is declared here and `#variants` builds the cva from it: the DESIGN.md
// emitter walks the same object the cva reads, so no enumeration can drift from
// the matrix it describes. Internal to the package, with no subpath export.
//
// Every cell is a class both a web and a native renderer can take: fills,
// borders, ink, spacing roles, radius, type role, weight, family, a control's
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

// ── Motion cells ────────────────────────────────────────────────────

// The cells a move spells, composed into the
// cells that make it so a component never writes a motion of its own. They are
// the one place a cell carries an interaction state or an arbitrary property
// list (`MOTION_CELLS` names them): a platform would otherwise overlay them.
// A state's look eases in on `fast` and a press lands on `instant`; never
// `outline`, since the focus ring snaps in and out and a key reads as a
// position. The phone has no hover and answers a press in Reanimated
// (`usePress`), which these classes leave alone.
export const ANSWER =
	"transition-[background-color,border-color,color,text-decoration-color,fill,stroke,opacity,scale] duration-fast ease-out active:duration-instant";
// A filled control gives to the press scale under a press; it lets go on
// ANSWER's `fast`.
export const GIVE = "active:scale-(--scale-press)";
// A toggle's thumb travels by transform on `fast`, in and out.
export const TOGGLE_THUMB = "transition-transform duration-fast ease-in-out";
// A checkbox's mark grows from 0.6 with its opacity on `fast` and leaves on
// `instant` (Base UI keeps it mounted through the leave).
export const CHECK_MARK =
	"transition-[scale,opacity] duration-fast ease-out data-starting-style:scale-60 data-starting-style:opacity-0 data-ending-style:scale-60 data-ending-style:opacity-0 data-ending-style:duration-instant";
// A radio's dot grows from nothing on `fast` and shrinks on `instant`.
export const RADIO_DOT =
	"transition-[scale] duration-fast ease-out data-starting-style:scale-0 data-ending-style:scale-0 data-ending-style:duration-instant";
// A disclosure chevron turns by transform on `fast`, in and out, instead of
// swapping glyphs; the site names the turn (`-rotate-90` closed).
export const CHEVRON = "transition-transform duration-fast ease-in-out";
// A fill is its full track scaled by transform, never a width or a height: the
// site sets `--fill` (a share, 0 to 1), the fill moves on `slow` `in-out` and
// its level colour cross-fades on `base`. One that mounts grows from its start
// (`starting:`), the start edge following the writing direction. A bar stands
// on the baseline, and `--stack` lifts a stacked part over the ones under it.
export const FILL_X =
	"origin-left rtl:origin-right scale-x-(--fill) starting:scale-x-0 transition-[scale,background-color] [transition-duration:var(--transition-duration-slow),var(--transition-duration-base)] ease-in-out";
export const FILL_Y =
	"origin-bottom scale-y-(--fill) -translate-y-(--stack) starting:scale-y-0 transition-[scale,translate,background-color] [transition-duration:var(--transition-duration-slow),var(--transition-duration-slow),var(--transition-duration-base)] ease-in-out";
// A step count's segment that turns done cross-fades its fill on `base`.
export const FILL_FADE = "transition-[background-color] duration-base ease-out";
// A mark that rides a share of its track (a meter's tick) travels by
// transform on `slow`; the site sets `--travel` (a share of the track's width).
export const TRAVEL_X =
	"translate-x-(--travel) transition-[translate] duration-slow ease-in-out";
// A mark that rides a share of its column (a level's reading in a bar
// chart) travels the same way down it; the site sets `--travel` (a share of
// the mark's own box, the column's height).
export const TRAVEL_Y =
	"translate-y-(--travel) transition-[translate] duration-slow ease-in-out";
// A value that changes while shown swaps old for new: the new enters over
// `fast`, the old leaves over it, each by opacity and a transform the site
// names with `--swap-y` (a figure's roll: the share of its own height the old
// leaves by and the new rises from) and `--swap-scale` (a mark's: it grows from
// there). Neither set, it is a cross-fade.
export const SWAP_IN =
	"animate-[swap-in_var(--transition-duration-fast)_var(--ease-out)_both]";
export const SWAP_OUT =
	"animate-[swap-out_var(--transition-duration-fast)_var(--ease-out)_both]";

// A canvas node lifted by a long press scales to `lift` (a `scale` the answer
// already eases) while its float shadow fades in on `fast`: the shadow is the
// node's own `::after`, a box of its size that draws nothing but the shadow
// outside it, so a node that is not lifted carries none. The site marks the
// lift with `data-lifted`.
export const LIFT =
	"data-lifted:scale-(--scale-lift) after:absolute after:inset-0 after:rounded-card after:shadow-float after:opacity-0 after:pointer-events-none after:transition-opacity after:duration-fast after:ease-out data-lifted:after:opacity-100";
// A path's tone (a taken edge against the rest dimmed, a node's words and its
// chip) cross-fades its ink on `base`, slower than a state's answer: the whole
// run changes at once.
export const PATH_TONE = "transition-colors duration-base ease-out";

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
				"text-title leading-title tracking-title font-medium text-ink-body",
			heading: "text-heading leading-heading font-medium text-ink-body",
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
// resend, a skip). `fit` is its container's: a control on its own, or full
// width at a field's height under the field it submits. min-h,
// never h: the label must be able to grow the control under OS font scaling.
// The fill carries the act's ink for the web's glyph and spinner
// (currentColor); the label repeats it, since a native Text inherits none.
export const BUTTON = matrix({
	base: `gap-gap rounded-control px-pad ${ANSWER}`,
	variants: {
		act: {
			primary: "bg-act-accent text-on-act-accent",
			danger: "bg-act-danger text-on-act-danger",
			secondary: "border border-edge text-ink-body",
			destructive: "border border-edge text-danger",
			quiet: "text-ink-meta",
		},
		fit: {
			body: `min-h-control ${GIVE}`,
			// Across its container: a wide surface scaling reads as a wobble.
			field: "min-h-control w-full",
		},
	},
	defaultVariants: { act: "primary", fit: "body" },
});

export const BUTTON_LABEL = matrix({
	base: `text-body leading-body font-medium ${ANSWER}`,
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
// sits inside a field's end, at the control square, reaching across the box's
// border so a bar-fit box (the control height, border included)
// holds it at its own height.
export const ICON_BUTTON = matrix({
	base: `rounded-control text-ink-meta ${ANSWER} ${GIVE}`,
	variants: {
		fit: {
			body: "size-control",
			field: "size-control -my-hairline",
		},
	},
	defaultVariants: { fit: "body" },
});

// ── Link ────────────────────────────────────────────────────────────

// Accent ink at 500 in the type of the line it sits in. `inline` is
// underlined at rest; `standalone` is not, and stands on the target height
// (`LINK_TARGET`).
export const LINK = matrix({
	base: `font-medium text-accent-ink ${ANSWER}`,
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
		tone: {
			active: "bg-accent-ink",
			waiting: "bg-ink-meta",
			done: "bg-ok",
			attention: "bg-chip-amber",
			failed: "bg-danger",
			idle: "border border-ink-meta",
		},
	},
});

// A state chip: the state's dot (`STATUS_DOT`, the spinner while `running`)
// and word on the state's soft fill under the state's ink, a hairline a step
// darker than the fill, the chip's height, corners and inset. It stands where
// a `Status` is given its own word. Every tone leads with its dot, so a chip
// reads as a state and says which: the neutral states (`waiting`, `idle`),
// which share a soft of their own, opaque and apart from a disabled act's
// fill and the sheet an outlined pill stands on, under the meta ink and its own
// edge, are told apart as in a row, the filled dot from the hollow one.
export const STATE_CHIP = matrix({
	base: "rounded-chip min-h-chip px-pad border",
	variants: {
		tone: {
			active: "bg-accent-soft text-accent-ink border-accent-edge",
			waiting: "bg-neutral-soft text-ink-meta border-neutral-edge",
			running: "bg-accent-soft text-accent-ink border-accent-edge",
			done: "bg-ok-soft text-ok border-ok-edge",
			attention: "bg-warn-soft text-warn border-warn-edge",
			failed: "bg-danger-soft text-danger border-danger-edge",
			idle: "bg-neutral-soft text-ink-meta border-neutral-edge",
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

// A data value's tag: an outlined pill on the surface with a dot in its
// family's hue, so the family is learnable across screens and never mistaken
// for a status. `ground` is what the box stands on: `edge`, the surface under
// the hairline every outlined control shares (voice 5), for a hued family;
// `soft`, the neutral family's soft ground (the one a neutral type mark,
// `ROW_MARK`, stands on) with no edge and no dot. A neutral value has no hue
// to draw, and a dotless outlined box is a control's form, a compact one a
// toggle button beside a row's switches; its soft ground keeps it a tag and
// apart from a state pill, which is opaque, edged and led by its dot (a grey
// dot is a state's, `STATUS_DOT`). It is the one look of a neutral word: a
// record head's plain fact (a word, a count, an age) is this pill too, so the
// head's outlined pills are the facts that act. `trailing` is what closes its right end:
// its own padding, or the remove act's round hit box. The box carries the
// ink for the web's remove glyph; the label repeats it, since a native Text
// inherits none.
export const CHIP = matrix({
	base: "rounded-chip min-h-chip gap-gap text-ink-body",
	variants: {
		trailing: {
			none: "px-pad",
			remove: "pl-pad",
		},
		ground: {
			edge: "border border-edge bg-surface",
			soft: "bg-chip-neutral-soft",
		},
	},
	defaultVariants: { trailing: "none", ground: "edge" },
});

// The chip's dot in the family's strong colour. The neutral family has no
// hue and no cell: a grey dot on it read as the `waiting` state's filled one
// (and a hollow one as `idle`'s), one mark with two meanings on a screen
// that holds both, so its chip draws none and stands on its soft ground
// (`CHIP`'s `ground`).
export const CHIP_DOT = matrix({
	base: "size-dot rounded-full shrink-0",
	variants: {
		family: {
			red: "bg-chip-red",
			amber: "bg-chip-amber",
			green: "bg-chip-green",
			teal: "bg-chip-teal",
			violet: "bg-chip-violet",
			pink: "bg-chip-pink",
		},
	},
});

// ── Field ───────────────────────────────────────────────────────────

// A typing or choosing control's box: the surface with the hairline as its
// hairline (the strong edge under the pointer, the accent when focused),
// `edge-error` in error. It stands at the control height (the body line and
// the gap above and below it) in a form's row and in a bar (a toolbar's
// search box or picker) alike; `trailing` is its right inset (an in-field act
// sits `inside` from the edge).
export const FIELD = matrix({
	base: `min-h-control gap-gap rounded-control border bg-surface ${ANSWER}`,
	variants: {
		trailing: {
			none: "px-pad",
			act: "pl-pad pr-gap",
		},
		state: {
			rest: "border-edge",
			error: "border-edge-error",
		},
	},
	defaultVariants: { trailing: "none", state: "rest" },
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
	base: `rounded-control border px-pad py-gap bg-surface ${ANSWER}`,
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
	base: `w-otp min-w-0 shrink aspect-square rounded-control border bg-surface ${ANSWER}`,
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
	base: `p-switch-inset w-switch-w h-switch-h rounded-full ${ANSWER}`,
	variants: { state: { off: "bg-switch-off", on: "bg-toggle-on" } },
	defaultVariants: { state: "off" },
});

// The on thumb sits at the far end by transform, the one thing a toggle
// animates.
export const SWITCH_THUMB = matrix({
	base: `size-thumb rounded-full bg-switch-thumb ${TOGGLE_THUMB}`,
	variants: { state: { off: "", on: "translate-x-switch-travel" } },
	defaultVariants: { state: "off" },
});

export const CHECKBOX = matrix({
	base: `size-check rounded-chip ${ANSWER}`,
	variants: {
		state: {
			unchecked: "border border-edge bg-surface",
			checked: "bg-toggle-on",
			mixed: "bg-toggle-on",
		},
	},
	defaultVariants: { state: "unchecked" },
});

// A single-choice option's radio: a ring at the box's size, the chosen one
// in the checkbox's fill around its dot (`OPTION_RADIO_DOT`).
export const OPTION_RADIO = matrix({
	base: `size-check rounded-full border ${ANSWER}`,
	variants: {
		state: {
			unchecked: "border-edge",
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
// under the pointer a step darker. One form everywhere: the row radius at the
// card's inset, so a row's text meets the title over its card or list and its
// wash is rounded in a bare list and in a group alike (a row inside a card keeps
// its role's radius), and a group draws the hairline between its rows.
export const ROW = matrix({
	base: `gap-gap px-pad py-gap rounded-row ${ANSWER}`,
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

// A list row's title at body size and weight 400, its ink by how it stands:
// `name` the body ink; `dim` a row off a highlighted path, in the meta ink,
// never faded, so it keeps the text floor. A title read as a passage (a note)
// takes the same cells, wrapped to every line.
export const ROW_TITLE = matrix({
	base: "text-body leading-body font-normal",
	variants: {
		form: {
			name: "text-ink-body",
			dim: "text-ink-meta",
		},
	},
	defaultVariants: { form: "name" },
});

// A row's type mark: one or two characters (`T`, `#`, `[ ]`, `{ }`) in the code
// face at the caption size, weight 600, in the family's ink on its soft ground,
// in a check-sized box with the chip's corners.
export const ROW_MARK = matrix({
	base: "flex size-check shrink-0 items-center justify-center rounded-chip whitespace-nowrap text-caption leading-caption font-semibold font-mono",
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
	},
});

// One step of a row's step list: a status mark beside its label at meta
// size, the running step in the body ink and the others (done, waiting) in
// the meta ink; the status colour stays on the mark.
export const ROW_STEP = matrix({
	base: "gap-gap text-meta leading-meta font-normal",
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
	base: `border-b border-edge ${ANSWER}`,
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
	base: `gap-gap py-gap border-x border-transparent px-pad ${ANSWER}`,
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

// The frozen leading column's content: the row's wash repeated over the
// frozen cell's own surface (`TABLE_FROZEN`), no hairline of its own.
export const TABLE_FROZEN_CELL = matrix({
	base: ANSWER,
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
			added: "rounded-chip bg-ok-soft px-gap text-ink-body",
			removed: "rounded-chip bg-danger-soft px-gap text-ink-body line-through",
		},
	},
	defaultVariants: { kind: "after" },
});

// ── Segmented control ───────────────────────────────────────────────

// A segment flush in its track at the control height, the chosen one
// in body ink; the selection wash is the track's one ground (`SEGMENT_GROUND`),
// which slides from segment to segment. The box carries its ink for a web
// glyph; the label repeats it, since a native Text inherits none.
export const SEGMENT = matrix({
	base: `rounded-control min-h-control px-pad ${ANSWER} ${GIVE}`,
	variants: {
		state: {
			idle: "text-ink-meta",
			selected: "text-ink-body",
		},
	},
	defaultVariants: { state: "idle" },
});

export const SEGMENT_LABEL = matrix({
	base: `text-body leading-body ${ANSWER}`,
	variants: {
		state: {
			idle: "text-ink-meta font-normal",
			selected: "text-ink-body font-medium",
		},
	},
	defaultVariants: { state: "idle" },
});

// ── Picker ──────────────────────────────────────────────────────────

// The pick's trigger by where it stands: a field box (`FIELD` at the bar
// fit) in a toolbar, a field box that fills its column in a rule row (`bar`:
// its value, or the chips of a several pick, wrap inside it), or a row's
// trailing value in a `WORD_ACT` box, its ink the meta ink for the chevron beside
// the value, or the context pill of a Pane's bar (`pill`), its chevron in the
// mark ink.
export const PICKER = matrix({
	base: "",
	variants: {
		// A pick in a form keeps the field's ink; one in a bar (no form around
		// it) is the field box in the meta ink, a word act in a row (the meta
		// ink its chevron's, the value it shows in the body ink, `PICKER_VALUE`),
		// a pill.
		fit: {
			field: "",
			bar: "gap-gap text-ink-meta",
			row: "gap-gap text-ink-meta",
			pill: "gap-gap text-ink-mark",
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

// ── Banner ──────────────────────────────────────────────────────────

// A page's notice on its tone's soft ground, a pair inset around its content
// (the act's height on a line with an act); the tone's colour is its glyph's
// alone. `running` wears `active`'s, `idle` wears `waiting`'s.
export const BANNER = matrix({
	base: "rounded-control px-pad py-gap gap-gap text-body leading-body text-ink-body",
	variants: {
		tone: {
			active: "bg-accent-soft",
			running: "bg-accent-soft",
			waiting: "bg-chip-neutral-soft",
			idle: "bg-chip-neutral-soft",
			done: "bg-ok-soft",
			attention: "bg-warn-soft",
			failed: "bg-danger-soft",
		},
	},
	defaultVariants: { tone: "active" },
});

export const BANNER_GLYPH = matrix({
	base: "",
	variants: {
		tone: {
			active: "text-accent-ink",
			running: "text-accent-ink",
			waiting: "text-ink-meta",
			idle: "text-ink-meta",
			done: "text-ok",
			attention: "text-warn",
			failed: "text-danger",
		},
	},
	defaultVariants: { tone: "active" },
});

// ── Toast ───────────────────────────────────────────────────────

// The tone is the glyph's ink alone; the toast's ground is every tone's.
export const TOAST_STATE = matrix({
	base: "",
	variants: {
		tone: {
			active: "text-accent-ink",
			running: "text-accent-ink",
			waiting: "text-ink-meta",
			idle: "text-ink-meta",
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
			sheet: "gap-gap p-gap",
		},
	},
	defaultVariants: { form: "popover" },
});

// A menu's group of rows (its acts, or the destructive acts last): the first
// group stands alone, a group after another under a hairline between them.
export const MENU_GROUP = matrix({
	base: "",
	variants: {
		place: {
			first: "",
			after: "border-t border-edge pt-gap",
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

// The sheet on the desktop, raised over the scrim: a card centred over the
// page, its hairline and radius on all four sides. `fit` is what it holds: a
// form at the sheet's width (the sheet pattern's 610 to 730, not the dialog's)
// or a record's details at the pane's.
export const SHEET_DESKTOP = matrix({
	base: "bg-raised border border-edge-raised rounded-sheet shadow-modal",
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

// A Diff by word's runs on the diff's own grounds: the added run underlined, the
// removed run struck through, each a cue besides its ground's hue. The added
// run's underline is dotted in the `ok` ink, so it never reads as a link's.
export const PROSE_DIFF_RUN = matrix({
	base: "",
	variants: {
		kind: {
			added: "bg-ok-soft underline decoration-dotted decoration-ok",
			removed: "bg-danger-soft line-through",
		},
	},
});

// ── Code ────────────────────────────────────────────────────────────

// The code's text at the box inset or, beside the copy act's own
// column (no title), without the end inset that column carries.
export const CODE_TEXT = matrix({
	base: "",
	variants: {
		act: {
			none: "p-pad",
			beside: "py-pad pl-pad",
		},
	},
	defaultVariants: { act: "none" },
});

// ── Diff ────────────────────────────────────────────────────────────

// A unified diff's line at the code role, Code's line: its kind is its
// ground; the mark of the lines a diff does not show (`elided`), where two
// hunks part, on the group ground in the meta ink.
export const DIFF_LINE = matrix({
	base: "text-code leading-code font-normal font-mono",
	variants: {
		kind: {
			context: "text-ink-body",
			added: "text-ink-body bg-ok-soft",
			removed: "text-ink-body bg-danger-soft",
			elided: "bg-group text-ink-meta",
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
			you: "gap-gap",
			other: "gap-gap",
			system: "min-h-target",
		},
	},
});

// ── Stats meter ───────────────────────────────────────────────────────────

// A meter's fill by its level (`METER_NEAR`): under in the meta ink, near in
// the amber mark, over in `danger`; never the accent.
export const METER_FILL = matrix({
	base: `size-full ${FILL_X}`,
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
	base: `h-meter rounded-chip ${FILL_FADE}`,
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
			neutral: "bg-chart-neutral",
		},
	},
	defaultVariants: { series: "teal" },
});

// ── Image ───────────────────────────────────────────────────────────

// The frame an image stands in, a hairline on the page. A thumbnail is a
// square tile at its radius; the content fit takes its container's width and
// the card's radius, down to the height cap, where its width narrows to its
// aspect (the component's box) so the cap never crops the picture, and the
// narrowed box stands centred in its container. Waiting it
// is a skeleton and failed a group ground holding a glyph over the alt text,
// each at the loaded height: the thumbnail's side, and the content fit's
// aspect, which its consumer always gives since its bytes have none yet.
export const IMAGE = matrix({
	base: `border border-edge ${ANSWER}`,
	variants: {
		fit: {
			thumb: "size-image-tile rounded-control",
			content: "w-full max-h-image-cap self-center rounded-card",
		},
		state: {
			rest: "",
			loading: "bg-skeleton",
			error: "gap-gap p-gap bg-group",
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

// A node's role is its shape (`role`: its radius, and a decision's compact
// height) and its tone (`tone`: its ground and, at rest, its edge): `plain` the
// plain card, `strong` a decision's stronger edge, `accent` a start's pill,
// `attention` the wait on the operator, `muted` an end's pill; `off` and
// `dimmed` are the quiet a node draws over any role (an off node, a node off
// the path). A glyph's shape (`CANVAS_NODE_GLYPH`) and a card hold the same tones.
const NODE_GROUND = {
	plain: "bg-group",
	strong: "bg-group",
	accent: "bg-accent-soft",
	attention: "bg-warn-soft",
	muted: "bg-canvas",
	off: "bg-group",
	dimmed: "bg-group",
};

// The edge a tone draws at rest; a selection and a problem take it over.
const NODE_EDGES = [
	{ state: "rest", tone: "plain", class: "border-edge" },
	{ state: "rest", tone: "strong", class: "border-edge-strong" },
	{ state: "rest", tone: "accent", class: "border-accent-edge" },
	{ state: "rest", tone: "attention", class: "border-warn" },
	{ state: "rest", tone: "muted", class: "border-edge" },
	{ state: "rest", tone: "off", class: "border-edge" },
	{ state: "rest", tone: "dimmed", class: "border-edge" },
] as const;

// The colour of a node's outline: the tone's, the selection's, or the
// problem's. The path's `at` node draws `selected`.
const NODE_STATE = {
	rest: "",
	selected: "border-selected-outline",
	problem: "border-edge-error",
};

// A call node's second hairline, a step outside its edge: another graph runs
// here.
const CALL_EDGE = "outline-1 outline-offset-2 outline-edge";

// A node's box on the canvas's ground: a card, a decision's compact card, or a
// pill.
export const CANVAS_NODE = matrix({
	base: `w-node min-h-control gap-gap px-pad py-gap border ${ANSWER} ${LIFT}`,
	variants: {
		state: NODE_STATE,
		role: {
			step: "py-gap rounded-card",
			start: "py-gap rounded-full",
			decision: "py-gap rounded-card",
			wait: "py-gap rounded-card",
			call: `py-gap rounded-card ${CALL_EDGE}`,
			end: "py-gap rounded-full",
		},
		tone: NODE_GROUND,
	},
	compoundVariants: [...NODE_EDGES],
	defaultVariants: { state: "rest", role: "step", tone: "plain" },
});

// The ink of a node's icon by its tone, on the node's card and on its glyph
// alone; its words take their own (`CANVAS_NODE_TEXT`). A card eases it with its
// own answer; a glyph adds the path's tone, which never moves its scale.
export const CANVAS_NODE_INK = matrix({
	base: "",
	variants: {
		tone: {
			plain: "text-ink-body",
			strong: "text-ink-body",
			accent: "text-accent-ink",
			attention: "text-warn",
			muted: "text-ink-meta",
			off: "text-ink-meta",
			dimmed: "text-ink-disabled",
		},
	},
	defaultVariants: { tone: "plain" },
});

// A node's text: the type role rides on the part, the ink on the tone. A rest
// overline and line are meta, a rest title is body; off and dimmed recolour
// every part they reach. A problem's words keep the rest ink.
export const CANVAS_NODE_TEXT = matrix({
	base: PATH_TONE,
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

// A node under the text floor: the shape behind its glyph alone, in the
// control-sized box of its button, which holds the icon, the marks and the
// name. It is the node's box (`CANVAS_NODE`) in the role's form: a card, a
// circle for a pill, a square turned a quarter for a decision (a diamond, the
// box's inset less its corners), at the node's tone and outline. The glyph holds
// its size on screen by a scale the script sets with each zoom frame, so it
// eases its colours alone (`PATH_TONE`), never `ANSWER`, whose property list
// holds `scale`. A decision's mark on its card is the same shape.
export const CANVAS_NODE_GLYPH = matrix({
	base: `absolute -z-10 border ${PATH_TONE}`,
	variants: {
		state: NODE_STATE,
		role: {
			step: "inset-0 rounded-card",
			start: "inset-0 rounded-full",
			decision: "inset-gap rotate-45 rounded-chip",
			wait: "inset-0 rounded-card",
			call: `inset-0 rounded-card ${CALL_EDGE}`,
			end: "inset-0 rounded-full",
		},
		tone: NODE_GROUND,
	},
	compoundVariants: [...NODE_EDGES],
	defaultVariants: { state: "rest", role: "step", tone: "plain" },
});

// A node's name in the overview, between the full node and the glyph alone: the
// meta role (the caption role is the same size; they differ by ink, weight and
// place) in body ink at 500, on the canvas's own ground so an edge never strikes through
// it, one line cut at the short measure. The tone recolours it as
// it does the node's words (off meta, dimmed disabled).
export const CANVAS_NODE_NAME = matrix({
	base: `max-w-measure-short truncate whitespace-nowrap px-gap bg-canvas text-meta leading-meta font-medium ${PATH_TONE}`,
	variants: {
		tone: {
			rest: "text-ink-body",
			off: "text-ink-meta",
			dimmed: "text-ink-disabled",
		},
	},
	defaultVariants: { tone: "rest" },
});

// A group's dashed frame: the dash says a group, the outline's colour and a
// second pixel of line say it is selected (one dashed hairline in the accent
// reads faint on the dark ground). The second pixel is an inset outline over
// the same 1 px border box, so selecting moves nothing inside the frame.
export const CANVAS_GROUP = matrix({
	base: "rounded-card border border-dashed",
	variants: {
		state: {
			rest: "border-edge-strong",
			selected:
				"border-transparent outline-2 -outline-offset-2 outline-dashed outline-selected-outline",
		},
	},
	defaultVariants: { state: "rest" },
});

// ── Place ───────────────────────────────────────────────────────────

// The current place carries the current bar: a 3 px accent bar at its start,
// no rounded corner on that side. Every place holds the bar's width, clear, so
// a label does not move as the bar arrives. Selection is never a fill of the
// accent: the sidebar's place also takes the 6 percent wash.
export const CURRENT_BAR = "border-s-3 border-accent rounded-s-none";
// The bar's room at rest, drawn in nothing.
export const CURRENT_ROOM = "border-s-3 border-transparent";

// A place in the sidebar: a control-tall row under its state's wash; the label is
// `TEXT.body` with the ink of `PLACE_ROW_GLYPH`.
export const PLACE_ROW = matrix({
	base: `gap-gap min-h-control px-pad rounded-row ${CURRENT_ROOM} ${ANSWER}`,
	variants: {
		state: {
			rest: "",
			hover: "bg-wash-hover",
			active: "bg-wash-press",
			selected: `bg-ink-body/6 ${CURRENT_BAR}`,
			"selected-hover": `bg-ink-body/10 ${CURRENT_BAR}`,
		},
	},
	defaultVariants: { state: "rest" },
});

// The sidebar place's glyph and label: the meta ink until the place is selected.
export const PLACE_ROW_GLYPH = matrix({
	base: ANSWER,
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
	base: `py-gap rounded-none border-t-3 ${ANSWER} ${GIVE}`,
	variants: {
		state: {
			idle: "border-transparent text-ink-meta",
			selected: "border-accent text-ink-body",
		},
	},
	defaultVariants: { state: "idle" },
});

// The selected tab's label steps to 500: ink alone is the only other cue.
export const PLACE_TAB_LABEL = matrix({
	base: `text-caption leading-caption tracking-caption ${ANSWER}`,
	variants: {
		state: {
			idle: "font-normal text-ink-meta",
			selected: "font-medium text-ink-body",
		},
	},
	defaultVariants: { state: "idle" },
});

// ── Section ─────────────────────────────────────────────────────────

// ── Columns ─────────────────────────────────────────────────────────

// A page's sections side by side. `fit` is where they stand: `board` is a
// row scrolling sideways from the page inset (a web overlay bleeds it to the
// the place's edge and sets each child at the `column` width in a grid track;
// the phone's children stand at their own width); `half` is two to a row filling the
// body from the place's `desktop` width and stacking in order below it (a
// web overlay), at the sections rhythm between rows and columns. The phone
// stacks every fit.
export const COLUMNS = matrix({
	base: "",
	variants: {
		fit: {
			board: "gap-stack px-page",
			half: "gap-section",
		},
	},
	defaultVariants: { fit: "board" },
});

// ── Paint ───────────────────────────────────────────────────────────

// What a part draws while its data is not here: the filler the part would
// hold, filled (`glyphs`: a text, figure or id slot's own line boxes, the ink
// transparent), the part's own box with its content not drawn (`box`: a
// mark or a block), or a control's own box with its content invisible and the
// control inert (`control`). Each component paints its own box, so the
// painted form measures as the loaded one.
export const PAINT = matrix({
	base: "bg-skeleton",
	variants: {
		kind: {
			glyphs: "text-transparent rounded-chip",
			box: "",
			control: "border-transparent",
		},
	},
});
