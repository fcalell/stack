// The rebuilt roster as data: every component both UI plugins ship, its
// layer, the prop names it takes, the families it draws and the states it
// has, the same in both. Each plugin's verify suite reads its own components
// against this table, so a prop added on one platform alone, or a look prop
// reopened, fails by name.

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

// A component's prop names, the matrix families it draws (each a `FAMILIES`
// name in `./variants`), and the states it has a form for.
export interface RosterEntry {
	props: readonly string[];
	draws: readonly string[];
	states: readonly State[];
}

// A pressable control's four.
const PRESS = ["rest", "hover", "focus", "active"] as const;

export const ROSTER: Record<Layer, Record<string, RosterEntry>> = {
	atom: {
		Text: {
			props: ["role", "children"],
			draws: ["TEXT", "TEXT_STRONG"],
			states: ["rest"],
		},
		Icon: {
			props: ["name"],
			draws: [],
			states: ["rest"],
		},
		Button: {
			props: ["act", "label", "onAct", "loading", "spinner", "blocked"],
			draws: ["BUTTON", "BUTTON_LABEL"],
			states: [...PRESS, "disabled", "loading"],
		},
		IconButton: {
			props: ["icon", "label", "onAct"],
			draws: [],
			states: [...PRESS],
		},
		Count: {
			props: ["value"],
			draws: [],
			states: ["rest"],
		},
		Status: {
			props: ["state", "label", "onOpen"],
			draws: ["STATUS"],
			states: [...PRESS],
		},
		Chip: {
			props: ["label", "family"],
			draws: ["CHIP"],
			states: ["rest"],
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
			draws: ["FIELD"],
			states: ["rest", "hover", "focus", "error"],
		},
		TextArea: {
			props: ["kind", "value", "onChange", "onCommit", "placeholder", "budget"],
			draws: ["FIELD"],
			states: ["rest", "hover", "focus", "error"],
		},
		InputOtp: {
			props: ["length", "value", "onChange", "onComplete", "loading"],
			draws: ["OTP_BOX", "PLACE"],
			states: ["rest", "focus", "loading", "error"],
		},
		EnumInput: {
			props: ["value", "onChange", "placeholder"],
			draws: ["FIELD"],
			states: ["rest", "hover", "focus", "error"],
		},
		Slider: {
			props: ["label", "value", "onChange", "min", "max", "step", "unit"],
			draws: [],
			states: [...PRESS],
		},
		Switch: {
			props: ["checked", "onChange", "label"],
			draws: ["SWITCH"],
			states: [...PRESS, "selected"],
		},
		Checkbox: {
			props: ["checked", "onChange", "label"],
			draws: ["CHECKBOX"],
			states: [...PRESS, "selected"],
		},
		Spinner: {
			props: ["kind"],
			draws: [],
			states: ["rest"],
		},
		Avatar: {
			props: ["name", "src"],
			draws: ["AVATAR"],
			states: ["rest"],
		},
		Link: {
			props: ["href", "children"],
			draws: [],
			states: [...PRESS],
		},
	},
	layout: {
		Place: {
			props: ["title", "actions", "act", "more", "bleed", "children"],
			draws: [],
			states: ["rest"],
		},
		Screen: {
			props: ["title", "back", "actions", "more", "children"],
			draws: [],
			states: ["rest"],
		},
		Split: {
			props: ["list", "main", "pane", "empty"],
			draws: [],
			states: ["rest", "empty"],
		},
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
			draws: [],
			states: [...PRESS, "disabled", "loading"],
		},
		Group: {
			props: ["loading", "children"],
			draws: [],
			states: ["rest", "loading"],
		},
		List: {
			props: ["loading", "children"],
			draws: [],
			states: ["rest", "loading"],
		},
		Form: {
			props: ["onSubmit", "children"],
			draws: ["RHYTHM"],
			states: ["rest"],
		},
		Toolbar: {
			props: ["children"],
			draws: ["RHYTHM"],
			states: ["rest"],
		},
		ActionBar: {
			props: ["children"],
			draws: ["RHYTHM"],
			states: ["rest"],
		},
		Columns: {
			props: ["children"],
			draws: ["RHYTHM"],
			states: ["rest"],
		},
		Shell: {
			props: ["places", "banner", "switcher", "children"],
			draws: ["PLACE"],
			states: [...PRESS, "selected"],
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
			props: ["sentence", "until", "spinner", "act"],
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
			draws: ["TABLE_ROW", "CHECKBOX", "CHIP", "PLACE"],
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
