// The rebuilt roster as data: every component both UI plugins ship, its
// layer, the prop names it takes, the cells it draws, the tokens it owns and
// the states it has, the same in both. Each plugin's verify suite reads its
// own components against this table, so a prop added on one platform alone,
// or a look prop reopened, fails by name.
import type {
	ColorName,
	RadiusRole,
	ShadowLevel,
	Size,
	SpacingRole,
	TypeRole,
	Width,
} from "./tokens.ts";

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
// single-cell constant of `./variants`), the states it has a form for, and,
// once its artboard is approved, the tokens it owns.
export interface RosterEntry {
	props: readonly string[];
	draws: readonly string[];
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
			states: ["rest"],
			owns: {
				roles: ["caption"],
				colors: ["fill-neutral", "ink-meta"],
				radii: ["full"],
				spacing: ["inside"],
				sizes: ["chip"],
			},
		},
		Status: {
			props: ["state", "label", "onOpen"],
			draws: ["STATUS", "STATUS_DOT", "STATUS_LABEL", "STATUS_OPEN"],
			states: [...PRESS],
			owns: {
				roles: ["meta"],
				colors: [
					"accent-ink",
					"ink-meta",
					"ok",
					"warn",
					"danger",
					"wash-hover",
					"wash-press",
					"ring",
				],
				radii: ["full"],
				spacing: ["inside"],
				sizes: ["dot", "target"],
			},
		},
		Chip: {
			props: ["label", "family", "onRemove"],
			draws: ["CHIP", "CHIP_LABEL", "CHIP_REMOVE_HIT"],
			states: [...PRESS],
			owns: {
				roles: ["caption"],
				colors: ["chip-", "wash-hover", "wash-press", "ring"],
				radii: ["full"],
				spacing: ["inside"],
				sizes: ["chip", "chip-label"],
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
		TextArea: {
			props: ["kind", "value", "onChange", "onCommit", "placeholder", "budget"],
			draws: [
				"TEXT_AREA",
				"TEXT_AREA_BUDGET",
				"TEXT_AREA_VALUE",
				"FIELD_VALUE",
				"FIELD_PLACEHOLDER",
			],
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
			states: ["rest"],
			owns: { radii: ["full"], sizes: ["spinner"] },
		},
		Avatar: {
			props: ["name", "src"],
			draws: ["AVATAR", "AVATAR_LABEL"],
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
			states: [...PRESS],
			owns: { colors: ["accent-ink", "ring"], sizes: ["target"] },
		},
	},
	layout: {
		// A page in the shell: on the desktop the title and the acts share the
		// strip, the act a bar-fit primary rightmost; on touch the top bar holds
		// the acts over the title and the act floats over the body's end.
		Place: {
			props: ["title", "actions", "act", "more", "bleed", "children"],
			draws: [
				"PAGE_STRIP",
				"PAGE_HEAD",
				"PAGE_TOP_BAR",
				"TEXT.role.title",
				"PAGE_BODY",
				"PAGE_BLEED",
				"FLOATING_ACT",
				"FLOATING_ACT_ROOM",
				"BUTTON.act.primary",
				"BUTTON.fit.bar",
				"BUTTON.fit.body",
				"BUTTON_LABEL.act.primary",
				"ICON_BUTTON.fit.bar",
				"ICON_BUTTON.fit.body",
			],
			states: ["rest"],
			owns: {
				roles: ["title", "body", "meta"],
				colors: [
					"ink-body",
					"ink-meta",
					"edge",
					"act-accent",
					"on-act-accent",
					"wash-hover",
					"wash-press",
					"danger",
				],
				radii: ["control"],
				spacing: ["acts", "page", "sections", "inside", "control-x", "rows"],
				sizes: ["strip", "control", "control-compact", "popover"],
			},
		},
		// A pushed page: the back act first, no act; on touch its toasts stand
		// at its foot.
		Screen: {
			props: ["title", "back", "actions", "more", "children"],
			draws: [
				"PAGE_STRIP",
				"PAGE_HEAD",
				"PAGE_TOP_BAR",
				"TEXT.role.title",
				"PAGE_BODY",
				"TOASTS",
				"ICON_BUTTON.fit.bar",
				"ICON_BUTTON.fit.body",
			],
			states: ["rest"],
			owns: {
				roles: ["title"],
				colors: ["ink-body", "ink-meta", "edge"],
				radii: ["control"],
				spacing: ["acts", "page", "sections"],
				sizes: ["strip", "control", "control-compact"],
			},
		},
		// Below `wide` the Split adds a Details act to the Place's actions that
		// opens the pane as a sheet.
		Split: {
			props: ["list", "main", "pane", "empty"],
			draws: ["SPLIT_LIST", "SPLIT_MAIN", "SPLIT_PANE", "ICON_BUTTON.fit.bar"],
			states: ["rest", "empty"],
			owns: {
				colors: ["edge", "ink-meta"],
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
				"SECTION_ACT",
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
					"header",
					"icon",
					"chip",
					"control-compact",
					"skeleton",
					"field",
				],
			},
		},
		Group: {
			props: ["loading", "children"],
			draws: [
				"GROUP",
				"SKELETON_ROW.kind.setting",
				"SKELETON_LINES",
				"SKELETON.kind.line",
				"SKELETON.kind.switch",
			],
			states: ["rest", "loading"],
			owns: {
				colors: ["edge", "surface", "skeleton"],
				radii: ["card", "chip", "full"],
				spacing: ["fields", "card", "pair"],
				sizes: ["row-setting", "skeleton", "switch-w", "switch-h"],
			},
		},
		List: {
			props: ["loading", "children"],
			draws: [
				"LIST",
				"SKELETON_ROW.kind.two-line",
				"SKELETON_LINES",
				"SKELETON.kind.line",
				"SKELETON.kind.avatar",
			],
			states: ["rest", "loading"],
			owns: {
				colors: ["skeleton"],
				radii: ["chip", "full"],
				spacing: ["rows", "inside", "control-x", "pair"],
				sizes: ["row-2", "skeleton", "avatar"],
			},
		},
		Form: {
			props: ["children"],
			draws: ["FORM", "FORM_FOOT"],
			states: ["rest", "loading"],
			owns: { colors: ["edge"], spacing: ["fields", "sections"] },
		},
		Toolbar: {
			props: ["children"],
			draws: ["TOOLBAR", "TOOLBAR_ROW", "TOOLBAR_CHIPS"],
			states: ["rest"],
			owns: { colors: ["edge"], spacing: ["pair", "inside", "acts"] },
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
				"BUTTON_LABEL",
			],
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
			props: ["children"],
			draws: ["COLUMNS", "COLUMN"],
			states: ["rest"],
			owns: { spacing: ["fields", "page"], sizes: ["column"] },
		},
		// The sidebar on the desktop, the tab bar on touch.
		Shell: {
			props: ["places", "banner", "switcher", "children"],
			draws: [
				"SHELL_SIDEBAR",
				"SHELL_COLUMN",
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
		ListRow: {
			props: [
				"leading",
				"title",
				"meta",
				"trailing",
				"marks",
				"act",
				"more",
				"href",
				"onOpen",
			],
			draws: ["ROW"],
			states: [...PRESS, "disabled", "selected"],
		},
		DefinitionRow: {
			props: [
				"label",
				"description",
				"value",
				"copyable",
				"act",
				"href",
				"onOpen",
			],
			draws: ["ROW"],
			states: [...PRESS, "disabled"],
		},
		FormField: {
			props: ["label", "description", "error", "field", "children"],
			draws: [],
			states: ["rest", "error"],
		},
		ItemHeader: {
			props: ["overline", "title", "facts", "loading"],
			draws: ["STATUS"],
			states: ["rest", "loading"],
		},
		SegmentedControl: {
			props: ["options", "value", "onChange"],
			draws: ["SEGMENT"],
			states: [...PRESS, "selected"],
		},
		Sheet: {
			props: [
				"open",
				"onClose",
				"title",
				"description",
				"back",
				"submit",
				"foot",
				"children",
			],
			draws: [],
			states: ["rest", "disabled", "loading"],
		},
		Picker: {
			props: ["label", "options", "value", "onChange"],
			draws: ["FIELD", "ROW"],
			states: [...PRESS, "selected"],
		},
		Menu: {
			props: ["label", "items"],
			draws: [],
			states: [...PRESS],
		},
		OptionList: {
			props: ["options", "value", "onChange", "loading", "children"],
			draws: ["CHECKBOX", "ROW"],
			states: [...PRESS, "loading", "selected"],
		},
		EmptyState: {
			props: ["title", "sentence", "act", "children"],
			draws: [],
			states: ["rest"],
		},
		QueryBoundary: {
			props: ["query", "sentence", "children"],
			draws: [],
			states: ["rest", "loading", "error"],
		},
		Toast: {
			props: ["sentence", "state", "act"],
			draws: ["TOAST_STATE"],
			states: ["rest"],
		},
		Banner: {
			props: ["kind", "sentence", "act"],
			draws: ["BANNER"],
			states: ["rest", "disabled"],
		},
		PendingBar: {
			props: ["sentence", "until", "act"],
			draws: [],
			states: ["rest", "disabled"],
		},
	},
	content: {
		Prose: {
			props: ["markdown", "loading"],
			draws: [],
			states: ["rest", "loading"],
		},
		Code: {
			props: ["text", "title", "tail", "copy", "loading"],
			draws: [],
			states: ["rest", "loading"],
		},
		Diff: {
			props: ["hunks", "before", "after", "loading"],
			draws: ["DIFF_LINE"],
			states: ["rest", "loading"],
		},
		Table: {
			props: [
				"columns",
				"rows",
				"selected",
				"onOpen",
				"onEdit",
				"empty",
				"loading",
			],
			draws: ["TABLE_ROW", "CHECKBOX", "CHIP"],
			states: [...PRESS, "loading", "selected", "empty"],
		},
		FileRow: {
			props: ["path", "added", "removed", "seen", "href", "onOpen", "loading"],
			draws: ["ROW"],
			states: [...PRESS, "loading"],
		},
		ProseDiff: {
			props: ["before", "after", "loading"],
			draws: [],
			states: ["rest", "loading"],
		},
		Comparison: {
			props: ["rows", "loading"],
			draws: ["ROW"],
			states: ["rest", "loading"],
		},
		Message: {
			props: ["author", "name", "body", "at", "onOpen", "loading"],
			draws: ["MESSAGE"],
			states: [...PRESS, "loading"],
		},
		MessageInput: {
			props: [
				"value",
				"onChange",
				"attachments",
				"onAttach",
				"placeholder",
				"notice",
				"working",
				"onSend",
				"onStop",
			],
			draws: ["FIELD"],
			states: ["rest", "hover", "focus", "disabled", "loading"],
		},
		Meter: {
			props: ["label", "value", "max", "meta", "loading"],
			draws: [],
			states: ["rest", "loading"],
		},
		BarChart: {
			props: ["series", "unit", "loading"],
			draws: [],
			states: ["rest", "loading"],
		},
		QrCode: {
			props: ["value", "loading"],
			draws: [],
			states: ["rest", "loading"],
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
