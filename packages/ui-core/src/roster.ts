// The roster as data: every component both UI plugins ship, its layer, the
// prop names it takes, the cells it draws, the tokens it owns, the moves it
// makes and the states it has, the same in both. DESIGN.md is emitted from it
// and the showcase draws each component in exactly the states its entry lists.

import type {
	ColorName,
	Move,
	RadiusRole,
	ShadowLevel,
	Size,
	SpacingRole,
	TypeRole,
	Width,
} from "./tokens.ts";

export const LAYERS = ["atom", "layout", "shared", "content"] as const;
export type Layer = (typeof LAYERS)[number];

export const PLATFORMS = ["web", "native"] as const;
export type Platform = (typeof PLATFORMS)[number];

// The states a component can be drawn in: the eight interaction states, plus
// `empty` for a component with an empty form, and the states a read puts a
// frame or collection in: busy, stale, paused, more, streaming. The showcase
// draws each component in exactly the states its entry lists.
export const STATES = [
	"rest",
	"hover",
	"focus",
	"active",
	"disabled",
	"loading",
	"pending",
	"error",
	"selected",
	"empty",
	"busy",
	"stale",
	"paused",
	"more",
	"streaming",
] as const;
export type State = (typeof STATES)[number];

// The tokens a component may draw, by namespace: type roles, colours,
// radii, spacing roles, sizes and widths, shadow levels. A colour is a name,
// or a family prefix ending in `-` (`chip-` covers every chip role); every
// other namespace names its tokens. A namespace left out owns nothing.
export interface Owns {
	roles?: readonly TypeRole[];
	colors?: readonly (ColorName | `${string}-`)[];
	radii?: readonly RadiusRole[];
	spacing?: readonly SpacingRole[];
	sizes?: readonly (Size | Width)[];
	elevation?: readonly ShadowLevel[];
}

// A component's prop names, the cells it draws (a `FAMILIES` name for every
// cell of that family, `FAMILY.axis.value` for one of its cells, or a
// single-cell constant of `./variants`), the states it has a form for and the
// tokens it owns.
export interface RosterEntry {
	props: readonly string[];
	draws: readonly string[];
	states: readonly State[];
	// The motion moves it makes (`MOVES`).
	motion: readonly Move[];
	owns?: Owns;
	// The platforms that ship it; absent means both.
	platforms?: readonly Platform[];
}

// A pressable control's four.
const PRESS = ["rest", "hover", "focus", "active"] as const;

