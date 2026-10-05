// The rebuilt roster as data: every component both UI plugins ship, its
// layer, the prop names it takes, the cells it draws, the tokens it owns and
// the states it has, the same in both. Each plugin's verify suite reads its
// own components against this table, so a prop added on one platform alone,
// or a look prop reopened, fails by name.

import {
	type ColorName,
	type RadiusRole,
	type ShadowLevel,
	type Size,
	type SpacingRole,
	type TypeRole,
	WIDTHS,
	type Width,
} from "./tokens.ts";
import * as variants from "./variants.ts";

export const LAYERS = ["atom", "layout", "shared", "content"] as const;
export type Layer = (typeof LAYERS)[number];

// The style channels no component may take. Each is declared `?: never` on
// every component's props, in both plugins.
export const CLOSED_PROPS = [
	"class",
	"className",
	"classList",
	"style",
] as const;

// The states a component can be drawn in: the eight interaction states, plus
// `empty` for a component with an empty form. The showcase draws each
// component in exactly the states its entry lists.
export const STATES = [
	"rest",
	"hover",
	"focus",
	"active",
	"disabled",
	"loading",
	"error",
	"selected",
	"empty",
] as const;
export type State = (typeof STATES)[number];

// The tokens a component may draw, by namespace: type roles, colours,
// radii, spacing roles, sizes and widths, shadow levels. A colour is a name,
// or a family prefix ending in `-` (`chip-` covers every chip role); every
// other namespace names its tokens. ui-core's verify reads each class of
// every cell the entry draws, and a class spelling a token of a namespace
// the entry does not own fails by name. A namespace left out owns nothing.
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
// single-cell constant of `./variants`), the states it has a form for, the tokens it owns and the cells it holds:
// the families and constants of its own box, which only it spells, so every
// other component draws them by composing it and a change to it reaches them
// all. A cell no entry holds (a type role, the field, the row, the skeleton)
// is shared, spelled by each component that draws it.
export interface RosterEntry {
	props: readonly string[];
	draws: readonly string[];
	holds?: readonly string[];
	states: readonly State[];
	owns?: Owns;
}

// A pressable control's four.
const PRESS = ["rest", "hover", "focus", "active"] as const;

