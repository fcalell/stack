// The rebuilt roster as data: every component both UI plugins ship, its
// layer, and the prop names it takes, the same in both. Each plugin's verify
// suite reads its own components against this table, so a prop added on one
// platform alone, or a look prop reopened, fails by name.

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

export const ROSTER: Record<Layer, Record<string, readonly string[]>> = {
	atom: {
		Text: ["role", "children"],
		Icon: ["name"],
		Button: ["act", "label", "onAct", "loading", "spinner", "blocked"],
		IconButton: ["icon", "label", "onAct"],
		Count: ["value"],
		Status: ["state", "label", "onOpen"],
		Chip: ["label", "family"],
		Input: [
			"kind",
			"value",
			"onChange",
			"onCommit",
			"placeholder",
			"unit",
			"act",
		],
		TextArea: [
			"kind",
			"value",
			"onChange",
			"onCommit",
			"placeholder",
			"budget",
		],
		InputOtp: ["length", "value", "onChange", "onComplete", "loading"],
		EnumInput: ["value", "onChange", "placeholder"],
		Slider: ["label", "value", "onChange", "min", "max", "step", "unit"],
		Switch: ["checked", "onChange", "label"],
		Checkbox: ["checked", "onChange", "label"],
		Spinner: ["kind"],
		Avatar: ["name", "src"],
		Link: ["href", "children"],
	},
	layout: {
		Place: ["title", "actions", "act", "more", "bleed", "children"],
		Screen: ["title", "back", "actions", "more", "children"],
		Split: ["list", "main", "pane", "empty"],
		Section: [
			"title",
			"count",
			"description",
			"folded",
			"onToggle",
			"act",
			"loading",
			"children",
		],
		Group: ["loading", "children"],
		List: ["loading", "children"],
		Form: ["onSubmit", "children"],
		Toolbar: ["children"],
		ActionBar: ["children"],
		Columns: ["children"],
		Shell: ["places", "banner", "switcher", "children"],
	},
	shared: {
		ListRow: [
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
		DefinitionRow: [
			"label",
			"description",
			"value",
			"copyable",
			"act",
			"href",
			"onOpen",
		],
		FormField: ["label", "description", "error", "field", "children"],
		ItemHeader: ["overline", "title", "facts", "loading"],
		SegmentedControl: ["options", "value", "onChange"],
		Sheet: [
			"open",
			"onClose",
			"title",
			"description",
			"back",
			"submit",
			"foot",
			"children",
		],
		Picker: ["label", "options", "value", "onChange"],
		Menu: ["label", "items"],
		OptionList: ["options", "value", "onChange", "children"],
		EmptyState: ["title", "sentence", "act", "children"],
		QueryBoundary: ["query", "sentence", "children"],
		Toast: ["sentence", "state", "act"],
		Banner: ["kind", "sentence", "act"],
		PendingBar: ["sentence", "until", "spinner", "act"],
	},
	content: {
		Prose: ["markdown", "loading"],
		Code: ["text", "title", "tail", "copy", "loading"],
		Diff: ["hunks", "before", "after", "loading"],
		Table: [
			"columns",
			"rows",
			"selected",
			"onOpen",
			"onEdit",
			"empty",
			"loading",
		],
		FileRow: ["path", "added", "removed", "seen", "href", "onOpen", "loading"],
		ProseDiff: ["before", "after", "loading"],
		Comparison: ["rows", "loading"],
		Message: ["author", "name", "body", "at", "onOpen", "loading"],
		MessageInput: [
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
		Meter: ["label", "value", "max", "meta", "loading"],
		BarChart: ["series", "unit", "loading"],
		QrCode: ["value", "loading"],
	},
};

// `ListRow` → `list-row`: the component directory under `src/ui/components`.
export function componentDir(name: string): string {
	return name.replace(/(?<!^)[A-Z]/g, (ch) => `-${ch}`).toLowerCase();
}

export function rosterEntries(): Array<[Layer, string, readonly string[]]> {
	const out: Array<[Layer, string, readonly string[]]> = [];
	for (const layer of LAYERS) {
		for (const [name, props] of Object.entries(ROSTER[layer])) {
			out.push([layer, name, props]);
		}
	}
	return out;
}