export const ROSTER: Record<Layer, Record<string, RosterEntry>> = {
	atom: {
		// A paragraph in a type role; `children` are runs: words, with `{ strong }` runs at
		// weight 500 (only the weight, the line's role, ink and family inherited) and
		// `{ code }` runs.
		Text: {
			props: ["role", "children"],
			draws: [
				"TEXT.role.body",
				"TEXT.role.meta",
				"TEXT_STRONG.role.body",
				"TEXT_STRONG.role.meta",
			],
			states: ["rest"],
			motion: [],
			owns: {
				roles: ["body", "meta"],
				colors: ["ink-body", "ink-meta"],
				sizes: ["measure"],
			},
		},
		// One act in three forms. Labelled it runs: its label, a glyph before it
		// and a count after it, pending after the press, blocked with a reason.
		// With an `href` it is the link form: an anchor to a route or an external
		// URL that runs nothing, in an act's look or, with no `act`, in accent
		// ink in the line it sits in (`inline`) or on the target height. With
		// `glyph` the icon alone, the label its accessible name and its
		// tooltip: square, no boundary at rest, a field's end at the `field`
		// fit.
		// A press runs the act's wiring in one order: its `confirm` asked as a
		// decision over the page (declined, nothing runs), its `onAct`, its `done`
		// toasted, then its `to` followed; a `sheet` is opened in place of `onAct`
		// and closed on dismiss or once its submit resolves. The labelled and icon
		// forms take all four, and every host that draws an act hands them on.
		Button: {
			props: [
				"act",
				"fit",
				"icon",
				"label",
				"count",
				"wait",
				"onAct",
				"confirm",
				"done",
				"to",
				"sheet",
				"blocked",
				"href",
				"glyph",
			],
			draws: [
				"BUTTON",
				"BUTTON_LABEL",
				"ICON.fit.control",
				"COUNT_LABEL",
				"ICON_BUTTON",
				"LINK",
				"LINK_TARGET",
				"TOOLTIP",
				"LAYER_TOOLTIP",
				"PAINT.kind.control",
				"LINE_IN",
				"SWAP_IN",
				"SWAP_OUT",
			],
			states: [...PRESS, "disabled", "pending"],
			motion: ["answer", "give", "layer", "line", "value", "wait"],
			owns: {
				roles: ["body", "meta", "caption"],
				colors: [
					"skeleton",
					"act-",
					"on-act-",
					"accent-ink",
					"edge",
					"ink-body",
					"ink-meta",
					"danger",
					"wash-hover",
					"wash-press",
					"fill-disabled",
					"ink-disabled",
					"ring",
					"raised",
					"edge-raised",
				],
				radii: ["control"],
				spacing: ["gap", "pad"],
				elevation: ["float"],
				sizes: [
					"control",
					"icon-control",
					"target",
					"hairline",
					"measure-short",
				],
			},
		},
		// What is typed or picked, by `kind`. A line of text (`text`, `search`,
		// `secret`, `source`, `number`, `email`, `date`); `prose`, many lines in a box that
		// grows from three, its `budget` counted under it; `code`, a one-time
		// code, a box per digit over one input, checked when the last lands; `file`,
		// the field box that chooses a file: empty, its whole box is the act (a
		// leading glyph and the `chooseFile` word); chosen, the name, the size and
		// an act that removes it. The web's file box also takes a dropped file,
		// ringed while one is over it. A file of another type is refused in a line
		// under the box and never reaches `onChange`.
		// Every control is a field, named by its `label`, one drawer for them
		// all (the `FormField` body): placed alone it draws its field, the name
		// over the control a gap apart (`FIELD_ALONE`; a toggle at the end of its
		// name's line, `FIELD_ALONE_LINE`; a slider's head is its name) with the
		// word `optional` under the name, and the `description` or the `error` (a
		// refused save's reason, until the next change) under the control. Where
		// an owner names it (a Form's field, a Toolbar) and at a fit that reads
		// the label in its box (`search`, a Picker's `bar`, `row` and `pill`), the
		// label is its accessible name and nothing is drawn around it. A place's
		// tabs are links, no control, and take none.
		Input: {
			props: [
				"label",
				"description",
				"optional",
				"error",
				"kind",
				"value",
				"onChange",
				"onCommit",
				"placeholder",
				"unit",
				"act",
				"autoFocus",
				"source",
				"budget",
				"length",
				"onComplete",
				"accept",
			],
			draws: [
				"FIELD_ALONE",
				"FIELD_ALONE_LINE",
				"DEFINITION_NAME",
				"FIELD_OPTIONAL",
				"FIELD",
				"FIELD_VALUE",
				"FIELD_PLACEHOLDER",
				"FIELD_UNIT",
				"FIELD_GLYPH",
				"FIELD_ERROR_LINE",
				"TEXT_AREA",
				"TEXT_AREA_BUDGET",
				"TEXT_AREA_VALUE",
				"OTP",
				"OTP_BOX",
				"OTP_DIGIT",
				"TEXT.role.meta",
				"FIGURES",
				"ICON.fit.control",
				"SPINNER",
				"LINE_IN",
				"PAINT.kind.control",
			],
			states: [
				"rest",
				"hover",
				"focus",
				"disabled",
				"error",
				"empty",
				"pending",
			],
			motion: ["answer", "line", "wait"],
			owns: {
				roles: ["body", "code", "meta", "caption", "heading"],
				colors: [
					"skeleton",
					"surface",
					"edge",
					"edge-hover",
					"edge-error",
					"ink-body",
					"ink-meta",
					"ink-error",
					"fill-disabled",
					"ink-disabled",
					"ring",
				],
				radii: ["control"],
				spacing: ["gap", "pad"],
				sizes: ["icon-control", "measure-short", "otp", "spinner", "text-area"],
			},
		},
		// A number along a range, its name and value over the track: a field as
		// every control is (`Input`), its head the name.
		Slider: {
			props: [
				"label",
				"description",
				"optional",
				"error",
				"value",
				"onChange",
				"onCommit",
				"min",
				"max",
				"step",
				"unit",
			],
			draws: [
				"FIELD_ALONE",
				"FIELD_ERROR_LINE",
				"SLIDER",
				"SLIDER_HEAD",
				"SLIDER_LABEL",
				"SLIDER_VALUE",
				"SLIDER_TRACK",
				"SLIDER_FILL",
				"SLIDER_REST",
				"SLIDER_THUMB",
				"PAINT.kind.control",
			],
			states: [...PRESS, "disabled"],
			motion: ["answer", "wait"],
			owns: {
				roles: ["body", "meta"],
				colors: [
					"skeleton",
					"ink-body",
					"ink-meta",
					"toggle-",
					"edge",
					"edge-strong",
					"surface",
					"wash-hover",
					"wash-press",
					"fill-disabled",
					"ink-disabled",
					"ring",
				],
				radii: ["full", "chip"],
				spacing: ["gap", "stack", "pad"],
				sizes: ["target", "track", "thumb", "measure-short"],
			},
		},
		// The one boolean control: a track and its thumb, drawn inside a
		// target-sized hit box, a field as every control is (`Input`). The tick a row, a table's cell or an option draws
		// for a choice among others is that owner's part, with its `mixed` state.
		Switch: {
			props: [
				"label",
				"description",
				"optional",
				"error",
				"checked",
				"onChange",
			],
			draws: [
				"FIELD_ALONE",
				"FIELD_ALONE_LINE",
				"DEFINITION_NAME",
				"FIELD_OPTIONAL",
				"FIELD_ERROR_LINE",
				"SWITCH",
				"SWITCH_THUMB",
				"PAINT.kind.control",
			],
			states: [...PRESS, "disabled", "selected"],
			motion: ["answer", "toggle", "wait"],
			owns: {
				colors: [
					"skeleton",
					"switch-",
					"toggle-",
					"fill-disabled",
					"ink-disabled",
					"ring",
				],
				radii: ["full"],
				sizes: [
					"switch-w",
					"switch-h",
					"thumb",
					"switch-inset",
					"switch-travel",
					"target",
				],
			},
		},
	},
	layout: {
		// A column of the Shell's place: its bar over one hairline (the back act, drawn as
		// Back where the Pane stands alone and as Close where one stands before
		// it; on touch the shell's switcher leading where there is none; the
		// title; the actions and more) and a body that scrolls, its children a
		// sections gap apart within the measure (the Pane's width when `wide`).
		// A `foot` (a field) docks under the body and spans it; a `Table` with
		// `select` in the Pane draws its selection bar there itself. A `Thread`'s composer keeps its own measure column. A `sheet` docks there
		// in the foot's place while it is open, the Pane measuring the foot's
		// region for it. The `empty` of its `read` stands in place of the children,
		// centred in what the body leaves (the sentence at meta, the act the filled
		// one with the plus); it answers for the Pane's own read, so a Pane with
		// none takes no `empty`. A `cover` Pane spans
		// its Place, the Panes before it hidden. On a record's Pane the title is the
		// record's name (a `Run`, the generic word for the kind while it loads)
		// and the actions and more are the record's acts; its `record` puts the
		// record's place (`within`) in the bar and opens the body with the head,
		// where the name stands whole, wrapping, as the Pane's heading. The last
		// Pane of a Place names the page: its name is the page's one `h1` and its
		// Sections start at `h2`; a Pane with another after it draws its name at
		// `h2` and its Sections start at `h3`. The head of a record is the Pane's
		// own: the place (`within`) in the bar, then the overline and the facts at
		// the body's top, the name between them. A part, a fact or the name that is
		// a selection paints in its place while its read waits, and draws nothing
		// once it ended (a status or a pick keeps its form, any other is a word),
		// and the head is inert; each line keeps its line box and the facts line the
		// height of the status that moves on it. A fact in words that opens a sheet
		// is its words and a chevron in a `WORD_ACT`, a button named by the fact;
		// one that goes to a route is the same box as a link. A `read` that answers
		// not found fills the page with the missing form, no mark, the sentence in
		// the meta ink (worded by `noun`, "Couldn't find this." without one) and the
		// `back` as the hairline act with no plus, on the `error` state's cells.
		// `back` is the route the router gives as the Pane's parent when none is
		// set (`false` draws none), and the bar's acts carry the same wiring a
		// Button's act does.
		Pane: {
			props: [
				"title",
				"record",
				"noun",
				"back",
				"actions",
				"more",
				"foot",
				"sheet",
				"read",
				"empty",
				"cover",
				"wide",
				"children",
			],
			draws: [
				"TITLE_CODE",
				"PAGE_WITHIN",
				"PAGE_WITHIN_SEP",
				"PAGE_HEAD",
				"PAGE_HEAD_ROOM",
				"PAGE_TOP_BAR",
				"PAGE_TOP_BAR_START",
				"PAGE_TOP_BAR_END",
				"PAGE_TITLE_FLOOR",
				"TEXT.role.title",
				"PAGE_BODY",
				"FOOT_DOCKED",
				"PAGE_BODY_OVER_FOOT",
				"ICON_BUTTON.fit.body",
				"ICON_BUTTON_DESTRUCTIVE",
				"EMPTY_COLUMN",
				"EMPTY_TEXT",
				"EMPTY_LINE",
				"EMPTY_PART",
				"EMPTY_SENTENCE",
				"EMPTY_MARK",
				"ICON.fit.control",
				"TEXT.role.heading",
				"TEXT.role.meta",
				"PAINT.kind.glyphs",
				"SCRAMBLE",
				"PAINT.kind.control",
				"BLOCK_IN",
				"ITEM_HEADER",
				"ITEM_FACTS",
				"ITEM_FACT",
				"WORD_ACT",
				"ICON.fit.meta",
				"STATUS",
				"STATUS_DOT",
				"STATUS_SPINNER",
				"STATUS_LABEL",
				"SPINNER",
				"SPINNER_TRACK",
				"SPINNER_ARC",
				"COUNT",
				"COUNT_LABEL",
				"PAINT.kind.box",
				"CARD_PART",
				"BUTTON.act.secondary",
				"BUTTON.fit.body",
				"BUTTON_LABEL.act.secondary",
			],
			states: ["rest", "loading", "empty", "error", "busy", "stale", "paused"],
			motion: ["answer", "give", "block", "wait"],
			owns: {
				roles: ["title", "heading", "body", "meta", "caption"],
				colors: [
					"skeleton",
					"ink-body",
					"ink-meta",
					"ink-mark",
					"edge",
					"edge-raised",
					"raised",
					"wash-hover",
					"wash-press",
					"fill-neutral",
					"accent-ink",
					"ok",
					"warn",
					"ring",
					"chip-amber",
					"danger",
					"edge-strong",
				],
				radii: ["card", "control", "chip", "full"],
				spacing: ["gap", "page", "section", "stack", "pad"],
				sizes: [
					"control",
					"icon-inset",
					"measure",
					"measure-short",
					"target",
					"list",
					"region-min",
					"empty",
					"icon-control",
					"icon-meta",
					"dot",
					"spinner",
				],
			},
		},
		// A page outside the shell (sign-in, a consent step), a root frame as the
		// Shell is: one centred column at the `auth` width holding the
		// step: the app's mark (a lockup of its logo and name the app gives the UI
		// plugin once; a drawn lockup 40 tall), an optional `StepCount`, the title
		// (the page's one `h1`), the description (runs with the strong one at 500),
		// a `Banner` and the step's body, a fields gap between every part. It hosts
		// `toast()` and `confirm()`. On touch it spans the viewport inside the page
		// inset and the step stands at the top. The first field of a step takes
		// focus, and its `form` (a Form's props over the step's procedure, drawn after
		// the children) draws its bar `full`; a step with local state only draws its
		// controls in its children. The title is required, the page's one `h1`: a first run
		// is a titled Gate whose children are its `Button`s.
		Gate: {
			props: ["title", "description", "step", "banner", "form", "children"],
			draws: [
				"BLOCK_IN",
				"GATE",
				"GATE_COLUMN",
				"GATE_STEP",
				"GATE_MARK",
				"GATE_MARK_ROW",
				"GATE_LOGO",
				"STEP_COUNT",
				"STEP_COUNT_SEGMENTS",
				"STEP_COUNT_SEGMENT",
				"TEXT.role.title",
				"TEXT.role.meta",
				"TEXT.role.body",
				"TEXT_STRONG.role.body",
				"BUTTON.act.primary",
				"BUTTON.fit.body",
				"BUTTON_LABEL.act.primary",
			],
			states: ["rest"],
			motion: ["answer", "give", "block"],
			owns: {
				roles: ["title", "meta", "body"],
				colors: [
					"ink-body",
					"ink-meta",
					"surface",
					"fill-neutral",
					"act-accent",
					"on-act-accent",
				],
				radii: ["full", "control"],
				spacing: ["page", "section", "stack", "gap", "pad"],
				sizes: [
					"auth",
					"avatar",
					"gate-mark",
					"empty",
					"control",
					"icon-control",
				],
			},
		},
		// The fold toggle is the title line; a blocked act's reason stands on
		// its own line under the head row. Its count is the loaded rows' (with
		// `items`), never drawn while the body waits.
		// `description` paints where it will stand while its selection waits; loaded,
		// `""` draws no line, as an undefined one, and so does one whose read
		// ended, the read's holder saying why once. Titled, the head stands over the
		// body; a Section with `items` and no `title` draws the sheet alone.
		// With `children` the body is its parts a fields gap apart, each a card of
		// its own (a Form, a Table, or a `Card` around anything else); the Section
		// draws no card and reads nothing of its children. The `empty` of its
		// `read` stands in its body's place on a card of its own; a Section with no
		// `read` takes no `empty`. The title is the heading size, folded or not,
		// and no Section stands in a Section.
		// With `items`, constants or a selection, the body is the sheet of its
		// rows on the card (`GROUP`), the card's hairline once between them; a row
		// is a row item or a file. While the selection's read waits
		// it paints `PAINT_ROWS` rows, a title over a meta line: inert, with no
		// link, a tree drawn flat. It is a frame of its items: its failed, missing
		// and empty forms are its own, in the sheet's place with the generic
		// sentences (Retry where it fails), whatever stands above it; it draws the
		// stale and paused line above its rows when it holds its read. A frame
		// above that holds the same read unmounts it when the read fails and alone
		// draws the failure. A row with `children` makes it a tree: the rows
		// abut, each level one step in, and the Section owns which branches are
		// folded (open by default), handing every row its depth and fold.
		// `groups` draws a band (`LIST_BAND`, a `band` tall) over the rows of each
		// group, in the groups' order: the label at the body role at 500, the count
		// of its rows (none when empty, in the meta ink) and its icon act at the
		// end, closed by a rule in the body ink and with none above it. Rows with no
		// group stand before the first band; in a tree the group is the root rows'.
		// A painted sheet draws none. Over a pages read it ends in its more row
		// (`more`): "Show more" while a next page remains, pressed by the viewer;
		// `PAINT_ROWS` painted rows while that page loads; "Couldn't load more" with
		// Retry when it failed. An empty first page with more is not empty: the next
		// page is fetched at once. The frame is not busy for a next page and draws
		// no count while more remains. The Table ends the same way.
		// A row is one box on the sheet whatever it holds: a leading slot (the
		// `change` mark in a lane one icon wide, glyph only, the kind's word its
		// name, ahead of the `leading` mark; a set's untouched rows are `unchanged`,
		// so the titles line up), a text group (`ROW_TEXT`: the title over its meta
		// line, which the row's marks lead: the status's dot and word, a warning,
		// a lock, a Chip, the boolean `marks` (the required ring, a flag), each its
		// glyph and its word, then the meta parts, wrapping whole) and an end group
		// (`ROW_END`), in one order: the trailing value (cut to the room the rest
		// leave), a `switch`, a `pick`, the `act` (an icon act, its label the
		// accessible name and the tooltip; the row's other acts are its `more`),
		// the copy act, the `more` act and a tree's fold, centred on the row. A
		// row with nothing at its end draws none. A `label` puts the row in the sheet's two columns
		// (`DEFINITION_BOX`): the label at the body role in the meta ink (a
		// `{ code }` label in the code role) in a column as wide as the widest label of the Pane, the
		// line in the second; on touch the line stands under the label. A row
		// without one starts its text group at the row's start. Either way the meta
		// parts follow the title on its line, cut at the end of the line, and stand
		// under it (with a mark, `entry`, `steps` or `wrap`, on touch, or below the
		// row's one-line width, `ROW_ONE_LINE`, a container query of the row and
		// never a measure of its content); the end group is centred on the row. The title is words (truncated unless `wrap`), a `{ code }` (cut in its
		// middle; with `copy` the mono with a copy act), `{ absent }` (meta ink) or a
		// status (its compact pill at the title's start). A `selected` row is the
		// open record, washed as one at its `href` is; the open row carries the
		// current bar (`CURRENT_BAR`), every other row the bar's room
		// (`CURRENT_ROOM`). A row that opens (`href` or `onOpen`) draws no
		// chevron: the wash and the pointer say it. An `entry` (an Input at the bar
		// fit and its labelled Button) stands under the title in the meta line's
		// place, its error under it. A `leading` of `check` is the row's tick, a
		// checkbox named by the title; its `blocked` reason draws it disabled and
		// leads the meta parts. A `leading` of `mark` is a type's mark (`ROW_MARK`,
		// in the family's hue); its `label` names it (accessible name and tooltip),
		// else it is decorative. A `dim` row stands off a highlighted path; `steps`
		// stand in the meta line's place while the row's act pends; `wrap` is a
		// title read whole. In a tree a row reads its depth and fold from the
		// Section: a rail per level (`TREE_RAIL`, one `indent` step). One lock mark:
		// the meta glyph and its reason, a link to what holds the fact with an
		// `href`, inert without one; a locked
		// row takes no act or open. A one-word `{ code }` of more than eight
		// characters too long for its room cuts in its middle (`valueCut`).
		// `title`, `meta`, a `switch`'s `checked` and a `pick`'s `options` and
		// `value` are data: a selection paints in its place, the row inert, while
		// its read waits. The row is the frame of the selections it draws: one that
		// failed, with no frame above holding it, makes the failed form (the label
		// stays; the end shows the alert and the retry icon; the meta line reads
		// `readFailed`, and pressing the row retries); a read a frame above holds
		// is that frame's to say.
		// A file row is one line, the path cut as text by the component to the room
		// its chip leaves, each count in its own lane, the change mark in a lane
		// before the glyph. At most one Chip, between the path and the counts.
		// The marks a row draws from its data are the Section's states: a status
		// (its tone's dot beside its word, a spinner in the dot's place while
		// `running`, a state chip when it carries its own `label`), a chip, an avatar,
		// a glyph, a count and a `more` menu (a popover on the desktop, a sheet on
		// touch). Other frames draw the same marks from their own data.
		// Every act a Section draws (its head act and more, a band's act, a row's act
		// and more, an empty form's act) carries its `confirm`, `done`, `to` and
		// `sheet` as a Button's act does; a row's act that opens a `sheet` draws the
		// sheet beside the row.
		Section: {
			props: [
				"title",
				"description",
				"folded",
				"onToggle",
				"act",
				"more",
				"items",
				"groups",
				"read",
				"empty",
				"children",
			],
			draws: [
				"SECTION",
				"SECTION_HEAD",
				"PAGE_TITLE_FLOOR",
				"SECTION_HEAD_ROW",
				"SECTION_ACTS",
				"SECTION_BODY",
				"SECTION_TITLE",
				"SECTION_LABEL",
				"SECTION_TOGGLE",
				"TEXT.role.heading",
				"TEXT.role.meta",
				"TEXT.role.body",
				"TEXT_STRONG.role.body",
				"EMPTY_COLUMN",
				"EMPTY_TEXT",
				"EMPTY_LINE",
				"EMPTY_SENTENCE",
				"CARD_PART",
				"EMPTY_MARK",
				"ICON.fit.control",
				"ICON.fit.body",
				"COUNT",
				"COUNT_LABEL",
				"BUTTON.act.secondary",
				"BUTTON.act.destructive",
				"BUTTON_LABEL.act.secondary",
				"BUTTON_LABEL.act.destructive",
				"PAINT.kind.glyphs",
				"SCRAMBLE",
				"PAINT.kind.control",
				"TEXT.role.caption",
				"LINE_BOX.role.meta",
				"CHEVRON",
				"GROUP",
				"LIST_BAND",
				"BLOCK_IN",
				"CODE_NAME",
				"ROW.state.rest",
				"ROW.state.highlighted",
				"ROW.state.pressed",
				"ROW.state.selected",
				"ROW.state.selected-hover",
				"ROW_TITLE",
				"ROW_INLINE",
				"ROW_MARK",
				"CURRENT_BAR",
				"CURRENT_ROOM",
				"ROW_STEPS",
				"ROW_STEP",
				"TREE_RAIL",
				"TREE_BLEED",
				"ROW_LEADING",
				"ROW_LEADING_STATUS",
				"ROW_TEXT",
				"ROW_END",
				"ROW_TEXT_FLOOR",
				"ROW_META_LINE",
				"ROW_TRAILING",
				"ROW_MARKS",
				"ROW_WARNING",
				"LOCK_GLYPH",
				"ROW_ACTS",
				"CHANGE_MARK",
				"CHECKBOX",
				"CHECKBOX_MARK",
				"ICON",
				"AVATAR",
				"AVATAR_LABEL",
				"STATUS",
				"STATUS_DOT",
				"STATE_CHIP",
				"STATE_CHIP_LABEL",
				"STATUS_SPINNER",
				"STATUS_LABEL",
				"SPINNER",
				"SPINNER_TRACK",
				"SPINNER_ARC",
				"BUSY_GLYPHS",
				"MENU",
				"MENU_GROUP",
				"MENU_LABEL",
				"CHIP",
				"CHIP_DOT",
				"CHIP_LABEL",
				"FIELD.trailing.none",
				"FIELD.state.rest",
				"FIELD.state.error",
				"FIELD_VALUE.kind.text",
				"FIELD_PLACEHOLDER",
				"ROW_ENTRY",
				"FIELD_ERROR_LINE",
				"LINE_BOX.role.body",
				"PAINT.kind.box",
				"LINE_IN",
				"DEFINITION_BOX",
				"DEFINITION_LINE",
				"DEFINITION_UNDER",
				"DEFINITION_LABEL",
				"DEFINITION_NAME",
				"DEFINITION_VALUE",
				"DEFINITION_ABSENT",
				"ROW_RETRY",
				"TEXT.role.code",
				"LINK.fit.inline",
				"FILE_COUNT",
				"FILE_COUNT_YIELD",
				"FILE_COUNTS",
				"FILE_PATH",
				"FILE_PATH_PART",
				"SWAP_IN",
				"SWAP_OUT",
			],
			states: [
				"rest",
				"hover",
				"focus",
				"active",
				"disabled",
				"loading",
				"empty",
				"error",
				"busy",
				"stale",
				"paused",
				"more",
				"selected",
			],
			motion: ["answer", "give", "toggle", "wait", "block", "line", "value"],
			owns: {
				roles: ["heading", "meta", "body", "caption", "code"],
				colors: [
					"ink-body",
					"ink-meta",
					"edge",
					"skeleton",
					"wash-hover",
					"wash-press",
					"ring",
					"danger",
					"fill-neutral",
					"band",
					"ink-mark",
					"surface",
					"ink-disabled",
					"ink-error",
					"edge-error",
					"wash-selected",
					"wash-selected-hover",
					"accent-ink",
					"ok",
					"warn",
					"chip-amber",
					"avatar-",
					"chip-",
					"fill-disabled",
					"edge-strong",
					"toggle-on",
					"toggle-on-hover",
					"on-accent",
				],
				radii: ["row", "control", "chip", "card", "full"],
				spacing: ["gap", "stack", "pad"],
				sizes: [
					"icon",
					"target",
					"empty",
					"control",
					"icon-control",
					"avatar",
					"icon-meta",
					"dot",
					"spinner",
					"measure-short",
					"chip",
					"chip-compact",
					"row",
					"row-2",
					"figures",
					"check",
					"indent",
					"line-body",
					"measure",
					"switch-w",
					"switch-h",
				],
			},
		},
		// A card for a part of a Section's body that draws none of its own (a
		// Prose, a Stats, a Table, a Stages, an Image): the surface inside a
		// hairline, its `children` at the card's inset. A Section's sheet, a Form and
		// a Table are cards of their own and never stand in one.
		Card: {
			props: ["children"],
			draws: ["CARD_PART", "CARD_BODY"],
			states: ["rest"],
			motion: [],
			owns: {
				colors: ["edge", "surface"],
				radii: ["card"],
				spacing: ["pad", "stack"],
			},
		},
		// A form is its procedure and its field labels. `act` is the procedure it
		// submits and `fields` the input's keys it shows (in order, or `groups`, each
		// a run of the form's rows under a band, the title at the heading role over
		// the description); `given` is what the screen supplies and `values` the
		// fields' first values (a selection paints them until its read lands). Each
		// field is drawn from the procedure's input schema: a string a line of text
		// (or prose, source, one-time code boxes, a date by its hint), an enum a pick, a boolean a switch, a
		// number a numeric line, a list of an enum a pick of several, a date a date
		// line (`Input kind=date`), a string with the `source` hint the mono text area (`Input kind=prose source`) and with the `code` hint the one-time code boxes (`Input kind=code`, `length` the schema's fixed length, the submit blocked until every box is filled), a string with the `file` hint a file pick
		// (`Input kind=file`, its `accept`) whose picked file is read into the
		// string, text or base64; a field the schema makes optional offers the empty
		// choice and says `optional` under its label in the meta ink, and one it
		// requires blocks the submit while it is empty. The field is a definition row
		// (its label in the label column, as wide as the form's widest, its control
		// filling the value line, a switch at its end, the description or the issue
		// the server's schema refused under the control, in error); a refusal of a
		// field stands until it is changed. `submit` words the form's last row under
		// a hairline across it, the bar whose filled act submits the form and whose
		// other acts stand inert beside it while it runs: pending after the act
		// delay, a rejection in the bar's kept line under the acts (`error`), the act
		// ready again. `acts` stand in that bar before the filled act (a Cancel, a
		// destructive Decline with `confirm`), run as any bar's acts; with
		// `commit: "field"` they stand in a bar of their own under the fields.
		// `onDone` hears the output and the input the form sent. A field with `locked` stands inert with the reason in the
		// description's place. A field's `control` hint draws what the schema cannot say; `lines` draws a list as a line per item (blank lines dropped, each line read as the item type, a line that fits none the field's issue) and `json` an object as mono JSON source (parsed at commit, a parse error the field's issue). `commit: "field"` draws no bar: each field sends `given`
		// and its own key when its control commits (a text on blur or Enter, a
		// switch or a pick on its change, a file as picked), draws its own refusal,
		// and `submit`'s `done` is toasted per commit; a settings page is such a form.
		// `can` is the ability the caller needs, `[action, subject]` in the
		// route's organization: a caller who may not has the fields and the act
		// disabled under the word `denied`, the form painted until the ability lands. A Form placed alone and a Gate's `form` are a card of
		// rows, the Gate's bar across the column; a Sheet's `form` is rows flush on
		// the sheet after the body's parts, its bar stuck to the body's foot (web),
		// in the sheet's pinned foot (phone). The bar paints its filled act, inert,
		// while the form's own read waits (a sheet's too), and stands blocked with
		// the failed sentence once that read failed or is missing; a group's read is
		// the group's and never reaches the bar. The form draws no busy mark of its
		// own for an act that runs. The drawers a form is made of, which no app
		// places: the field it draws for each key and the bar of acts that
		// submits.
		Form: {
			props: [
				"act",
				"fields",
				"groups",
				"given",
				"values",
				"commit",
				"submit",
				"acts",
				"onDone",
				"can",
				"read",
				"empty",
			],
			draws: [
				"BLOCK_IN",
				"FORM_FOOT",
				"FORM_GROUP",
				"FORM_FOOT_STUCK",
				"ROWS",
				"CARD",
				"GROUP_ITEM",
				"LIST_BAND",
				"TEXT.role.heading",
				"TEXT.role.meta",
				"FIELD_ERROR_LINE",
				"FIELD_OPTIONAL",
				"FORM_FIELD_SUMMARY_GLYPH",
				"ROW.state.rest",
				"DEFINITION_BOX",
				"DEFINITION_LINE",
				"DEFINITION_UNDER",
				"DEFINITION_LABEL",
				"DEFINITION_NAME",
				"DEFINITION_VALUE",
				"ROW_END",
				"CHANGE_MARK",
				"ICON.fit.body",
				"ICON.fit.meta",
				"LINE_BOX.role.body",
				"TEXT.role.body",
				"TEXT_STRONG.role.body",
				"PAINT.kind.control",
				"LINE_IN",
				"ACTION_BAR",
				"ACTION_BAR_ACTS",
				"BUTTON.act.primary",
				"BUTTON.fit.body",
				"BUTTON.fit.field",
				"BUTTON_LABEL.act.primary",
			],
			states: [
				"rest",
				"loading",
				"empty",
				"error",
				"busy",
				"stale",
				"paused",
				"disabled",
				"pending",
			],
			motion: ["block", "answer", "give", "line", "wait", "value"],
			owns: {
				roles: ["heading", "body", "meta"],
				colors: [
					"edge",
					"ink-body",
					"ink-meta",
					"raised",
					"skeleton",
					"ink-error",
					"ink-disabled",
					"ok",
					"warn",
					"chip-amber",
					"danger",
					"act-accent",
					"on-act-accent",
					"act-danger",
					"on-act-danger",
					"wash-hover",
					"wash-press",
					"group",
				],
				spacing: ["stack", "section", "gap", "pad"],
				sizes: [
					"measure",
					"icon",
					"icon-meta",
					"control",
					"target",
					"measure-short",
					"track",
					"spinner",
				],
				radii: ["control", "full"],
			},
		},
		// The tabs, the search, the filters, the acts and the applied filters' chips
		// over a list. `tabs` are links, each a label and an href, drawn as a
		// `Picker` in `fit: segments`. `filters` are data, each a `Picker`'s own props in a toolbar (a
		// pick of one, `value` a string while set, or of several, set while it
		// holds any): on the desktop two or fewer stand inline as picks (a set one reads "Label:
		// value", an unset one or one on its `null` option its label alone) and
		// three or more (`FOLD_FILTERS_AT`, one constant for both platforms) fold,
		// and at touch every filter folds, all of them, behind one outlined Filters act with the count of those set
		// after its label ("Filters 2", Deel's count beside the select's name),
		// opening the filters as labelled picks that apply at once: a popover
		// under the act at the column's width on the desktop, a sheet on touch,
		// "Clear filters" at its end while any is set. Each set filter of a folded
		// toolbar is a removable neutral chip, "Work type: Change" (a pick of
		// several its one value, from two "Projects: 5 projects"), first in the
		// chips row before the toolbar's own `chips`; removing one sets the filter
		// to its empty value (`null`, `[]` for several), so nothing set is hidden.
		// The words are `filters` and `clearFilters`, and `tabs` names the tab strip's
		// navigation landmark. `options` may be a read, as a
		// `Picker`'s: while it waits the chip paints, and once it ended it draws
		// none (the picker's line says why).
		Toolbar: {
			props: ["tabs", "search", "filters", "chips", "children"],
			draws: [
				"TOOLBAR",
				"TOOLBAR_TABS",
				"TOOLBAR_ROW",
				"TOOLBAR_LINE",
				"TOOLBAR_SEARCH",
				"TOOLBAR_CHIPS",
				"TOOLBAR_FILTERS",
				"TOOLBAR_FILTERS_POPOVER",
				"POPOVER",
				"LAYER_POPOVER",
			],
			states: ["rest"],
			motion: ["block", "layer"],
			owns: {
				colors: ["edge", "raised", "edge-raised"],
				radii: ["popover"],
				spacing: ["gap", "stack"],
				sizes: ["column"],
				elevation: ["float"],
			},
		},
		Columns: {
			props: ["fit", "children"],
			draws: ["COLUMNS"],
			states: ["rest"],
			motion: [],
			owns: { spacing: ["stack", "page", "section"], sizes: ["column"] },
		},
		// The sidebar on the desktop (the switcher, the groups, the footer), the tab bar on touch.
		// The column holds the place: the route's Panes in a row, each but the last
		// at the list width giving way to its floor, the last taking the rest, and
		// below `tablet` of the column only the last standing; a route draws no
		// place of its own.
		Shell: {
			props: ["places", "groups", "banner", "switcher", "children"],
			draws: [
				"SHELL_SIDEBAR",
				"SHELL_INSET",
				"SHELL_LAYER",
				"SHELL_MARK",
				"SHELL_COLUMN",
				"SHELL_BANNER",
				"SWITCHER_SLOT",
				"SWITCHER",
				"SHELL_PLACES",
				"PLACE_ROW",
				"PLACE_ROW_GLYPH",
				"SHELL_TAB_BAR",
				"PLACE_TAB",
				"PLACE_TAB_LABEL",
				"TOASTS",
				"TEXT.role.body",
				"ICON.fit.body",
				"ICON.fit.control",
				"COUNT",
				"COUNT_LABEL",
			],
			states: [...PRESS, "selected"],
			motion: ["answer", "give"],
			owns: {
				roles: ["body", "caption"],
				colors: [
					"canvas",
					"surface",
					"edge",
					"ink-body",
					"ink-meta",
					"wash-hover",
					"wash-press",
					"wash-selected",
					"wash-selected-hover",
					"accent",
					"ink-mark",
					"ring",
				],
				radii: ["row", "control", "full"],
				spacing: ["gap", "pad", "page"],
				sizes: [
					"sidebar",
					"target",
					"icon",
					"icon-control",
					"popover",
					"icon-inset",
				],
			},
		},
	},
	shared: {
		// `fit` is the desktop card's width: a form, or a record's details.
		// On touch the submit stands at the head row's end and a blocked
		// submit's reason or a rejected act's sentence under the head.
		// `form` is a Form's props, drawn after the children in the sheet's
		// column (its `bar` stuck to the edge of the body on the web, in the pinned
		// foot on the phone); the sheet's `submit` and the form's `bar` are two
		// ways to complete the task, one given. Always the modal sheet: a Pane's or
		// a Thread's `sheet` (these props) docks there instead, drawing the
		// docked head and foot inside the foot's raised cell with no scrim. The
		// docked foot's states are its submit's: pending, blocked
		// (`disabled`), and failed (`error`, the act ready again, the rejection's
		// sentence under it in the line a blocked reason keeps, in the field
		// error's cell and ink). The sheet hosts its acts' run, head submit, foot
		// bar and its form's bar alike: its dismissal is held while one pends,
		// unless it waits for a connection.
		Sheet: {
			props: [
				"open",
				"onClose",
				"title",
				"description",
				"back",
				"submit",
				"fit",
				"read",
				"empty",
				"form",
				"children",
			],
			draws: [
				"BLOCK_IN",
				"SHEET",
				"SHEET_DESKTOP",
				"SHEET_CENTERED",
				"SHEET_HEAD",
				"SHEET_HEAD_ROW",
				"SHEET_PARTS",
				"SHEET_FOOT",
				"SHEET_DOCKED_HEAD",
				"SHEET_DOCKED_BODY",
				"SHEET_DOCKED_FOOT",
				"SHEET_DOCKED_FLOOR",
				"THREAD_COLUMN",
				"SCRIM",
				"LAYER_CARD",
				"LAYER_SHEET_BOTTOM",
				"LAYER_SCRIM",
				"TEXT.role.heading",
				"TEXT.role.body",
				"TEXT_STRONG.role.body",
				"TEXT.role.meta",
				"FIELD_ERROR_LINE",
				"ICON_BUTTON.fit.body",
				"BUTTON.act.primary",
				"BUTTON_LABEL.act.primary",
				"PAINT.kind.control",
				"LINE_IN",
			],
			states: [
				"rest",
				"disabled",
				"loading",
				"pending",
				"empty",
				"error",
				"busy",
				"stale",
				"paused",
			],
			motion: ["answer", "give", "layer", "block", "line", "wait", "follow"],
			owns: {
				roles: ["heading", "body", "meta"],
				colors: [
					"skeleton",
					"scrim",
					"raised",
					"edge-raised",
					"edge",
					"ink-body",
					"ink-meta",
					"ink-error",
					"act-accent",
					"on-act-accent",
				],
				radii: ["sheet", "control"],
				spacing: ["gap", "pad", "stack", "section", "page"],
				sizes: [
					"sheet",
					"pane",
					"dialog",
					"measure",
					"control",
					"docked-floor",
				],
				elevation: ["modal"],
			},
		},
		// The pick outside a form that applies at once: a field box, or (a row's
		// trailing, `fit: row`) its value and a chevron in a `WORD_ACT`; either
		// opens a popover of rows (a sheet of rows on touch), a search field
		// above six options; an option may lead with its avatar, and one act
		// (the act that makes a new option) ends the list under a hairline. At
		// the `bar` fit the field box fills its column. At the `field` fit, outside
		// a form and a table cell (a toolbar's pick), a pick that is set reads its
		// label, a colon and its value ("Work type: Change"), so a value other
		// filters could share is told apart; unset, or on its `null` option (the
		// empty choice, "All kinds"), it reads its label alone, in the
		// placeholder's ink; the `bar` and `row` fits read their value alone. An option's `chip` draws
		// after its label in the list and on the trigger. Its `value` an array
		// makes it a pick of several: the rows tick and the list stays open, and
		// the box holds one removable neutral chip per value. An option's
		// `blocked` reason replaces its description in the disabled ink and
		// the option takes no pick, until it is in the value. `value` and
		// `options` are data: a selection paints the trigger, inert and its
		// content undrawn, until its read lands. A `value` whose read ended leaves
		// the box empty and blocked: opening it says the failed sentence and
		// opens nothing. Options that have failed draw the
		// failed sentence with Retry (or `missing`) in a line under the trigger,
		// which stays painted; the picker holds that read, so it needs no frame
		// and draws no busy or stale flag.
		// `fit: list` stands the options in the page: check rows under group
		// labels on a hairline card, a chosen option checked (the row takes no
		// wash); radio rows when `value` is one value or null, a radiogroup whose
		// chosen ring holds its dot. The recommended mark on its description line;
		// the `children` under a chosen option at its label's start. Static
		// `options` never paint; `items`, constants or a selection, paint
		// `PAINT_ROWS` rows while the read waits, in the slots `option` declares
		// (a description under each label, a label over the group), inert, and a
		// `value` selection paints the boxes or rings; the empty form is the
		// frame's, the Pane, Section, Sheet or Form that holds the read, and
		// `items` that have failed draw the failed sentence with Retry (or
		// `missing`) in a line under the rows, the list holding that read where no
		// frame does. An option's `blocked` reason replaces its description in the
		// disabled ink and its box or radio is disabled, until it is in the value.
		// `fit: segments` stands a few options as one row of segments, the chosen
		// one under the selection wash; a segment given an `href` and no value is
		// a link, the one whose href is the location's path or its nearest parent
		// the selected one, and a press opens it. A field as every control is
		// (`Input`): the field fit, a list and choice segments draw it alone.
		Picker: {
			props: [
				"label",
				"description",
				"optional",
				"error",
				"placeholder",
				"options",
				"items",
				"option",
				"value",
				"onChange",
				"fit",
				"act",
				"children",
			],
			draws: [
				"FIELD_ALONE",
				"FIELD_ALONE_LINE",
				"DEFINITION_NAME",
				"FIELD_OPTIONAL",
				"FIELD_ERROR_LINE",
				"FIELD_QUIET",
				"PICKER",
				"HAIRLINE",
				"ROW_LEADING",
				"AVATAR",
				"AVATAR_LABEL",
				"WORD_ACT",
				"PICKER_VALUE",
				"ICON.fit.meta",
				"CHIP",
				"CHIP_DOT",
				"CHIP_LABEL",
				"FIELD.trailing.none",
				"FIELD.state.rest",
				"FIELD.state.error",
				"FIELD_VALUE.kind.text",
				"FIELD_VALUE.kind.search",
				"FIELD_PLACEHOLDER",
				"FIELD_GLYPH",
				"CHIPS_RUN",
				"CHIPS_TRIGGER",
				"ICON.fit.control",
				"PICKER_EMPTY",
				"POPOVER",
				"LAYER_POPOVER",
				"PICKER_POPOVER",
				"ROW.state.rest",
				"ROW.state.highlighted",
				"ROW.state.pressed",
				"OPTION_ROW",
				"TEXT.role.body",
				"TEXT.role.meta",
				"ICON.fit.body",
				"BUTTON.act.quiet",
				"BUTTON_LABEL.act.quiet",
				"PAINT.kind.control",
				"CHEVRON",
				"BLOCK_IN",
				"OPTION_LIST",
				"OPTION_GROUP_LABEL",
				"TEXT_STRONG.role.meta",
				"OPTION_LINE",
				"LINE_BOX.role.body",
				"LINE_BOX.role.meta",
				"CHECKBOX",
				"CHECKBOX_MARK",
				"OPTION_RADIO",
				"OPTION_RADIO_DOT",
				"ROW_TITLE_LINE",
				"ROW_META_LINE",
				"CHIP.family.neutral",
				"CHIP_LABEL.family.neutral",
				"OPTION_CHILDREN",
				"OPTION_INDENT",
				"PAINT.kind.glyphs",
				"SCRAMBLE",
				"LINE_IN",
				"SEGMENTED_CONTROL",
				"SEGMENT",
				"SEGMENT_GROUND",
				"SEGMENT_TRACK",
				"SEGMENT_CHOSEN",
				"SEGMENT_IDLE",
				"SEGMENT_LABEL",
			],
			states: [...PRESS, "loading", "selected", "disabled", "error"],
			motion: ["answer", "give", "toggle", "layer", "block", "line", "wait"],
			owns: {
				roles: ["body", "meta", "caption"],
				colors: [
					"skeleton",
					"ink-body",
					"ink-meta",
					"ink-mark",
					"ink-disabled",
					"surface",
					"edge",
					"edge-hover",
					"edge-error",
					"edge-strong",
					"fill-disabled",
					"raised",
					"avatar-",
					"chip-",
					"edge-raised",
					"wash-hover",
					"wash-press",
					"wash-selected",
					"wash-selected-hover",
					"group",
					"toggle-on",
					"on-accent",
					"ring",
				],
				radii: ["full", "control", "popover", "row", "card", "chip"],
				spacing: ["gap", "pad"],
				sizes: [
					"target",
					"popover",
					"avatar",
					"chip",
					"chips-inset",
					"hairline",
					"measure-short",
					"icon-meta",
					"icon",
					"icon-control",
					"check",
					"dot",
				],
				elevation: ["float"],
			},
		},
		Toast: {
			props: ["sentence", "tone", "act"],
			draws: [
				"TOAST",
				"LAYER_TOAST",
				"TOAST_STATE",
				"ICON.fit.body",
				"TEXT.role.body",
				"BUTTON.act.secondary",
				"BUTTON_LABEL.act.secondary",
			],
			states: ["rest"],
			motion: ["answer", "give", "layer", "follow"],
			owns: {
				roles: ["body"],
				colors: [
					"raised",
					"edge-raised",
					"edge",
					"ink-body",
					"ink-meta",
					"ok",
					"warn",
					"chip-amber",
					"danger",
				],
				radii: ["card", "control"],
				spacing: ["pad", "gap"],
				sizes: ["toast", "icon"],
				elevation: ["float"],
			},
		},
		// A sentence about the state of the page in the flow: a tinted strip, the
		// tone's glyph beside the sentence and the one act at the line's end. A run in
		// progress with a deadline is a Banner with `until` (`tone="running"`): it
		// draws the time left after the sentence and a line along its foot filling
		// toward the deadline at a constant pace (pending), the act its cancel; the
		// clock stops at 0:00.
		Banner: {
			props: ["tone", "sentence", "act", "until"],
			draws: [
				"BLOCK_IN",
				"BANNER",
				"BANNER_ROW",
				"BANNER_MAIN",
				"BANNER_GLYPH",
				"PENDING_FILL",
				"PENDING_LEFT",
				"ICON.fit.body",
				"TEXT.role.body",
				"TEXT.role.meta",
				"BUTTON.act.quiet",
				"BUTTON_LABEL.act.quiet",
				"PAINT.kind.box",
				"PAINT.kind.glyphs",
				"SCRAMBLE",
				"PAINT.kind.control",
			],
			states: ["rest", "disabled", "pending"],
			motion: ["answer", "give", "block", "wait"],
			owns: {
				roles: ["body", "meta"],
				colors: [
					"ink-body",
					"ink-meta",
					"accent-soft",
					"accent-ink",
					"warn-soft",
					"warn",
					"danger-soft",
					"danger",
					"skeleton",
				],
				radii: ["control", "chip"],
				spacing: ["pad", "gap"],
				sizes: ["icon"],
			},
		},
	},
	content: {
		// Markdown at the measure: headings, paragraphs, lists, quotes, rules, inline
		// code and links; a fenced block is a `Code`. No syntax colours, tables,
		// task lists or images.
		// Its markdown is a constant or a selection; while the selection waits it
		// paints one paragraph of `PAINT_ROWS` clipped lines, and draws nothing once it
		// ended.
		Prose: {
			props: ["markdown"],
			draws: [
				"LINE_BOX.role.body",
				"LINK.fit.inline",
				"PROSE",
				"PROSE_BLOCKS",
				"PROSE_CODESPAN",
				"PROSE_EMPHASIS",
				"PROSE_ITEM",
				"PROSE_LIST",
				"PROSE_MARKER",
				"PROSE_PART",
				"PROSE_QUOTE",
				"PROSE_RULE",
				"PROSE_STRIKE",
				"TEXT.role.body",
				"PAINT.kind.glyphs",
				"SCRAMBLE",
				"TEXT.role.heading",
				"TEXT_STRONG.role.body",
			],
			states: ["rest", "loading"],
			motion: ["answer", "wait"],
			owns: {
				roles: ["body", "heading", "code"],
				colors: [
					"ink-body",
					"ink-meta",
					"fill-neutral",
					"accent-ink",
					"edge-strong",
					"edge",
					"skeleton",
				],
				radii: ["chip"],
				spacing: ["section", "gap", "stack", "pad"],
				sizes: ["measure", "icon"],
			},
		},
		// The frame Code, Diff share; the head a strip-high bar, the
		// copy and download acts its icon Buttons at the body fit; `tail` folds the earlier lines
		// behind a one-way act, the focus landing on the code.
		Code: {
			props: ["text", "title", "tail", "copy", "download"],
			draws: [
				"CODE_ACT",
				"CODE_FOLD",
				"CODE_HEAD",
				"CODE_TEXT",
				"CODE_UNDER_HEAD",
				"CARD",
				"ICON.fit.control",
				"ICON.fit.meta",
				"ICON_BUTTON.fit.body",
				"PAINT.kind.control",
				"PAINT.kind.glyphs",
				"SCRAMBLE",
				"TEXT.role.code",
				"TEXT.role.meta",
			],
			states: [...PRESS, "loading"],
			motion: ["answer", "give", "wait"],
			owns: {
				roles: ["code", "meta"],
				colors: [
					"edge",
					"surface",
					"ink-body",
					"ring",
					"ink-meta",
					"wash-hover",
					"skeleton",
					"wash-press",
				],
				radii: ["card", "control", "chip"],
				spacing: ["pad", "gap"],
				sizes: ["control", "icon-control", "target", "icon-meta"],
			},
		},
		// By line (the default), unified, long lines wrapped and hung one inset, at every
		// width; `before` and `after` are diffed in each plugin. By word (`by: "word"`,
		// two texts only), body text at the measure with its edit marked in place, a
		// removed run struck through and an added run underlined. Its `hunks`, given as
		// a selection, are its own frame: its failed, missing and empty forms stand in
		// its box with the generic sentences, and its stale and paused line over it.
		Diff: {
			props: ["label", "hunks", "before", "after", "by"],
			draws: [
				"CARD",
				"DIFF_CODE",
				"DIFF_GUTTER",
				"DIFF_HANG",
				"DIFF_HUNK",
				"DIFF_LINE",
				"DIFF_MARK",
				"PAINT.kind.glyphs",
				"SCRAMBLE",
				"PROSE_DIFF_BODY",
				"PROSE_DIFF_RUN",
				"PROSE_DIFF_TEXT",
				"TEXT.role.body",
			],
			states: ["rest", "loading", "empty", "error"],
			motion: ["wait"],
			owns: {
				roles: ["code", "body"],
				colors: [
					"edge",
					"surface",
					"group",
					"ink-meta",
					"ink-body",
					"danger-soft",
					"ok-soft",
					"skeleton",
				],
				radii: ["card", "chip"],
				spacing: ["gap", "pad"],
				sizes: ["figures", "measure"],
			},
		},
		// A comparison is a Table whose cells hold a value per column: the leading
		// column names the fact, a column follows for each compared thing, and a
		// `chip` or `status` column carries a fact's mark or verdict.
		// The grid from tablet up, a cell cursor its keyboard; below tablet a sheet of
		// list rows with the sort a Picker above it. It takes `items`, constants or
		// a selection, each column reading its cell from the item and `row` the
		// row's own slots; while the selection's read waits it paints `PAINT_ROWS`
		// rows over the constant header, each cell by its column's kind, inert.
		// It is a frame of its items as a Section's sheet is: its failed, missing and empty
		// forms and its stale and paused line are its own. It sorts in its
		// own state (descending, ascending, off); `onEdit` requires `onOpen`, and
		// with `onOpen` the leading column never edits. A row's `change` slot draws
		// the change mark ahead of the leading cell's name (a list row's change
		// below tablet), the kind's word its name. A row's `editable` slot, false, draws its cells plain (no mark, no act); `locked` is the hold, its columns drawn with the lock. A `chip` cell is a label, on the column's `family`, or `{ label, family }` on its own. A column's `wrap` lets its text
		// and `source` cells wrap and hyphenate, the row growing to the tallest cell,
		// where the others truncate. `choose` (`TableChoice`,
		// controlled: `chosen` ids, `onChange` hearing the set a tick makes, the
		// consumer applying its rule) leads the grid with a tick column: a
		// checkbox per row named by its leading cell, and a head checkbox named
		// by `chooseAll`, unchecked, mixed or checked over the rows that can be
		// ticked. A `blocked` row's tick is disabled and a `moved` row says why,
		// each reason a meta line under the leading cell, growing only that row
		// to the two-line row; below tablet the tick leads the row (a list row's
		// check) and the reason leads its meta. `select` (the acts that apply to the
		// rows ticked, with `choose`) draws the selection bar docked at the foot of
		// the Pane the table stands in: "N of M chosen" (M the rows that can be
		// ticked, named by `choose.noun` where the rows are not "chosen" bare) at its start, then the first of select-all (while a row is unticked) and deselect-all (while one is ticked) that applies, the other in a more menu (`actsSplit`), then the
		// acts, the bar standing whatever the ticks and giving way to a docked
		// sheet. The grid draws no count: the selection bar's is the count. The bar stands at the table's own width and start. Below tablet the rows stand on a sheet. `label` is its accessible name
		// (`aria-label` on the grid or the list, `accessibilityLabel` on the phone),
		// in place of the page's title naming it.
		Table: {
			props: [
				"columns",
				"items",
				"row",
				"label",
				"selected",
				"choose",
				"select",
				"onOpen",
				"onEdit",
			],
			draws: [
				"CHECKBOX",
				"CHECKBOX_MARK",
				"CHANGE_MARK",
				"CHIP.family.teal",
				"CHIP.trailing.none",
				"CHIP_LABEL.family.teal",
				"FIELD.state.rest",
				"FIGURES",
				"ICON.fit.meta",
				"LOCK_GLYPH",
				"SPINNER",
				"SPINNER_ARC",
				"SPINNER_TRACK",
				"STATUS",
				"STATUS_DOT",
				"STATUS_LABEL",
				"STATUS_SPINNER",
				"ROW_WARNING",
				"TABLE",
				"TABLE_CELL",
				"TABLE_CHANGE",
				"TABLE_NAME",
				"TABLE_CHANGE_VALUE.kind.added",
				"TABLE_CHANGE_VALUE.kind.after",
				"TABLE_CHANGE_VALUE.kind.before",
				"TABLE_CHANGE_VALUE.kind.removed",
				"CARD",
				"TABLE_FROZEN",
				"TABLE_FROZEN_CELL",
				"TABLE_HEAD",
				"TABLE_HEAD_LABEL",
				"TABLE_ROW",
				"TEXT.role.body",
				"TEXT.role.code",
				"TEXT.role.meta",
				"TEXT_STRONG.role.body",
				"PAINT.kind.box",
				"PAINT.kind.glyphs",
				"SCRAMBLE",
				"PAINT.kind.control",
				"CHEVRON",
			],
			states: [...PRESS, "loading", "empty", "error", "selected", "more"],
			motion: ["answer", "toggle", "wait"],
			owns: {
				roles: ["body", "meta", "code", "caption"],
				colors: [
					"edge",
					"ink-meta",
					"ink-body",
					"ring",
					"chip-teal-soft",
					"chip-teal-ink",
					"toggle-on",
					"on-accent",
					"ok",
					"wash-hover",
					"accent-ink",
					"edge-strong",
					"surface",
					"danger",
					"warn",
					"chip-amber",
					"wash-press",
					"wash-selected",
					"wash-selected-hover",
					"edge-hover",
					"toggle-on-hover",
					"skeleton",
					"ok-soft",
					"danger-soft",
					"fill-disabled",
					"ink-disabled",
				],
				radii: ["full", "chip", "control"],
				spacing: ["pad", "gap", "page"],
				// A column stands at the measure its descriptor names.
				sizes: [
					"measure",
					"target",
					"icon-meta",
					"chip",
					"row",
					"row-2",
					"check",
					"dot",
					"spinner",
					"icon",
					"line-body",
				],
			},
		},
		// Rules, one per row, each a pair (a source mapped to a target: from, an
		// arrow, to) or a condition (a field, fixed operator words, a value), the
		// terms each a `Picker` at the `bar` fit (a pick, or a pick of several as a
		// removable chip, or from two values one token naming how many, its noun the label in lowercase) or an either (a pick whose list ends with the act that
		// types a value, or the typed `Input` whose act picks again), and a
		// remove act. From `tablet` the columns align across rows; on touch each
		// rule is a card of stacked terms in a sheet, the remove act beside the
		// last term. `add` ends the list.
		Rules: {
			props: ["rules", "add"],
			draws: [
				"BLOCK_IN",
				"ICON.fit.meta",
				"RULES",
				"RULE_ROW",
				"RULE_CARD",
				"RULE_ARROW",
				"TEXT.role.meta",
			],
			states: ["rest"],
			motion: ["block"],
			owns: {
				roles: ["meta"],
				colors: ["ink-meta", "ink-disabled"],
				spacing: ["gap", "pad"],
				sizes: ["icon-meta"],
			},
		},
		// A known sequence with a position in it, top to bottom on a hairline
		// rail: each `steps` entry a `Stage` (`done`, `current` or `later`), a
		// done one a filled disc with its check, its `at` a moment under the
		// label, the current one a ring in the accent, its label at 500 and
		// `aria-current="step"`, a later one a hollow ring with its label in
		// meta, every mark at the meta icon size. `ended` replaces every step
		// after the last done one with a terminal row: a cross in `danger`, its
		// label and, when it says one, its reason in meta. The rail is solid in
		// the strong hairline through the done stages, the plain hairline after,
		// running through each mark's line so no break stands around a mark. A row stands at least the
		// two-line row's height, so a later row keeps the done rows' pace. The hue is the
		// marks'; a label's ink is its own. A `steps` that is a selection paints
		// `PAINT_ROWS` later stages, each mark a painted control and each label
		// a name, while its read waits, and draws no stage once it ended.
		Stages: {
			props: ["steps", "ended"],
			draws: [
				"BLOCK_IN",
				"ICON.fit.meta",
				"LINE_BOX.role.body",
				"LINE_BOX.role.meta",
				"STAGE",
				"STAGE_CHECK",
				"STAGE_CROSS",
				"STAGE_MARK",
				"STAGE_RAIL",
				"STAGE_ROW",
				"STAGE_WORDS",
				"TEXT.role.meta",
				"PAINT.kind.control",
				"PAINT.kind.glyphs",
				"SCRAMBLE",
				"LINE_IN",
				"SWAP_IN",
				"SWAP_OUT",
			],
			states: ["rest", "loading"],
			motion: ["block", "line", "value", "wait"],
			owns: {
				roles: ["body", "meta"],
				colors: [
					"ink-body",
					"ink-meta",
					"edge",
					"edge-strong",
					"accent-ink",
					"canvas",
					"danger",
					"skeleton",
				],
				radii: ["full", "chip"],
				spacing: ["gap"],
				sizes: ["icon-meta"],
			},
		},
		// A strip of counts in one hairline card, its cells split by hairlines:
		// each a label over its figure (a unit beside it), then a meta line or
		// sub-counts (links composed from `Link`), or the whole cell a link to
		// its `href`, never both. Zeros are drawn. A cell with a `bound` is the meter
		// form: the label with the share in percent at its end over a bar at the
		// `meter` size, its fill by level, amber near full (at its `mark` when it has
		// one, a tick across the track) and `danger` over; under it one line, its
		// `meta` or its sub-counts. Its `value` and `bound` are data: a selection paints
		// in their place, the cell inert, until the read lands. The meter is the frame
		// of the selections it draws: one that failed, with no frame above holding it,
		// makes the failed form in the same box (the label stays; the share slot shows
		// the alert and the retry icon; the line under the bar reads `readFailed`;
		// pressing the cell retries); a read a frame above holds is that frame's to
		// say, and the cell stands empty (no share, no fill). Cells stand in a row, two
		// to a row below `tablet` of the page and on the phone.
		Stats: {
			props: ["items"],
			draws: [
				"LINK_TARGET",
				"COUNT_LINKS",
				"FIGURES",
				"LINK.fit.standalone",
				"PAINT.kind.glyphs",
				"SCRAMBLE",
				"STATS",
				"STATS_CELL",
				"STATS_EDGE",
				"STATS_FIGURE",
				"TEXT.role.figure",
				"TEXT.role.meta",
				"SWAP_IN",
				"SWAP_OUT",
				"LINE_BOX.role.body",
				"LINE_BOX.role.meta",
				"METER",
				"METER_FILL",
				"METER_HEAD",
				"METER_MARK",
				"METER_TRACK",
				"ROW_RETRY",
				"ICON.fit.body",
				"SPINNER",
				"SPINNER_TRACK",
				"SPINNER_ARC",
				"TEXT.role.body",
				"TEXT_STRONG.role.body",
				"PAINT.kind.box",
				"TRAVEL_X",
			],
			states: ["rest", "loading", "error"],
			motion: ["answer", "value", "wait"],
			owns: {
				roles: ["figure", "meta", "body"],
				colors: [
					"edge",
					"surface",
					"ink-body",
					"ink-meta",
					"accent-ink",
					"skeleton",
					"wash-hover",
					"wash-press",
					"fill-neutral",
					"chip-amber",
					"danger",
					"ring",
				],
				radii: ["card", "chip", "full"],
				spacing: ["gap", "pad"],
				sizes: ["target", "meter", "track", "icon", "spinner"],
			},
		},
		// A collection: columns over time in the chip marks, stacked by one
		// dimension, its bars from `items` through the `bar` map;
		// `label` names the plot on the web; `keys` names the stack's parts in
		// order, so the legend and each part's mark stand before the data does;
		// `level` says the bars are a level, so its head draws the last bar, not
		// the sum. While its read waits the total and the legend's figures are
		// painted, the plot one painted box at its loaded height. It is a frame of
		// its items: its failed, missing and empty forms stand in its box with the
		// generic sentences, whatever stands above it.
		BarChart: {
			props: ["label", "keys", "unit", "level", "bar", "items"],
			draws: [
				"CHART",
				"CHART_BAND",
				"CHART_BODY",
				"CHART_FILL",
				"CHART_GRID",
				"CHART_HEAD",
				"CHART_KEY",
				"CHART_KEYS",
				"CHART_KEY_DOT",
				"CHART_MAIN",
				"CHART_BAR",
				"CHART_TICK_LANE",
				"CHART_TOTAL",
				"FIGURES",
				"LINE_BOX.role.meta",
				"TEXT.role.body",
				"TEXT.role.meta",
				"TEXT_STRONG.role.body",
				"PAINT.kind.box",
				"PAINT.kind.glyphs",
				"SCRAMBLE",

				"SWAP_IN",
				"SWAP_OUT",
			],
			states: ["rest", "loading", "empty", "error"],
			motion: ["value", "wait"],
			owns: {
				roles: ["body", "meta"],
				colors: ["ink-body", "ink-meta", "edge", "skeleton", "chart-"],
				radii: ["full", "chip"],
				spacing: ["stack", "gap"],
				sizes: ["chart", "dot", "figures", "measure-short", "target"],
			},
		},
		// A collection: its messages from `items` through the `message` map,
		// constants or a selection; while the selection's read waits it paints
		// `PAINT_ROWS` of the other author's messages. A message is a `Message`
		// descriptor by its author: `you` and `other` take `name`, `attachments` (an
		// attachment with `src` a thumbnail, one without a chip of its name, in one row
		// over the bubble) and `meta` (the provenance line before the time), `system`
		// takes `onOpen` and `detail` (a `MessageDetail`: a row, one list row in a
		// hairline card, a free act's code, or a fold its line opens). A reply's body is
		// a `Prose`; `at` is an ISO moment each plugin formats in the document's
		// language (the time alone today). It is a frame of its items, with its
		// composer and reply kept: its failed and missing forms stand in the log's place
		// with the generic sentences, and its empty form is one
		// sentence (`empty`, else the generic one) centred in the log, so a thread whose items failed still sends. The `composer` is the
		// input under the log, or its `sheet` docked in its place while it is open:
		// stacked on the desktop, one row on touch; `onDetach(id)` removes an
		// attachment, and the notice's act carries its own pending, so the input has no
		// loading form. `onAttach(files)` hears every file the attach act chooses (and,
		// on the web, a paste or a drop on the input); the consumer turns a file into an
		// `Attachment` and passes it back, a thumbnail with its remove act at its corner
		// when it has `src`. While `working`, Stop stands before Send (both icon acts on
		// touch) and Send still sends; the notice says what becomes of a message sent
		// then. While a filling Thread's reader is scrolled up, a secondary Latest act
		// floats over the log above the composer. Its `reply` is the turn being written,
		// a read of the app's own that draws after the items from its own subscription:
		// waiting a painted message, `streaming` the message with its open Markdown
		// drawn in its own form, `error` the partial message with the stopped line and
		// its Retry.
		Thread: {
			props: ["message", "items", "composer", "sheet", "replying", "reply"],
			draws: [
				"THREAD",
				"THREAD_COLUMN",
				"FOOT_DOCKED",
				"THREAD_LATEST",
				"STREAM_LATEST",
				"BLOCK_IN",
				"CHIP.family.neutral",
				"CHIP_LABEL.family.neutral",
				"IMAGE.fit.thumb",
				"IMAGE_PICTURE.fit.thumb",
				"MESSAGE_ATTACHMENTS",
				"ICON.fit.meta",
				"LINE_BOX.role.body",
				"LINE_BOX.role.meta",
				"MESSAGE",
				"MESSAGE_BUBBLE",
				"MESSAGE_HEAD",
				"MESSAGE_LINE",
				"MESSAGE_OPEN",
				"MESSAGE_ENTRY",
				"CARD",
				"MESSAGE_CODE",
				"MESSAGE_FOLD",
				"PAINT.kind.glyphs",
				"SCRAMBLE",
				"TEXT.role.body",
				"TEXT.role.meta",
				"TEXT.role.code",
				"TEXT_STRONG.role.body",
				"CHEVRON",
				"STREAM_IN",
				"BUTTON.act.primary",
				"BUTTON.act.secondary",
				"BUTTON_LABEL.act.primary",
				"BUTTON_LABEL.act.secondary",
				"CHIP.trailing.remove",
				"REMOVE_HIT",
				"FIELD.state.rest",
				"FIELD.trailing.none",
				"FIELD_VALUE.kind.text",
				"ICON.fit.control",
				"IMAGE_REMOVE",
				"IMAGE_REMOVE_DISC",
				"MESSAGE_ATTACH_SLOT",
				"MESSAGE_INPUT",
				"MESSAGE_INPUT_BOX",
				"MESSAGE_INPUT_CHIPS",
				"MESSAGE_INPUT_FIELD_CHIPS",
				"MESSAGE_INPUT_FOOT",
				"MESSAGE_INPUT_ROW",
				"MESSAGE_INPUT_TEXT",
				"MESSAGE_INPUT_VALUE",
				"MESSAGE_NOTICE",
				"MESSAGE_NOTICE_TEXT",
				"SPINNER",
				"SPINNER_ARC",
				"SPINNER_TRACK",
				"LINE_IN",
			],
			states: [
				"rest",
				"loading",
				"empty",
				"error",
				"streaming",
				"hover",
				"focus",
				"active",
				"disabled",
			],
			motion: ["stream", "answer", "toggle", "block", "wait", "give", "line"],
			owns: {
				colors: [
					"raised",
					"edge",
					"edge-raised",
					"ink-meta",
					"fill-neutral",
					"ink-body",
					"surface",
					"skeleton",
					"wash-hover",
					"ring",
					"wash-press",
					"chip-",
					"act-accent",
					"on-act-accent",
					"fill-disabled",
					"ink-disabled",
					"edge-hover",
					"chip-neutral-soft",
					"chip-neutral-ink",
				],
				radii: ["control", "card", "chip", "full"],
				spacing: ["section", "page", "gap", "pad"],
				sizes: [
					"measure",
					"docked-log-floor",
					"target",
					"icon-meta",
					"figures",
					"chip",
					"measure-short",
					"image-tile",
					"message-input",
					"icon-control",
					"spinner",
				],
				elevation: ["float"],
				roles: ["meta", "body", "code", "caption"],
			},
		},
		// A picture a press opens full size: a square tile (`thumb`) or its
		// container's width at its own aspect down to a height cap (`content`).
		// A content picture's `aspect` (width over height) is required: it fixes
		// its box in every state, so nothing moves when the bytes land; a
		// thumbnail is square and takes none. An address that is a selection
		// paints its box until the read lands, and while the bytes are on their way
		// it is a skeleton at that box; failed, an `ImageOff` glyph in the meta ink with the alt text in
		// meta under it (a thumbnail draws the glyph alone, the alt its name) and
		// nothing to open. The full view
		// stands over the sheet base's scrim and focus trap, contain-fit inside
		// the page inset, with a lifted Close act.
		Image: {
			props: ["src", "alt", "fit", "aspect"],
			draws: [
				"PAINT.kind.box",
				"IMAGE",
				"IMAGE_PICTURE",
				"IMAGE_FULL",
				"IMAGE_CLOSE",
				"IMAGE_FAILED_INK",
				"ICON.fit.body",
				"ICON_BUTTON.fit.body",
				"TEXT.role.meta",
				"SCRIM",
				"LAYER_CARD",
				"LAYER_SCRIM",
			],
			states: [...PRESS, "loading", "error"],
			motion: ["answer", "give", "layer", "wait"],
			owns: {
				roles: ["meta"],
				colors: [
					"edge",
					"edge-hover",
					"ink-body",
					"skeleton",
					"group",
					"ink-meta",
					"raised",
					"scrim",
				],
				radii: ["control", "card"],
				spacing: ["page", "gap"],
				sizes: ["image-tile", "image-cap", "icon", "control"],
				elevation: ["float"],
			},
		},
		// A graph of nodes and edges on a pannable ground, the web's alone: the
		// phone has no pointer to drag a node or draw an edge with. Selection
		// recolours the node's outline; a `path` dims what a run did not take. A
		// group holding no present node is a leaf an edge may name. While its
		// `nodes`, `edges` or `groups` is a selection still to land it stands its
		// bare ground (the dots and the zoom stack, no node), since a layout has
		// no geometry before its data. Its `nodes`, given as a selection, are its
		// own frame: its failed, missing and empty forms stand in its ground with
		// the generic sentences. A node's status is its dot and its label, which
		// truncates before the title.
		Canvas: {
			props: [
				"label",
				"nodes",
				"edges",
				"groups",
				"selected",
				"onSelect",
				"path",
				"onMove",
				"onConnect",
				"act",
			],
			platforms: ["web"],
			draws: [
				"PAINT.kind.box",
				"PAINT.kind.glyphs",
				"SCRAMBLE",
				"CANVAS_GROUND",
				"CANVAS_NODE",
				"CANVAS_NODE_TEXT",
				"CANVAS_NODE_GLYPH",
				"CANVAS_NODE_INK",
				"CANVAS_NODE_NAME",
				"CANVAS_PORT",
				"CANVAS_PORT_HIT",
				"CANVAS_GROUP",
				"CANVAS_GROUP_HEAD",
				"CANVAS_ZOOM",
				"LIFT",
				"PATH_TONE",
				"LINE_IN",
				"BLOCK_IN",
				"ICON.fit.meta",
				"ICON.fit.body",
				"ICON_BUTTON.fit.body",
				"BUTTON.act.quiet",
				"BUTTON.fit.body",
				"BUTTON_LABEL.act.quiet",
				"COUNT",
				"COUNT_LABEL",
				"CHIP.family.neutral",
				"CHIP.trailing.none",
				"CHIP_LABEL.family.neutral",
				"STATUS",
				"STATUS_DOT",
				"STATUS_SPINNER",
				"STATUS_LABEL",
				"SPINNER",
				"SPINNER_TRACK",
				"SPINNER_ARC",
			],
			states: ["rest", "selected", "loading", "empty", "error"],
			motion: ["answer", "give", "block", "line", "wait", "follow"],
			owns: {
				roles: ["body", "meta", "caption"],
				colors: [
					"skeleton",
					"canvas",
					"group",
					"surface",
					"edge",
					"edge-strong",
					"edge-error",
					"selected-outline",
					"edge-hover",
					"grid",
					"ring",
					"ink-body",
					"ink-meta",
					"ink-disabled",
					"fill-neutral",
					"accent-ink",
					"accent-soft",
					"accent-edge",
					"warn-soft",
					"ok",
					"warn",
					"chip-amber",
					"danger",
					"chip-",
				],
				radii: ["card", "control", "full", "chip"],
				spacing: ["gap", "pad", "section", "page"],
				sizes: [
					"node",
					"port",
					"target",
					"control",
					"dot",
					"chip",
					"icon-meta",
					"icon",
					"measure-short",
					"measure",
					"spinner",
				],
				elevation: ["float"],
			},
		},
	},
};

// `FormField` → `form-field`: the component directory under `src/ui/components`.
export function componentDir(name: string): string {
	return name.replace(/(?<!^)[A-Z]/g, (ch) => `-${ch}`).toLowerCase();
}

// With a platform, only the entries that ship on it.
export function rosterEntries(
	platform?: Platform,
): Array<[Layer, string, RosterEntry]> {
	const out: Array<[Layer, string, RosterEntry]> = [];
	for (const layer of LAYERS) {
		for (const [name, entry] of Object.entries(ROSTER[layer])) {
			if (platform && entry.platforms && !entry.platforms.includes(platform)) {
				continue;
			}
			out.push([layer, name, entry]);
		}
	}
	return out;
}