export const ROSTER: Record<Layer, Record<string, RosterEntry>> = {
	atom: {
		Text: {
			props: ["role", "strong", "children"],
			draws: [
				"TEXT.role.body",
				"TEXT.role.meta",
				"TEXT_STRONG.role.body",
				"TEXT_STRONG.role.meta",
			],
			states: ["rest"],
			owns: {
				roles: ["body", "meta"],
				colors: ["ink-body", "ink-meta"],
				sizes: ["measure"],
			},
		},
		Icon: {
			props: ["name", "fit"],
			draws: ["ICON"],
			holds: ["ICON"],
			states: ["rest"],
			owns: { sizes: ["icon-meta", "icon", "icon-control"] },
		},
		Button: {
			props: [
				"act",
				"fit",
				"icon",
				"label",
				"count",
				"onAct",
				"loading",
				"blocked",
			],
			draws: [
				"BUTTON",
				"BUTTON_LABEL",
				"ICON.fit.control",
				"COUNT",
				"COUNT_LABEL",
			],
			holds: ["BUTTON", "BUTTON_LABEL"],
			states: [...PRESS, "disabled", "loading"],
			owns: {
				roles: ["body", "meta", "caption"],
				colors: [
					"act-",
					"on-act-",
					"edge",
					"ink-body",
					"ink-meta",
					"fill-neutral",
					"danger",
					"wash-hover",
					"wash-press",
					"fill-disabled",
					"ink-disabled",
					"ring",
				],
				radii: ["control", "full"],
				spacing: ["inside", "control-x", "pair"],
				sizes: ["control", "control-compact", "field", "icon-control", "chip"],
			},
		},
		IconButton: {
			props: ["icon", "fit", "label", "onAct"],
			draws: ["ICON_BUTTON"],
			holds: ["ICON_BUTTON"],
			states: [...PRESS],
			owns: {
				colors: [
					"ink-meta",
					"ink-body",
					"wash-hover",
					"wash-press",
					"ink-disabled",
					"ring",
				],
				radii: ["control"],
				sizes: ["control", "control-compact"],
			},
		},
		Count: {
			props: ["value"],
			draws: ["COUNT", "COUNT_LABEL"],
			holds: ["COUNT", "COUNT_LABEL"],
			states: ["rest"],
			owns: {
				roles: ["caption"],
				colors: ["fill-neutral", "ink-meta"],
				radii: ["full"],
				spacing: ["inside"],
				sizes: ["chip"],
			},
		},
		// An onboarding flow's place in it: `of` segments (two to four) at the
		// `meter` height, the steps up to `at` in the meta ink and the rest a
		// wash, never the accent, over "Step n of m" (`stepOf`) at meta, which
		// is also its accessible name.
		StepCount: {
			props: ["at", "of"],
			draws: [
				"STEP_COUNT",
				"STEP_COUNT_SEGMENTS",
				"STEP_COUNT_SEGMENT",
				"TEXT.role.meta",
			],
			holds: ["STEP_COUNT", "STEP_COUNT_SEGMENTS", "STEP_COUNT_SEGMENT"],
			states: ["rest"],
			owns: {
				roles: ["meta"],
				colors: ["ink-meta", "fill-neutral"],
				radii: ["chip"],
				spacing: ["pair", "inside"],
				sizes: ["meter"],
			},
		},
		// A mark, never an act: a status that moves is a `Picker` whose options
		// carry states. Its loading form (a table's waiting status cell) is the
		// dot's and the word's skeletons at its gap, through its internal base.
		// `running` draws a `Spinner` in the dot's place, in the accent ink. Its
		// internal change mark stands beside the dot: one glyph in a lane an icon
		// wide, by the kind of change (added, changed, removed, unchanged, stale),
		// named by the kind's word; the rows that carry a `change` compose it.
		Status: {
			props: ["state", "label"],
			draws: [
				"CHANGE_MARK",
				"ICON.fit.meta",
				"STATUS",
				"STATUS_DOT",
				"STATUS_SPINNER",
				"STATUS_LABEL",
				"SPINNER",
				"SPINNER_TRACK",
				"SPINNER_ARC",
				"SKELETON.kind.dot",
				"SKELETON.kind.line",
			],
			holds: [
				"STATUS",
				"STATUS_DOT",
				"STATUS_SPINNER",
				"STATUS_LABEL",
				"CHANGE_MARK",
			],
			states: ["rest"],
			owns: {
				roles: ["meta"],
				colors: ["accent-ink", "ink-meta", "ok", "warn", "danger", "skeleton"],
				radii: ["full", "chip"],
				spacing: ["inside"],
				sizes: [
					"dot",
					"spinner",
					"measure-short",
					"skeleton",
					"icon",
					"icon-meta",
				],
			},
		},
		Chip: {
			props: ["label", "family", "onRemove"],
			draws: ["CHIP", "CHIP_LABEL", "CHIP_REMOVE_HIT"],
			holds: ["CHIP", "CHIP_LABEL", "CHIP_REMOVE_HIT"],
			states: [...PRESS],
			owns: {
				roles: ["caption"],
				colors: ["chip-", "wash-hover", "wash-press", "ring"],
				radii: ["full"],
				spacing: ["inside"],
				sizes: ["chip", "measure-short"],
			},
		},
		Input: {
			props: [
				"kind",
				"value",
				"onChange",
				"onCommit",
				"placeholder",
				"unit",
				"act",
			],
			draws: [
				"FIELD",
				"FIELD_VALUE",
				"FIELD_PLACEHOLDER",
				"FIELD_UNIT",
				"FIELD_GLYPH",
			],
			holds: ["FIELD_UNIT"],
			states: ["rest", "hover", "focus", "disabled", "error"],
			owns: {
				roles: ["body", "code"],
				colors: [
					"surface",
					"edge",
					"edge-hover",
					"edge-error",
					"ink-body",
					"ink-meta",
					"fill-disabled",
					"ink-disabled",
					"ring",
				],
				radii: ["control"],
				spacing: ["inside", "control-x"],
				sizes: ["field", "control-compact"],
			},
		},
		// The field box that chooses a file: empty, its whole box is the act (a
		// leading glyph and the `chooseFile` word); chosen, the name, the size
		// and an act that removes it. The web's box also takes a dropped file,
		// ringed while one is over it. A file of another type is refused into its
		// `FormField`'s error line and never reaches `onChange`.
		FileInput: {
			props: ["value", "onChange", "accept"],
			draws: [
				"FIELD.fit.form",
				"FIELD.trailing.none",
				"FIELD.trailing.act",
				"FIELD.state.rest",
				"FIELD.state.error",
				"FIELD_VALUE.kind.text",
				"FIELD_PLACEHOLDER",
				"TEXT.role.meta",
				"FIELD_GLYPH",
				"ICON.fit.control",
			],
			states: ["rest", "hover", "focus", "disabled", "error", "empty"],
			owns: {
				roles: ["body", "meta"],
				colors: [
					"surface",
					"edge",
					"edge-hover",
					"edge-error",
					"ink-body",
					"ink-meta",
					"fill-disabled",
					"ink-disabled",
					"ring",
				],
				radii: ["control"],
				spacing: ["inside", "control-x"],
				sizes: ["field", "icon-control"],
			},
		},
		TextArea: {
			props: ["kind", "value", "onChange", "onCommit", "placeholder", "budget"],
			draws: [
				"TEXT_AREA",
				"TEXT_AREA_BUDGET",
				"TEXT_AREA_VALUE",
				"FIELD_VALUE",
				"FIELD_PLACEHOLDER",
			],
			holds: ["TEXT_AREA", "TEXT_AREA_BUDGET", "TEXT_AREA_VALUE"],
			states: ["rest", "hover", "focus", "disabled", "error"],
			owns: {
				roles: ["body", "code", "caption"],
				colors: [
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
				spacing: ["rows", "control-x", "inside"],
				sizes: ["text-area"],
			},
		},
		InputOtp: {
			props: ["length", "value", "onChange", "onComplete", "loading"],
			draws: ["OTP", "OTP_BOX", "OTP_DIGIT", "TEXT.role.meta", "SPINNER"],
			holds: ["OTP", "OTP_BOX", "OTP_DIGIT"],
			states: ["rest", "focus", "loading", "error"],
			owns: {
				roles: ["heading", "meta"],
				colors: [
					"surface",
					"edge",
					"edge-error",
					"ink-body",
					"ink-meta",
					"ring",
				],
				radii: ["control"],
				spacing: ["inside", "pair"],
				sizes: ["otp", "spinner"],
			},
		},
		// The trigger is the field box; the open list is a popover of rows under
		// group labels (meta at 500), the highlighted row under the hover wash
		// and the chosen one ticked, a description in meta under an option.
		Select: {
			props: ["value", "onChange", "options", "placeholder"],
			draws: [
				"FIELD",
				"FIELD_VALUE",
				"FIELD_PLACEHOLDER",
				"FIELD_GLYPH",
				"POPOVER",
				"SELECT_GROUP",
				"ROW.state.rest",
				"ROW.state.highlighted",
				"ROW.state.pressed",
				"ROW.state.selected",
				"ROW.ground.list",
				"TEXT.role.meta",
				"TEXT_STRONG.role.meta",
			],
			states: ["rest", "hover", "focus", "selected", "disabled", "error"],
			owns: {
				roles: ["body", "code", "meta"],
				colors: [
					"surface",
					"edge",
					"edge-hover",
					"edge-error",
					"ink-body",
					"ink-meta",
					"fill-disabled",
					"ink-disabled",
					"ring",
					"raised",
					"edge-raised",
					"wash-hover",
					"wash-press",
					"wash-selected",
				],
				radii: ["control", "row", "popover"],
				spacing: ["inside", "control-x", "pair", "rows", "float"],
				sizes: ["field", "control-compact", "row"],
				elevation: ["float"],
			},
		},
		Slider: {
			props: ["label", "value", "onChange", "min", "max", "step", "unit"],
			draws: [
				"SLIDER",
				"SLIDER_HEAD",
				"SLIDER_LABEL",
				"SLIDER_VALUE",
				"SLIDER_TRACK",
				"SLIDER_FILL",
				"SLIDER_REST",
				"SLIDER_THUMB",
			],
			holds: [
				"SLIDER",
				"SLIDER_HEAD",
				"SLIDER_LABEL",
				"SLIDER_VALUE",
				"SLIDER_TRACK",
				"SLIDER_FILL",
				"SLIDER_REST",
				"SLIDER_THUMB",
			],
			states: [...PRESS, "disabled"],
			owns: {
				roles: ["body", "meta"],
				colors: [
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
				radii: ["full"],
				spacing: ["pair", "fields"],
				sizes: ["target", "track", "thumb"],
			},
		},
		Switch: {
			props: ["checked", "onChange", "label"],
			draws: ["SWITCH", "SWITCH_THUMB"],
			holds: ["SWITCH", "SWITCH_THUMB"],
			states: [...PRESS, "disabled", "selected"],
			owns: {
				colors: ["switch-", "toggle-", "fill-disabled", "ink-disabled", "ring"],
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
		Checkbox: {
			props: ["checked", "onChange", "label"],
			draws: ["CHECKBOX", "CHECKBOX_MARK"],
			holds: ["CHECKBOX", "CHECKBOX_MARK"],
			states: [...PRESS, "disabled", "selected"],
			owns: {
				colors: [
					"edge-strong",
					"surface",
					"toggle-",
					"on-accent",
					"wash-hover",
					"wash-press",
					"edge",
					"fill-disabled",
					"ink-disabled",
					"ring",
				],
				radii: ["chip"],
				sizes: ["check", "target", "icon-meta"],
			},
		},
		Spinner: {
			props: [],
			draws: ["SPINNER", "SPINNER_TRACK", "SPINNER_ARC"],
			holds: ["SPINNER", "SPINNER_TRACK", "SPINNER_ARC"],
			states: ["rest"],
			owns: { radii: ["full"], sizes: ["spinner"] },
		},
		Avatar: {
			props: ["name", "src"],
			draws: ["AVATAR", "AVATAR_LABEL"],
			holds: ["AVATAR", "AVATAR_LABEL"],
			states: ["rest"],
			owns: {
				roles: ["caption"],
				colors: ["avatar-"],
				radii: ["full"],
				sizes: ["avatar"],
			},
		},
		Link: {
			props: ["href", "fit", "children"],
			draws: ["LINK"],
			holds: ["LINK"],
			states: [...PRESS],
			owns: { colors: ["accent-ink", "ring"], sizes: ["target"] },
		},
	},
	layout: {
		// A page in the shell: on the desktop the title and the acts share the
		// strip, the act a bar-fit primary rightmost; on touch the top bar holds
		// the acts over the title and the act floats over the body's end. A
		// `foot` (a field, never beside the act) docks under the scrolling body.
		// A `context` is a pick beside the title (the page's change set, its
		// version), a Picker at the row fit that takes the option's chip.
		// A `distance` of `room` draws the page for a screen read from across a
		// room: the touch structure at the room set (`DENSITIES`), one column that
		// never splits, holding no `context`, `more` or `foot`, whose layers open outside it.
		Place: {
			props: [
				"title",
				"distance",
				"context",
				"actions",
				"act",
				"more",
				"bleed",
				"foot",
				"children",
			],
			draws: [
				"PAGE_HEAD",
				"PAGE_TOP_BAR",
				"PAGE_TITLE",
				"TEXT.role.title",
				"PILL_ACT",
				"PICKER_VALUE",
				"ICON.fit.meta",
				"CHIP",
				"CHIP_LABEL",
				"PAGE_BODY",
				"FOOT",
				"PAGE_BODY_OVER_FOOT",
				"THREAD_COLUMN",
				"FLOATING_ACT",
				"FLOATING_ACT_LIFT",
				"FLOATING_ACT_ROOM",
				"FLOATING_ACT_FOOT",
				"BUTTON.act.primary",
				"BUTTON.fit.bar",
				"BUTTON.fit.body",
				"BUTTON_LABEL.act.primary",
				"ICON_BUTTON.fit.bar",
				"ICON_BUTTON.fit.body",
			],
			holds: [
				"FLOATING_ACT",
				"FLOATING_ACT_LIFT",
				"FLOATING_ACT_ROOM",
				"FLOATING_ACT_FOOT",
			],
			states: ["rest"],
			owns: {
				roles: ["title", "body", "meta", "caption"],
				colors: [
					"ink-body",
					"ink-meta",
					"edge",
					"act-accent",
					"on-act-accent",
					"wash-hover",
					"wash-press",
					"danger",
					"chip-",
				],
				radii: ["control", "full"],
				spacing: [
					"acts",
					"page",
					"sections",
					"inside",
					"control-x",
					"rows",
					"pair",
				],
				sizes: [
					"strip",
					"control",
					"control-compact",
					"popover",
					"list",
					"measure",
					"target",
					"icon-meta",
					"chip",
					"measure-short",
				],
				elevation: ["float"],
			},
		},
		// A pushed page: the back act first, no act; on touch its toasts stand
		// at its foot.
		Screen: {
			props: ["title", "back", "actions", "more", "children"],
			draws: [
				"PAGE_HEAD",
				"PAGE_TOP_BAR",
				"PAGE_TITLE",
				"TEXT.role.title",
				"PAGE_BODY",
				"ICON_BUTTON.fit.bar",
				"ICON_BUTTON.fit.body",
			],
			states: ["rest"],
			owns: {
				roles: ["title"],
				colors: ["ink-body", "ink-meta", "edge"],
				radii: ["control"],
				spacing: ["acts", "page", "sections", "pair"],
				sizes: ["strip", "control", "control-compact"],
			},
		},
		// Below `wide` the Split adds a Details act to the Place's actions that
		// opens the pane as a sheet; below `tablet` a record it shows alone has
		// its Place lead its strip or top bar with a back act to the list. A
		// record the main opened (`beside`, a Screen) stands beside the main from
		// `wide`, the pane then behind the Details act at every width, and in
		// the main's place below it; below `tablet` its head stands alone, the
		// Place drawing none.
		Split: {
			props: ["list", "main", "beside", "pane", "empty"],
			draws: [
				"SPLIT_LIST",
				"SPLIT_MAIN",
				"SPLIT_BESIDE",
				"SPLIT_PANE",
				"ICON_BUTTON.fit.bar",
			],
			holds: ["SPLIT_LIST", "SPLIT_MAIN", "SPLIT_BESIDE", "SPLIT_PANE"],
			states: ["rest", "empty"],
			owns: {
				colors: ["edge", "ink-meta", "surface"],
				radii: ["control"],
				spacing: ["inside", "page", "sections"],
				sizes: ["list", "pane", "control-compact"],
			},
		},
		// The fold toggle is the title line; a blocked act's reason stands on
		// its own line under the head row.
		// Its rhythm is `SECTION.in`: `form` inside a Form, `page`
		// elsewhere. Loading, a Group or a List in its body draws its own
		// skeleton rows; the Section draws its own over a body of fields.
		Section: {
			props: [
				"title",
				"count",
				"description",
				"folded",
				"onToggle",
				"act",
				"loading",
				"children",
			],
			draws: [
				"SECTION",
				"SECTION_HEAD",
				"SECTION_HEAD_ROW",
				"SECTION_TITLE",
				"SECTION_TOGGLE",
				"TEXT.role.heading",
				"TEXT.role.meta",
				"ICON.fit.body",
				"COUNT",
				"COUNT_LABEL",
				"BUTTON.act.secondary",
				"BUTTON.act.destructive",
				"BUTTON.fit.bar",
				"BUTTON_LABEL.act.secondary",
				"BUTTON_LABEL.act.destructive",
				"ICON_BUTTON.fit.bar",
				"SKELETON.kind.count",
				"SKELETON.kind.line",
				"SKELETON.kind.field",
				"SKELETON_ROW.kind.field",
				"TEXT.role.caption",
				"LINE_BOX.role.body",
			],
			holds: [
				"SECTION",
				"SECTION_HEAD",
				"SECTION_HEAD_ROW",
				"SECTION_TITLE",
				"SECTION_TOGGLE",
			],
			states: [...PRESS, "disabled", "loading"],
			owns: {
				roles: ["heading", "meta", "body", "caption"],
				colors: [
					"ink-body",
					"ink-meta",
					"edge",
					"fill-neutral",
					"skeleton",
					"wash-hover",
					"wash-press",
					"ring",
					"danger",
				],
				radii: ["row", "control", "chip", "full"],
				spacing: ["pair", "fields", "inside", "control-x"],
				sizes: [
					"icon",
					"chip",
					"control-compact",
					"skeleton",
					"field",
					"target",
				],
			},
		},
		Group: {
			props: ["loading", "children"],
			draws: [
				"GROUP",
				"SKELETON_ROW.kind.setting",
				"ROW_TITLE_LINE",
				"LINE_BOX.role.body",
				"LINE_BOX.role.meta",
				"SKELETON.kind.line",
				"SKELETON.kind.switch",
			],
			holds: ["GROUP"],
			states: ["rest", "loading"],
			owns: {
				colors: ["edge", "surface", "skeleton"],
				radii: ["card", "chip", "full"],
				roles: ["body", "meta"],
				spacing: ["fields", "card", "pair", "inside"],
				sizes: ["row-setting", "skeleton", "switch-w", "switch-h", "target"],
			},
		},
		// A collection: its rows from `query` or `items` through one item map
		// (`row` for ListRows, `file` for FileRows, `meter` for Meters), its
		// waiting rows the row's own in the slots the map declares, its failed
		// and empty EmptyStates its own. In a Group its rows and forms stand on
		// the card, the card their box.
		List: {
			props: [
				"query",
				"sentence",
				"empty",
				"row",
				"file",
				"meter",
				"items",
				"loading",
			],
			draws: ["LIST"],
			holds: ["LIST"],
			states: ["rest", "loading", "error", "empty"],
			owns: {
				spacing: ["rows", "control-x"],
			},
		},
		// A Form in a sheet stands on the sheet's column, uncapped.
		Form: {
			props: ["children"],
			draws: ["FORM", "FORM_FOOT"],
			holds: ["FORM", "FORM_FOOT"],
			states: ["rest", "loading"],
			owns: {
				colors: ["edge"],
				spacing: ["fields", "sections"],
				sizes: ["measure"],
			},
		},
		Toolbar: {
			props: ["children"],
			draws: ["TOOLBAR", "TOOLBAR_ROW", "TOOLBAR_CHIPS"],
			holds: ["TOOLBAR", "TOOLBAR_ROW", "TOOLBAR_CHIPS"],
			states: ["rest"],
			owns: { colors: ["edge"], spacing: ["pair", "page", "inside", "acts"] },
		},
		// The one filled act is the last; a destructive act draws `danger`
		// filled and `destructive` otherwise. `fit: full` passes the acts
		// `fit: field`.
		ActionBar: {
			props: ["acts", "fit"],
			draws: [
				"ACTION_BAR",
				"ACTION_BAR_ACTS",
				"TEXT.role.meta",
				"BUTTON.act.primary",
				"BUTTON.act.danger",
				"BUTTON.act.secondary",
				"BUTTON.act.destructive",
				"BUTTON.fit.body",
				"BUTTON.fit.field",
				"BUTTON_LABEL.act.primary",
				"BUTTON_LABEL.act.danger",
				"BUTTON_LABEL.act.secondary",
				"BUTTON_LABEL.act.destructive",
			],
			holds: ["ACTION_BAR", "ACTION_BAR_ACTS"],
			states: ["rest", "loading", "disabled"],
			owns: {
				roles: ["meta", "body"],
				colors: [
					"ink-meta",
					"ink-body",
					"edge",
					"danger",
					"act-accent",
					"on-act-accent",
					"act-danger",
					"on-act-danger",
				],
				radii: ["control"],
				spacing: ["pair", "acts", "inside", "control-x"],
				sizes: ["control", "field"],
			},
		},
		Columns: {
			props: ["fit", "children"],
			draws: ["COLUMNS", "COLUMN"],
			holds: ["COLUMNS", "COLUMN"],
			states: ["rest"],
			owns: { spacing: ["fields", "page", "sections"], sizes: ["column"] },
		},
		// The sidebar on the desktop, the tab bar on touch.
		Shell: {
			props: ["places", "banner", "switcher", "children"],
			draws: [
				"SHELL_SIDEBAR",
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
				"TEXT_STRONG.role.body",
				"ICON.fit.body",
				"ICON.fit.control",
				"COUNT",
				"COUNT_LABEL",
			],
			holds: [
				"SHELL_SIDEBAR",
				"SHELL_BANNER",
				"SWITCHER_SLOT",
				"SWITCHER",
				"SHELL_PLACES",
				"PLACE_ROW",
				"PLACE_ROW_GLYPH",
				"SHELL_TAB_BAR",
				"PLACE_TAB",
				"PLACE_TAB_LABEL",
			],
			states: [...PRESS, "selected"],
			owns: {
				roles: ["body", "caption"],
				colors: [
					"canvas",
					"surface",
					"edge",
					"ink-body",
					"ink-meta",
					"fill-neutral",
					"wash-hover",
					"wash-press",
					"wash-selected",
					"wash-selected-hover",
					"ring",
				],
				radii: ["row", "control", "full"],
				spacing: ["inside", "control-x", "rows", "pair", "float", "page"],
				sizes: [
					"row",
					"sidebar",
					"target",
					"chip",
					"icon",
					"icon-control",
					"popover",
				],
			},
		},
	},
	shared: {
		// A `change` (where the row stands in a change set) draws its mark in a
		// lane one icon wide ahead of the leading slot, glyph only, the kind's word
		// its name; a set's untouched rows are `unchanged`, so the titles line up.
		// Its acts are the more act, the same on every row of a list, and one
		// labelled `act` ahead of it (a secondary Button at the bar fit, the
		// next step the row names): an act a row waits on (a retry) is told by
		// its Status and leads the menu, and its pending press stays on `act`.
		// An `entry` (an Input at the bar fit and its labelled Button) stands
		// under the title in the meta line's place, its error under it; the
		// consumer gives `meta` or `status` once the act settles. At most one
		// each of Status, warning, lock and Chip, on the meta line in that
		// order: a warning is what is wrong with the row (the act that clears
		// it is the row's `act`), a lock what the row holds (its label shown
		// from `tablet`, read aloud always). Its trailing is a value, or a
		// pick: a `Picker` at the `row` fit, centred in the row.
		// A `leading` of `check` is the row's tick, a `Checkbox` in the leading
		// slot named by the title; its `blocked` reason draws it disabled and
		// leads the meta line.
		ListRow: {
			props: [
				"change",
				"leading",
				"title",
				"meta",
				"trailing",
				"status",
				"warning",
				"lock",
				"chip",
				"entry",
				"act",
				"more",
				"href",
				"onOpen",
			],
			draws: [
				"ROW.lines.one",
				"ROW.lines.two",
				"ROW.state.rest",
				"ROW.state.highlighted",
				"ROW.state.pressed",
				"ROW.state.selected",
				"ROW.state.selected-hover",
				"ROW.ground.list",
				"ROW.ground.group",
				"ROW_LEADING",
				"ROW_TITLE_LINE",
				"ROW_META_LINE",
				"ROW_TRAILING",
				"ROW_MARKS",
				"ROW_WARNING",
				"ROW_ACTS",
				"CHANGE_MARK",
				"CHECKBOX",
				"CHECKBOX_MARK",
				"TEXT.role.body",
				"TEXT_STRONG.role.body",
				"TEXT.role.meta",
				"ICON.fit.body",
				"ICON.fit.meta",
				"AVATAR",
				"AVATAR_LABEL",
				"STATUS",
				"STATUS_DOT",
				"STATUS_SPINNER",
				"STATUS_LABEL",
				"SPINNER",
				"SPINNER_TRACK",
				"SPINNER_ARC",
				"CHIP",
				"CHIP_LABEL",
				"ICON_BUTTON.fit.bar",
				"BUTTON.act.secondary",
				"BUTTON.fit.bar",
				"BUTTON_LABEL.act.secondary",
				"FIELD.fit.bar",
				"FIELD.trailing.none",
				"FIELD.state.rest",
				"FIELD.state.error",
				"FIELD_VALUE.kind.text",
				"FIELD_PLACEHOLDER",
				"ROW_ENTRY",
				"ROW_ENTRY_ERROR",
				"SKELETON.kind.avatar",
				"SKELETON.kind.icon",
				"SKELETON.kind.dot",
				"SKELETON.kind.check",
				"SKELETON.kind.bar",
				"SKELETON_LANE.role.body",
				"SKELETON_LANE.role.meta",
				"SKELETON.kind.line",
				"LINE_BOX.role.body",
				"LINE_BOX.role.meta",
			],
			holds: [
				"ROW_TRAILING",
				"ROW_MARKS",
				"ROW_WARNING",
				"ROW_ACTS",
				"ROW_ENTRY",
				"ROW_ENTRY_ERROR",
			],
			states: [...PRESS, "loading", "error", "selected"],
			owns: {
				roles: ["body", "meta", "caption"],
				colors: [
					"ink-body",
					"ink-meta",
					"ink-disabled",
					"ink-error",
					"surface",
					"edge",
					"edge-error",
					"wash-hover",
					"wash-press",
					"wash-selected",
					"wash-selected-hover",
					"ring",
					"accent-ink",
					"ok",
					"warn",
					"danger",
					"avatar-",
					"chip-",
					"skeleton",
					"fill-disabled",
					"edge-strong",
					"toggle-on",
					"toggle-on-hover",
					"on-accent",
				],
				radii: ["row", "full", "control", "chip"],
				spacing: ["inside", "rows", "control-x", "card", "acts", "pair"],
				sizes: [
					"row",
					"row-2",
					"avatar",
					"icon",
					"icon-meta",
					"dot",
					"spinner",
					"measure-short",
					"chip",
					"control-compact",
					"skeleton",
					"figures",
					"check",
					"target",
				],
			},
		},
		// A row's act is an icon act, never a labelled one; a link's chevron
		// stands in the act's square. A locked row keeps its value, a lock
		// after it and its reason as the line under it (the whole line a link
		// with an `href`); it takes no description, act or open, since its
		// reason is the one line and the one link. A `change` draws the change
		// mark ahead of the label, the kind's word its name.
		DefinitionRow: {
			props: [
				"change",
				"label",
				"description",
				"value",
				"copyable",
				"locked",
				"act",
				"href",
				"onOpen",
			],
			draws: [
				"ROW.lines.one",
				"ROW.lines.setting",
				"ROW.state.rest",
				"ROW.state.highlighted",
				"ROW.state.pressed",
				"ROW.ground.group",
				"DEFINITION_ROW",
				"DEFINITION_ROW_CHEVRON",
				"ROW_TITLE_LINE",
				"TEXT.role.body",
				"TEXT_STRONG.role.body",
				"TEXT.role.meta",
				"TEXT.role.code",
				"ICON.fit.body",
				"ICON.fit.meta",
				"LINK.fit.inline",
				"LOCK_GLYPH",
				"STATUS",
				"STATUS_DOT",
				"STATUS_SPINNER",
				"STATUS_LABEL",
				"SPINNER",
				"SPINNER_TRACK",
				"SPINNER_ARC",
				"ICON_BUTTON.fit.bar",
				"CHANGE_MARK",
			],
			holds: ["DEFINITION_ROW", "DEFINITION_ROW_CHEVRON"],
			states: [...PRESS],
			owns: {
				roles: ["body", "meta", "code"],
				colors: [
					"ink-body",
					"ink-meta",
					"wash-hover",
					"wash-press",
					"ring",
					"accent-ink",
					"ok",
					"warn",
					"danger",
				],
				radii: ["full", "control"],
				spacing: ["fields", "card", "inside", "pair"],
				sizes: [
					"row",
					"row-setting",
					"control-compact",
					"icon",
					"icon-meta",
					"dot",
					"spinner",
					"measure-short",
				],
			},
		},
		// The label at body 500 over the control, the description and the
		// error line in meta; disabled, the label in the disabled ink and the
		// description kept as the reason. A switch stands at the label's end,
		// a checkbox on the label's line ahead of it. `answered` folds the field
		// to one summary row at the row height (a check in the `ok` ink, the
		// label, the answer in meta, a pencil act named by the `edit` word) and
		// renders no control; once `onEdit` clears it the field unfolds and
		// focuses its control. A folded field is a rest field: it shows no
		// description, error or disabled form.
		// A `change` draws the change mark in a lane ahead of the label (on a
		// checkbox's line, ahead of the box), the kind's word its name.
		FormField: {
			props: [
				"change",
				"label",
				"description",
				"error",
				"disabled",
				"answered",
				"field",
				"children",
			],
			draws: [
				"FORM_FIELD",
				"FORM_FIELD_ERROR",
				"FORM_FIELD_SUMMARY",
				"FORM_FIELD_SUMMARY_GLYPH",
				"CHANGE_MARK",
				"ICON.fit.body",
				"ICON.fit.meta",
				"ICON_BUTTON.fit.bar",
				"LINE_BOX.role.body",
				"TEXT.role.body",
				"TEXT_STRONG.role.body",
				"TEXT.role.meta",
			],
			holds: [
				"FORM_FIELD",
				"FORM_FIELD_ERROR",
				"FORM_FIELD_SUMMARY",
				"FORM_FIELD_SUMMARY_GLYPH",
			],
			states: ["rest", "disabled", "error"],
			owns: {
				roles: ["body", "meta"],
				colors: [
					"ink-body",
					"ink-meta",
					"ink-error",
					"ink-disabled",
					"ok",
					"warn",
					"danger",
				],
				radii: ["control"],
				spacing: ["pair", "fields", "inside"],
				sizes: ["row", "icon", "icon-meta", "control-compact"],
			},
		},
		// Loading, each line keeps its line box and the facts line the height
		// of the status that moves on it. A fact in words that opens a sheet is its
		// words and a chevron in a `PILL_ACT`, a button named by the fact.
		ItemHeader: {
			props: ["overline", "title", "facts", "loading"],
			draws: [
				"ITEM_HEADER",
				"THREAD_COLUMN",
				"ITEM_FACTS",
				"ITEM_FACT",
				"PILL_ACT",
				"ICON.fit.meta",
				"TEXT.role.meta",
				"TEXT.role.heading",
				"STATUS",
				"STATUS_DOT",
				"STATUS_SPINNER",
				"STATUS_LABEL",
				"SPINNER",
				"SPINNER_TRACK",
				"SPINNER_ARC",
				"COUNT",
				"COUNT_LABEL",
				"BUTTON.act.secondary",
				"BUTTON.fit.bar",
				"BUTTON_LABEL.act.secondary",
				"LINE_BOX.role.meta",
				"LINE_BOX.role.heading",
				"SKELETON_LINES",
				"SKELETON_ROW.kind.facts",
				"SKELETON.kind.line",
				"SKELETON.kind.count",
			],
			holds: ["ITEM_HEADER", "ITEM_FACTS", "ITEM_FACT"],
			states: ["rest", "loading"],
			owns: {
				roles: ["body", "meta", "heading", "caption"],
				colors: [
					"ink-body",
					"ink-meta",
					"edge",
					"fill-neutral",
					"skeleton",
					"wash-hover",
					"wash-press",
					"ring",
					"accent-ink",
					"ok",
					"warn",
					"danger",
				],
				radii: ["control", "chip", "full"],
				spacing: ["pair", "inside", "fields", "control-x"],
				sizes: [
					"skeleton",
					"target",
					"control-compact",
					"chip",
					"dot",
					"spinner",
					"icon-meta",
					"measure-short",
					"measure",
				],
			},
		},
		SegmentedControl: {
			props: ["label", "options", "value", "onChange"],
			draws: ["SEGMENTED_CONTROL", "SEGMENT", "SEGMENT_LABEL"],
			holds: ["SEGMENTED_CONTROL", "SEGMENT", "SEGMENT_LABEL"],
			states: [...PRESS, "selected"],
			owns: {
				roles: ["body"],
				colors: [
					"group",
					"ink-body",
					"ink-meta",
					"wash-hover",
					"wash-press",
					"wash-selected",
					"wash-selected-hover",
					"ring",
				],
				radii: ["control"],
				spacing: ["control-x"],
				sizes: ["control-compact"],
			},
		},
		// `fit` is the desktop side sheet's: a form, or a Split's record pane.
		// On touch the submit stands at the head row's end and a blocked
		// submit's reason under the head.
		Sheet: {
			props: [
				"open",
				"onClose",
				"title",
				"description",
				"back",
				"submit",
				"foot",
				"fit",
				"children",
			],
			draws: [
				"SHEET",
				"SHEET_SIDE",
				"SHEET_CENTERED",
				"SHEET_HEAD",
				"SHEET_HEAD_ROW",
				"SHEET_BODY",
				"SHEET_FOOT",
				"SCRIM",
				"TEXT.role.heading",
				"TEXT.role.body",
				"TEXT_STRONG.role.body",
				"TEXT.role.meta",
				"ICON_BUTTON.fit.bar",
				"ICON_BUTTON.fit.body",
				"BUTTON.act.primary",
				"BUTTON.fit.bar",
				"BUTTON_LABEL.act.primary",
			],
			holds: [
				"SHEET",
				"SHEET_SIDE",
				"SHEET_CENTERED",
				"SHEET_HEAD",
				"SHEET_HEAD_ROW",
				"SHEET_BODY",
				"SHEET_FOOT",
			],
			states: ["rest", "disabled", "loading"],
			owns: {
				roles: ["heading", "body", "meta"],
				colors: [
					"scrim",
					"raised",
					"edge-raised",
					"edge",
					"ink-body",
					"ink-meta",
					"act-accent",
					"on-act-accent",
				],
				radii: ["sheet", "control"],
				spacing: [
					"pair",
					"card",
					"acts",
					"fields",
					"inside",
					"control-x",
					"page",
				],
				sizes: ["sheet", "pane", "dialog", "control", "control-compact"],
				elevation: ["modal"],
			},
		},
		// The pick outside a form that applies at once: a field box, or (a row's
		// trailing, `fit: row`) its value and a chevron in a `PILL_ACT`; either
		// opens a popover of rows (a sheet of rows on touch), a search field
		// above six options; an option may lead with its avatar, and one act
		// (the act that makes a new option) ends the list under a hairline. At
		// the `bar` fit the field box fills its column. An option's `chip` draws
		// after its label in the list and on the trigger. Its `value` an array
		// makes it a pick of several: the rows tick and the list stays open, and
		// the box holds one removable neutral chip per value.
		Picker: {
			props: ["label", "options", "value", "onChange", "fit", "act"],
			draws: [
				"PICKER",
				"HAIRLINE",
				"ROW_LEADING",
				"AVATAR",
				"AVATAR_LABEL",
				"PILL_ACT",
				"PICKER_VALUE",
				"ICON.fit.meta",
				"CHIP",
				"CHIP_LABEL",
				"FIELD.fit.bar",
				"FIELD.trailing.none",
				"FIELD.state.rest",
				"FIELD_VALUE.kind.text",
				"FIELD_VALUE.kind.search",
				"FIELD_PLACEHOLDER",
				"FIELD_GLYPH",
				"ICON.fit.control",
				"PICKER_EMPTY",
				"POPOVER",
				"PICKER_POPOVER",
				"SELECT_GROUP",
				"ROW.lines.one",
				"ROW.lines.two",
				"ROW.state.rest",
				"ROW.state.highlighted",
				"ROW.state.pressed",
				"ROW.ground.list",
				"ROW.ground.group",
				"TEXT.role.body",
				"TEXT.role.meta",
				"ICON.fit.body",
			],
			holds: ["PICKER", "PICKER_VALUE", "PICKER_EMPTY", "PICKER_POPOVER"],
			states: [...PRESS, "selected"],
			owns: {
				roles: ["body", "meta", "caption"],
				colors: [
					"ink-body",
					"ink-meta",
					"surface",
					"edge",
					"edge-hover",
					"raised",
					"avatar-",
					"chip-",
					"edge-raised",
					"wash-hover",
					"wash-press",
					"ring",
				],
				radii: ["full", "control", "popover", "row"],
				spacing: ["inside", "pair", "float", "rows", "control-x", "card"],
				sizes: [
					"target",
					"control-compact",
					"popover",
					"avatar",
					"chip",
					"measure-short",
					"row",
					"row-2",
					"icon-meta",
					"icon",
					"icon-control",
				],
				elevation: ["float"],
			},
		},
		// A popover under its trigger on the desktop, a sheet of rows on touch;
		// a destructive act in `danger`, last under a hairline, a blocked one
		// with its reason under it.
		Menu: {
			props: ["label", "items"],
			draws: [
				"MENU",
				"MENU_GROUP",
				"MENU_LABEL",
				"POPOVER",
				"ROW.lines.one",
				"ROW.lines.two",
				"ROW.state.rest",
				"ROW.state.highlighted",
				"ROW.state.pressed",
				"ROW.ground.list",
				"TEXT.role.body",
				"TEXT.role.meta",
				"ICON.fit.body",
				"ICON_BUTTON.fit.bar",
				"ICON_BUTTON.fit.body",
			],
			holds: ["MENU", "MENU_GROUP", "MENU_LABEL"],
			states: [...PRESS],
			owns: {
				roles: ["body", "meta"],
				colors: [
					"raised",
					"edge-raised",
					"edge",
					"ink-body",
					"ink-meta",
					"ink-disabled",
					"danger",
					"wash-hover",
					"wash-press",
				],
				radii: ["popover", "row", "control"],
				spacing: ["pair", "float", "rows", "inside", "control-x"],
				sizes: [
					"popover",
					"row",
					"row-2",
					"icon",
					"control",
					"control-compact",
				],
				elevation: ["float"],
			},
		},
		// Check rows under group labels on a hairline card, a chosen option
		// checked (the row takes no wash); radio rows when `value` is one value
		// or null, a radiogroup whose chosen ring holds its dot. The
		// recommended mark on its description line; the children under a
		// chosen option at its label's start. From a query, its failed line
		// (`sentence` beside Retry) and its `empty` sentence stand in the card.
		OptionList: {
			props: [
				"options",
				"query",
				"option",
				"sentence",
				"empty",
				"value",
				"onChange",
				"loading",
				"children",
			],
			draws: [
				"OPTION_LIST",
				"SELECT_GROUP",
				"OPTION_GROUP_LABEL",
				"TEXT.role.meta",
				"TEXT_STRONG.role.meta",
				"ROW.lines.one",
				"ROW.lines.two",
				"ROW.state.rest",
				"ROW.state.highlighted",
				"ROW.state.pressed",
				"ROW.ground.list",
				"OPTION_LINE",
				"LINE_BOX.role.body",
				"LINE_BOX.role.meta",
				"CHECKBOX",
				"CHECKBOX_MARK",
				"OPTION_RADIO",
				"OPTION_RADIO_DOT",
				"TEXT.role.body",
				"ROW_TITLE_LINE",
				"ROW_META_LINE",
				"CHIP.family.neutral",
				"CHIP_LABEL.family.neutral",
				"OPTION_CHILDREN",
				"OPTION_INDENT",
				"SKELETON.kind.check",
				"SKELETON.kind.radio",
				"SKELETON.kind.line",
				"SKELETON_LANE",
				"BUTTON.act.secondary",
				"BUTTON.fit.bar",
				"BUTTON_LABEL.act.secondary",
			],
			holds: [
				"OPTION_LIST",
				"OPTION_LINE",
				"OPTION_CHILDREN",
				"OPTION_INDENT",
				"OPTION_RADIO",
				"OPTION_RADIO_DOT",
			],
			states: [...PRESS, "loading", "error", "empty", "selected"],
			owns: {
				roles: ["body", "meta", "caption"],
				colors: [
					"surface",
					"edge",
					"edge-strong",
					"ink-body",
					"ink-meta",
					"toggle-on",
					"on-accent",
					"ring",
					"wash-hover",
					"wash-press",
					"skeleton",
					"chip-",
				],
				radii: ["card", "row", "chip", "full", "control"],
				spacing: ["pair", "float", "rows", "control-x", "inside"],
				sizes: [
					"row",
					"row-2",
					"check",
					"dot",
					"icon-meta",
					"chip",
					"measure-short",
					"skeleton",
					"control-compact",
				],
			},
		},
		// Its column at the empty width: the mark (the control disc holding
		// `icon` at the control fit), the title at the role of where it stands
		// (heading on a page, body 500 in a Section, title on a first run) and
		// the act; in a Section a hairline frame around it, in a Group the
		// card's.
		EmptyState: {
			props: ["icon", "title", "sentence", "act", "children"],
			draws: [
				"EMPTY_COLUMN",
				"EMPTY_TEXT",
				"EMPTY_FRAME",
				"EMPTY_CARD",
				"EMPTY_MARK",
				"ICON.fit.control",
				"TEXT.role.title",
				"TEXT.role.heading",
				"TEXT.role.body",
				"TEXT_STRONG.role.body",
				"TEXT.role.meta",
				"BUTTON.act.primary",
				"BUTTON.act.secondary",
				"BUTTON.fit.bar",
				"BUTTON.fit.body",
				"BUTTON_LABEL.act.primary",
				"BUTTON_LABEL.act.secondary",
			],
			holds: [
				"EMPTY_COLUMN",
				"EMPTY_TEXT",
				"EMPTY_FRAME",
				"EMPTY_CARD",
				"EMPTY_MARK",
			],
			states: ["rest"],
			owns: {
				roles: ["title", "heading", "body", "meta"],
				colors: [
					"fill-neutral",
					"ink-body",
					"ink-meta",
					"danger",
					"edge",
					"act-accent",
					"on-act-accent",
				],
				radii: ["full", "card", "control"],
				spacing: ["fields", "pair", "card", "inside", "control-x", "acts"],
				sizes: ["empty", "control", "control-compact", "icon-control"],
			},
		},
		// Loading, the body's own loading form (`loading`), else the loading
		// form of the Group or List it composes (a Section's busy head through
		// the Section either way); failed, the EmptyState's failed form with its
		// sentence and a retry act. It spells no cell.
		QueryBoundary: {
			props: ["query", "sentence", "children", "loading"],
			draws: [],
			states: ["rest", "loading", "error"],
		},
		Toast: {
			props: ["sentence", "state", "act"],
			draws: [
				"TOAST",
				"TOAST_STATE",
				"ICON.fit.body",
				"TEXT.role.body",
				"BUTTON.act.secondary",
				"BUTTON.fit.bar",
				"BUTTON_LABEL.act.secondary",
				"ICON_BUTTON.fit.bar",
			],
			holds: ["TOAST", "TOAST_STATE"],
			states: ["rest"],
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
					"danger",
				],
				radii: ["card", "control"],
				spacing: ["card", "pair", "inside", "control-x"],
				sizes: ["toast", "icon", "control-compact"],
				elevation: ["float"],
			},
		},
		Banner: {
			props: ["kind", "sentence", "act"],
			draws: [
				"BANNER",
				"BANNER_ROW",
				"BANNER_MAIN",
				"BANNER_GLYPH",
				"ICON.fit.body",
				"TEXT.role.body",
				"TEXT.role.meta",
				"BUTTON.act.secondary",
				"BUTTON.fit.bar",
				"BUTTON_LABEL.act.secondary",
			],
			holds: ["BANNER", "BANNER_ROW", "BANNER_MAIN", "BANNER_GLYPH"],
			states: ["rest", "disabled"],
			owns: {
				roles: ["body", "meta"],
				colors: [
					"ink-body",
					"ink-meta",
					"edge",
					"accent-soft",
					"accent-ink",
					"warn-soft",
					"warn",
					"danger-soft",
					"danger",
				],
				radii: ["control"],
				spacing: ["control-x", "pair", "inside"],
				sizes: ["icon", "control-compact"],
			},
		},
		// The track in an action bar's place, the act a Button beside it.
		PendingBar: {
			props: ["sentence", "until", "act"],
			draws: [
				"PENDING_BAR",
				"PENDING_ROW",
				"PENDING_TRACK",
				"PENDING_FILL",
				"PENDING_LEFT",
				"SPINNER",
				"SPINNER_TRACK",
				"SPINNER_ARC",
				"TEXT.role.body",
				"TEXT.role.meta",
				"BUTTON.act.secondary",
				"BUTTON.fit.body",
				"BUTTON_LABEL.act.secondary",
			],
			holds: [
				"PENDING_BAR",
				"PENDING_ROW",
				"PENDING_TRACK",
				"PENDING_FILL",
				"PENDING_LEFT",
			],
			states: ["rest", "disabled"],
			owns: {
				roles: ["body", "meta"],
				colors: ["group", "ink-body", "ink-meta", "edge"],
				radii: ["control", "full"],
				spacing: ["pair", "acts", "control-x", "inside"],
				sizes: ["control", "track", "spinner"],
			},
		},
	},
	content: {
		// Markdown at the measure: headings, paragraphs, lists, quotes, rules, inline
		// code and links; a fenced block is a `Code`. No syntax colours, tables,
		// task lists or images.
		Prose: {
			props: ["markdown", "loading"],
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
				"SKELETON.kind.line",
				"TEXT.role.body",
				"TEXT.role.heading",
				"TEXT_STRONG.role.body",
			],
			holds: [
				"PROSE",
				"PROSE_PART",
				"PROSE_BLOCKS",
				"PROSE_LIST",
				"PROSE_ITEM",
				"PROSE_MARKER",
				"PROSE_CODESPAN",
				"PROSE_QUOTE",
				"PROSE_RULE",
				"PROSE_EMPHASIS",
				"PROSE_STRIKE",
			],
			states: ["rest", "loading"],
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
				spacing: ["sections", "pair", "fields", "inside", "control-x"],
				sizes: ["measure", "icon", "skeleton"],
			},
		},
		// The frame Code, Diff and ProseDiff share; the head a strip-high bar, the
		// copy and download acts its IconButtons at the body fit; `tail` folds the earlier lines
		// behind a one-way act, the focus landing on the code.
		Code: {
			props: ["text", "title", "tail", "copy", "download", "loading"],
			draws: [
				"CODE_ACT",
				"CODE_FOLD",
				"CODE_HEAD",
				"CODE_TEXT",
				"CODE_UNDER_HEAD",
				"CONTENT_FRAME",
				"ICON.fit.control",
				"ICON.fit.meta",
				"ICON_BUTTON.fit.body",
				"LINE_BOX.role.code",
				"LINE_BOX.role.meta",
				"SKELETON.kind.line",
				"TEXT.role.code",
				"TEXT.role.meta",
			],
			holds: [
				"CODE_HEAD",
				"CODE_UNDER_HEAD",
				"CODE_TEXT",
				"CODE_ACT",
				"CODE_FOLD",
			],
			states: [...PRESS, "loading"],
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
				spacing: ["tile", "acts", "float", "inside"],
				sizes: [
					"control",
					"icon-control",
					"strip",
					"target",
					"icon-meta",
					"skeleton",
				],
			},
		},
		// Unified, long lines wrapped and hung one inset, at every width; `before`
		// and `after` are diffed in each plugin.
		Diff: {
			props: ["label", "hunks", "before", "after", "loading"],
			draws: [
				"CONTENT_FRAME",
				"DIFF_CODE",
				"DIFF_GUTTER",
				"DIFF_HANG",
				"DIFF_HUNK",
				"DIFF_LINE",
				"DIFF_MARK",
				"SKELETON.kind.line",
			],
			holds: [
				"DIFF_LINE",
				"DIFF_HUNK",
				"DIFF_HANG",
				"DIFF_GUTTER",
				"DIFF_MARK",
				"DIFF_CODE",
			],
			states: ["rest", "loading"],
			owns: {
				roles: ["code"],
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
				spacing: ["inside", "rows", "control-x"],
				sizes: ["figures", "skeleton"],
			},
		},
		ProseDiff: {
			props: ["before", "after", "loading"],
			draws: [
				"CONTENT_FRAME",
				"LINE_BOX.role.body",
				"PROSE_DIFF_BODY",
				"PROSE_DIFF_RUN",
				"PROSE_DIFF_TEXT",
				"SKELETON.kind.line",
				"TEXT.role.body",
			],
			holds: ["PROSE_DIFF_BODY", "PROSE_DIFF_TEXT", "PROSE_DIFF_RUN"],
			states: ["rest", "loading"],
			owns: {
				roles: ["body"],
				colors: [
					"edge",
					"surface",
					"ink-body",
					"danger-soft",
					"ok-soft",
					"skeleton",
				],
				radii: ["card", "chip"],
				spacing: ["card"],
				sizes: ["measure", "skeleton"],
			},
		},
		// A one-line row on its ground, its leading the row's slot, the path cut
		// as text by the component to the room its chip leaves, each count in its
		// own lane. At most one Chip, between the path and the counts.
		FileRow: {
			props: [
				"path",
				"added",
				"removed",
				"seen",
				"chip",
				"href",
				"onOpen",
				"loading",
			],
			draws: [
				"CHIP",
				"CHIP_LABEL",
				"FILE_COUNT",
				"FILE_COUNTS",
				"FILE_PATH",
				"FILE_PATH_PART",
				"ICON.fit.body",
				"ROW.ground.group",
				"ROW.ground.list",
				"ROW.lines.one",
				"ROW.state.highlighted",
				"ROW.state.pressed",
				"ROW.state.rest",
				"ROW.state.selected",
				"ROW.state.selected-hover",
				"ROW_LEADING",
				"SKELETON.kind.icon",
				"SKELETON.kind.line",
				"SKELETON_LANE.role.meta",
				"SKELETON_ROW.kind.one-line",
				"SKELETON_ROW.kind.one-line-group",
			],
			holds: ["FILE_PATH", "FILE_PATH_PART", "FILE_COUNTS", "FILE_COUNT"],
			states: [...PRESS, "selected", "loading"],
			owns: {
				roles: ["code", "meta", "caption"],
				colors: [
					"ink-meta",
					"ink-body",
					"ok",
					"danger",
					"wash-hover",
					"ring",
					"wash-press",
					"wash-selected",
					"wash-selected-hover",
					"chip-",
					"skeleton",
				],
				radii: ["row", "full", "chip"],
				spacing: ["inside", "control-x", "card"],
				sizes: [
					"row",
					"avatar",
					"icon",
					"figures",
					"skeleton",
					"measure-short",
					"chip",
				],
			},
		},
		// A Group of its own rows (not list rows, so a wrapped value keeps its air);
		// on touch the label stands on its own line over the values. A
		// collection: its facts from `query` or `items` through a `row` map, its
		// head from the declared `columns`, so its waiting facts draw a bar per
		// column under the real head; its failed and empty EmptyStates its own.
		// A fact's `status` is its verdict, a Status in the label's line after
		// its chips; a passing fact gives none, or a done one where the screen
		// wants the pass read.
		Comparison: {
			props: [
				"label",
				"columns",
				"query",
				"sentence",
				"empty",
				"row",
				"items",
				"loading",
			],
			draws: [
				"CHIP.family.neutral",
				"CHIP.trailing.none",
				"CHIP_LABEL.family.neutral",
				"COMPARISON_LABEL",
				"COMPARISON_ROW",
				"LINE_BOX.role.body",
				"SKELETON.kind.dot",
				"SKELETON.kind.line",
				"SKELETON_LANE.role.body",
				"STATUS",
				"STATUS_DOT",
				"STATUS_LABEL",
				"STATUS_SPINNER",
				"TEXT.role.body",
				"TEXT.role.meta",
				"TEXT_STRONG.role.body",
				"TEXT_STRONG.role.meta",
			],
			holds: ["COMPARISON_ROW", "COMPARISON_LABEL"],
			states: ["rest", "loading", "error", "empty"],
			owns: {
				roles: ["meta", "body", "caption"],
				colors: [
					"ink-meta",
					"ink-body",
					"chip-neutral-soft",
					"chip-neutral-ink",
					"skeleton",
					"ok",
					"warn",
					"danger",
					"accent-ink",
				],
				radii: ["full", "chip"],
				spacing: ["pair", "inside", "card"],
				sizes: ["row", "chip", "dot", "measure-short", "skeleton"],
			},
		},
		// The grid from tablet up, a cell cursor its keyboard; below tablet a List of
		// ListRows with the sort a Picker above it. It takes `query` (with
		// `sentence`) or `items`, each column reading its cell from the item and
		// `row` the row's own slots, and draws its four states. It sorts in its
		// own state (descending, ascending, off); `onEdit` requires `onOpen`, and
		// with `onOpen` the leading column never edits. A row's `change` slot draws
		// the change mark ahead of the leading cell's name (a `ListRow` change
		// below tablet), the kind's word its name. `choose` (`TableChoice`,
		// controlled: `chosen` ids, `onChange` hearing the set a tick makes, the
		// consumer applying its rule) leads the grid with a tick column: a
		// Checkbox per row named by its leading cell, and a head Checkbox named
		// by `chooseAll`, unchecked, mixed or checked over the rows that can be
		// ticked. A `blocked` row's tick is disabled and a `moved` row says why,
		// each reason a meta line under the leading cell, growing only that row
		// to the two-line row; below tablet the tick leads the row (a `ListRow`
		// check) and the reason leads its meta. The table draws no count: the
		// selection bar's is the count.
		Table: {
			props: [
				"columns",
				"query",
				"sentence",
				"items",
				"loading",
				"row",
				"selected",
				"choose",
				"onOpen",
				"onEdit",
				"empty",
			],
			draws: [
				"CHECKBOX",
				"CHECKBOX_MARK",
				"CHANGE_MARK",
				"CHIP.family.teal",
				"CHIP.trailing.none",
				"CHIP_LABEL.family.teal",
				"FIELD.fit.bar",
				"FIELD.state.rest",
				"FIELD.trailing.none",
				"FIGURES",
				"ICON.fit.body",
				"ICON.fit.meta",
				"LOCK_GLYPH",
				"SKELETON.kind.check",
				"SKELETON.kind.dot",
				"SKELETON.kind.line",
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
				"TABLE_EMPTY",
				"TABLE_FRAME",
				"TABLE_FROZEN",
				"TABLE_FROZEN_CELL",
				"TABLE_HEAD",
				"TABLE_HEAD_LABEL",
				"TABLE_ROW",
				"TEXT.role.body",
				"TEXT.role.code",
				"TEXT.role.meta",
				"TEXT_STRONG.role.body",
			],
			holds: [
				"TABLE_FRAME",
				"TABLE",
				"TABLE_ROW",
				"TABLE_CELL",
				"TABLE_CHANGE",
				"TABLE_NAME",
				"TABLE_CHANGE_VALUE",
				"TABLE_HEAD",
				"TABLE_HEAD_LABEL",
				"TABLE_FROZEN",
				"TABLE_FROZEN_CELL",
				"TABLE_EMPTY",
			],
			states: [...PRESS, "loading", "error", "selected", "empty"],
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
				spacing: ["control-x", "inside", "pair", "page"],
				// A column stands at any `widths` rung its descriptor names.
				sizes: [
					...WIDTHS,
					"row",
					"row-2",
					"target",
					"icon-meta",
					"chip",
					"check",
					"dot",
					"spinner",
					"control-compact",
					"icon",
					"skeleton",
				],
			},
		},
		// Rules, one per row, each a pair (a source mapped to a target: from, an
		// arrow, to) or a condition (a field, fixed operator words, a value), the
		// terms each a `Picker` at the `bar` fit (a pick, or a pick of several as
		// removable chips) or an either (a pick whose list ends with the act that
		// types a value, or the typed `Input` whose act picks again), and a
		// remove act. From `tablet` the columns align across rows; on touch each
		// rule is a card of stacked terms in a `Group`. `add` ends the list.
		Rules: {
			props: ["rules", "add"],
			draws: [
				"ICON.fit.meta",
				"RULES",
				"RULE_ROW",
				"RULE_CARD",
				"RULE_ARROW",
				"TEXT.role.meta",
			],
			holds: ["RULES", "RULE_ROW", "RULE_CARD", "RULE_ARROW"],
			states: ["rest"],
			owns: {
				roles: ["meta"],
				colors: ["ink-meta", "ink-disabled"],
				spacing: ["inside", "pair", "card"],
				sizes: ["icon-meta"],
			},
		},
		// Its props are a union on `author`: `you` and `other` take `name`,
		// `attachments` (an attachment with `src` a thumbnail, one without a
		// chip of its name, in one row over the bubble) and `meta` (the
		// provenance line before the time), `system` takes `onOpen` and
		// `detail` (a `MessageDetail`: a row, one `ListRow` in a hairline card,
		// a free act's code, or a fold its line opens). A reply's body is a
		// `Prose`; `at` is an ISO moment each plugin formats in the document's
		// language (the time alone today).
		Message: {
			props: [
				"author",
				"name",
				"body",
				"at",
				"attachments",
				"meta",
				"onOpen",
				"detail",
				"loading",
			],
			draws: [
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
				"MESSAGE_CARD",
				"MESSAGE_CODE",
				"MESSAGE_FOLD",
				"SKELETON.kind.line",
				"TEXT.role.body",
				"TEXT.role.meta",
				"TEXT.role.code",
				"TEXT_STRONG.role.body",
			],
			holds: [
				"MESSAGE",
				"MESSAGE_BUBBLE",
				"MESSAGE_HEAD",
				"MESSAGE_LINE",
				"MESSAGE_OPEN",
				"MESSAGE_CARD",
				"MESSAGE_CODE",
				"MESSAGE_FOLD",
			],
			states: [...PRESS, "loading"],
			owns: {
				roles: ["meta", "body", "code", "caption"],
				colors: [
					"ink-meta",
					"group",
					"ink-body",
					"edge",
					"surface",
					"skeleton",
					"wash-hover",
					"ring",
					"wash-press",
					"chip-",
				],
				radii: ["card", "control", "chip", "full"],
				spacing: ["pair", "tile", "inside"],
				sizes: [
					"target",
					"icon-meta",
					"skeleton",
					"figures",
					"chip",
					"measure-short",
					"image-tile",
				],
			},
		},
		// Stacked on the desktop, one row on touch; `onDetach(id)` removes an
		// attachment, and the notice's act carries its own pending, so the input
		// has no loading form. `onAttach(files)` hears every file the attach act
		// chooses (and, on the web, a paste or a drop on the input); the
		// consumer turns a file into an `Attachment` and passes it back, a
		// thumbnail with its remove act at its corner when it has `src`. While
		// `working`, Stop stands before Send (an icon act on touch) and Send
		// still sends; the notice says what becomes of a message sent then.
		MessageInput: {
			props: [
				"value",
				"onChange",
				"attachments",
				"onAttach",
				"onDetach",
				"placeholder",
				"notice",
				"working",
				"onSend",
				"onStop",
				"disabled",
			],
			draws: [
				"BUTTON.act.primary",
				"BUTTON.act.secondary",
				"BUTTON.fit.bar",
				"BUTTON_LABEL.act.primary",
				"BUTTON_LABEL.act.secondary",
				"CHIP.family.neutral",
				"CHIP.trailing.remove",
				"CHIP_LABEL.family.neutral",
				"CHIP_REMOVE_HIT",
				"FIELD.fit.bar",
				"FIELD.state.rest",
				"FIELD.trailing.none",
				"FIELD_VALUE.kind.text",
				"ICON.fit.control",
				"ICON.fit.meta",
				"ICON_BUTTON.fit.bar",
				"IMAGE.fit.thumb",
				"IMAGE_PICTURE.fit.thumb",
				"IMAGE_REMOVE",
				"MESSAGE_ATTACH_SLOT",
				"MESSAGE_ATTACHMENTS",
				"MESSAGE_INPUT",
				"MESSAGE_INPUT_BOX",
				"MESSAGE_INPUT_CHIPS",
				"MESSAGE_INPUT_FIELD",
				"MESSAGE_INPUT_FOOT",
				"MESSAGE_INPUT_ROW",
				"MESSAGE_INPUT_TEXT",
				"MESSAGE_INPUT_VALUE",
				"MESSAGE_NOTICE",
				"MESSAGE_NOTICE_TEXT",
				"SPINNER",
				"SPINNER_ARC",
				"SPINNER_TRACK",
				"TEXT.role.meta",
			],
			holds: [
				"MESSAGE_INPUT",
				"MESSAGE_INPUT_BOX",
				"MESSAGE_INPUT_CHIPS",
				"MESSAGE_INPUT_TEXT",
				"MESSAGE_INPUT_VALUE",
				"MESSAGE_INPUT_FOOT",
				"MESSAGE_INPUT_ROW",
				"MESSAGE_INPUT_FIELD",
				"MESSAGE_NOTICE",
				"MESSAGE_NOTICE_TEXT",
				"MESSAGE_ATTACH_SLOT",
			],
			states: ["rest", "hover", "focus", "disabled"],
			owns: {
				roles: ["body", "meta", "caption"],
				colors: [
					"edge",
					"surface",
					"ink-meta",
					"ink-body",
					"act-accent",
					"on-act-accent",
					"fill-disabled",
					"ink-disabled",
					"edge-hover",
					"ring",
					"raised",
					"chip-neutral-soft",
					"chip-neutral-ink",
				],
				radii: ["card", "control", "full"],
				spacing: ["pair", "rows", "inside", "control-x"],
				sizes: [
					"message-input",
					"control-compact",
					"icon-control",
					"chip",
					"measure-short",
					"icon-meta",
					"spinner",
					"image-tile",
				],
				elevation: ["float"],
			},
		},
		// A bar at the `meter` size, its fill by level, its value read aloud with
		// its `unit`. Under it one line: `meta`, or `counts` (links composed from
		// `Link`), never both. A `mark` is a tick across the track at its value,
		// the meter's near point, its label read aloud.
		Meter: {
			props: [
				"label",
				"value",
				"max",
				"unit",
				"meta",
				"counts",
				"mark",
				"loading",
			],
			draws: [
				"FIGURES",
				"LINE_BOX.role.body",
				"LINE_BOX.role.meta",
				"METER",
				"METER_COUNTS",
				"METER_FILL",
				"METER_HEAD",
				"METER_ITEM",
				"METER_MARK",
				"METER_TRACK",
				"SKELETON.kind.line",
				"SKELETON.kind.meter",
				"TEXT.role.body",
				"TEXT.role.meta",
				"TEXT_STRONG.role.body",
			],
			holds: [
				"METER",
				"METER_ITEM",
				"METER_HEAD",
				"METER_TRACK",
				"METER_FILL",
				"METER_COUNTS",
				"METER_MARK",
			],
			states: ["rest", "loading"],
			owns: {
				roles: ["body", "meta"],
				colors: [
					"ink-body",
					"ink-meta",
					"fill-neutral",
					"warn",
					"danger",
					"skeleton",
				],
				radii: ["chip"],
				spacing: ["pair", "inside", "card"],
				sizes: ["meter", "track", "skeleton"],
			},
		},
		// A known sequence with a position in it, top to bottom on a hairline
		// rail: each `steps` entry a `Stage` (`done`, `current` or `later`), a
		// done one a check at the meta icon size, its `at` a moment under the
		// label, the current one the active dot, its label at 500 and
		// `aria-current="step"`, a later one the hollow dot with its label in
		// meta. `ended` replaces every step after the last done one with a
		// terminal row: the failed dot, its label and its reason in meta. The
		// hue is the marks'; a label's ink is its own. Static data, so it has no
		// waiting form.
		Stages: {
			props: ["steps", "ended"],
			draws: [
				"ICON.fit.meta",
				"LINE_BOX.role.body",
				"LINE_BOX.role.meta",
				"STAGE",
				"STAGE_CHECK",
				"STAGE_RAIL",
				"STAGE_ROW",
				"STAGE_WORDS",
				"STATUS_DOT.state.active",
				"STATUS_DOT.state.failed",
				"STATUS_DOT.state.idle",
				"TEXT.role.meta",
			],
			holds: ["STAGE", "STAGE_ROW", "STAGE_WORDS", "STAGE_RAIL", "STAGE_CHECK"],
			states: ["rest"],
			owns: {
				roles: ["body", "meta"],
				colors: ["ink-body", "ink-meta", "edge", "accent-ink", "danger"],
				radii: ["full"],
				spacing: ["pair"],
				sizes: ["icon-meta", "dot"],
			},
		},
		// A strip of counts in one hairline card, its cells split by hairlines:
		// each a label over its figure (a unit beside it), then a meta line or
		// sub-counts (links composed from `Link`), or the whole cell a link to
		// its `href`, never both. Zeros are drawn. Cells stand in a row, two to a
		// row below `tablet` of the page and on the phone.
		Stats: {
			props: ["items", "loading"],
			draws: [
				"FIGURES",
				"LINE_BOX.role.figure",
				"LINE_BOX.role.meta",
				"SKELETON.kind.line",
				"STATS",
				"STATS_CELL",
				"STATS_COUNTS",
				"STATS_FIGURE",
				"TEXT.role.figure",
				"TEXT.role.meta",
			],
			holds: ["STATS", "STATS_CELL", "STATS_FIGURE", "STATS_COUNTS"],
			states: ["rest", "loading"],
			owns: {
				roles: ["figure", "meta"],
				colors: [
					"edge",
					"surface",
					"ink-body",
					"ink-meta",
					"skeleton",
					"wash-hover",
					"wash-press",
				],
				radii: ["card", "chip"],
				spacing: ["pair", "inside", "card"],
				sizes: ["skeleton"],
			},
		},
		// One figure at the `display` role, its label under it (figure first, read
		// "2, need you"), a unit beside the figure. One per screen.
		Stat: {
			props: ["label", "value", "unit", "loading"],
			draws: [
				"LINE_BOX.role.display",
				"LINE_BOX.role.meta",
				"SKELETON.kind.line",
				"STAT",
				"STAT_FIGURE",
				"TEXT.role.display",
				"TEXT.role.meta",
			],
			holds: ["STAT", "STAT_FIGURE"],
			states: ["rest", "loading"],
			owns: {
				roles: ["display", "meta"],
				colors: ["ink-body", "ink-meta", "skeleton"],
				radii: ["chip"],
				spacing: ["pair", "inside"],
				sizes: ["skeleton"],
			},
		},
		// A collection: columns over time in the chip marks, stacked by one
		// dimension, its bars from `query` or `items` through the `bar` map;
		// `label` names what it counts, the plot and the visually hidden table
		// the values reach assistive tech by; `keys` names the stack's parts in
		// order, so the legend and each part's mark stand before the data does.
		// Its failed and empty EmptyStates are its own, at its loaded height.
		BarChart: {
			props: [
				"label",
				"keys",
				"unit",
				"query",
				"sentence",
				"empty",
				"bar",
				"items",
				"loading",
			],
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
				"CHART_PART_SPLIT",
				"CHART_TICK_LANE",
				"CHART_TOTAL",
				"FIGURES",
				"LINE_BOX.role.body",
				"LINE_BOX.role.meta",
				"SKELETON.kind.chart",
				"SKELETON.kind.line",
				"TEXT.role.body",
				"TEXT.role.meta",
				"TEXT_STRONG.role.body",
			],
			holds: [
				"CHART",
				"CHART_HEAD",
				"CHART_TOTAL",
				"CHART_KEYS",
				"CHART_KEY",
				"CHART_KEY_DOT",
				"CHART_BODY",
				"CHART_GRID",
				"CHART_BAND",
				"CHART_MAIN",
				"CHART_FILL",
				"CHART_PART_SPLIT",
				"CHART_TICK_LANE",
			],
			states: ["rest", "loading", "error", "empty"],
			owns: {
				roles: ["body", "meta"],
				colors: ["ink-body", "ink-meta", "edge", "skeleton", "chip-"],
				radii: ["full", "chip"],
				spacing: ["fields", "inside", "pair"],
				sizes: ["chart", "dot", "skeleton", "figures"],
			},
		},
		// A collection: its Messages from `query` or `items` through the
		// `message` map, its waiting turns the Message's own loading forms, its
		// failed and empty EmptyStates its own in the log; a MessageInput its
		// `foot`, drawn in every state. While a filling Thread's reader is scrolled
		// up, a secondary Latest act floats over the log above the foot.
		Thread: {
			props: [
				"query",
				"sentence",
				"empty",
				"message",
				"items",
				"loading",
				"foot",
			],
			draws: [
				"THREAD",
				"THREAD_COLUMN",
				"THREAD_LOG",
				"THREAD_UNDER_HEAD",
				"FOOT",
				"THREAD_LATEST",
			],
			holds: ["THREAD", "THREAD_LOG", "THREAD_UNDER_HEAD", "THREAD_LATEST"],
			states: ["rest", "loading", "error", "empty"],
			owns: {
				colors: ["raised", "edge"],
				radii: ["control"],
				spacing: ["sections", "page", "pair"],
				sizes: ["measure"],
				elevation: ["float"],
			},
		},
		QrCode: {
			props: ["value", "loading"],
			draws: ["QR_CODE", "QR_TILE"],
			holds: ["QR_TILE", "QR_CODE"],
			states: ["rest", "loading"],
			owns: {
				colors: ["edge", "surface", "ink-body", "skeleton"],
				radii: ["card"],
				sizes: ["qr"],
			},
		},
		// A picture a press opens full size: a square tile (`thumb`) or its
		// container's width at its own aspect down to a height cap (`content`).
		// Waiting it is a skeleton at its box; failed, an `ImageOff` glyph with
		// the alt text in meta under it and nothing to open. The full view
		// stands over the sheet base's scrim and focus trap, contain-fit inside
		// the page inset, with a lifted Close act.
		Image: {
			props: ["src", "alt", "fit", "loading"],
			draws: [
				"IMAGE",
				"IMAGE_PICTURE",
				"IMAGE_FULL",
				"IMAGE_CLOSE",
				"ICON.fit.body",
				"ICON_BUTTON.fit.body",
				"TEXT.role.meta",
				"SCRIM",
			],
			holds: ["IMAGE", "IMAGE_PICTURE", "IMAGE_FULL", "IMAGE_CLOSE"],
			states: [...PRESS, "loading", "error"],
			owns: {
				roles: ["meta"],
				colors: [
					"edge",
					"edge-hover",
					"edge-strong",
					"skeleton",
					"group",
					"ink-meta",
					"raised",
					"scrim",
				],
				radii: ["control", "card"],
				spacing: ["page", "inside"],
				sizes: ["image-tile", "image-cap", "icon", "control"],
				elevation: ["float"],
			},
		},
	},
};

// `ListRow` → `list-row`: the component directory under `src/ui/components`.
export function componentDir(name: string): string {
	return name.replace(/(?<!^)[A-Z]/g, (ch) => `-${ch}`).toLowerCase();
}

export function rosterEntries(): Array<[Layer, string, RosterEntry]> {
	const out: Array<[Layer, string, RosterEntry]> = [];
	for (const layer of LAYERS) {
		for (const [name, entry] of Object.entries(ROSTER[layer])) {
			out.push([layer, name, entry]);
		}
	}
	return out;
}

// Every held name by the identifier `./variants` exports it as (a family's
// builder, a constant's own name), to the entry holding it.
export function heldSpellings(): Map<string, string> {
	const builders = new Map<unknown, string>(
		Object.entries(variants).map(([spelling, value]) => [value, spelling]),
	);
	const out = new Map<string, string>();
	for (const [, holder, entry] of rosterEntries()) {
		for (const held of entry.holds ?? []) {
			const family = variants.FAMILIES.find((each) => each.name === held);
			out.set((family && builders.get(family.cva)) ?? held, holder);
		}
	}
	return out;
}
