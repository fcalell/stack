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
		Button: ["act", "label", "onAct", "loading", "blocked"],
		IconButton: ["icon", "label", "onAct"],
		Count: ["value"],
		Status: ["state", "label", "onOpen"],
		Input: ["kind", "value", "onChange", "placeholder", "act"],
		TextArea: ["kind", "value", "onChange", "placeholder", "budget"],
		Slider: ["label", "value", "onChange", "min", "max", "step"],
		Switch: ["checked", "onChange", "label"],
		Checkbox: ["checked", "onChange", "label"],
		Spinner: [],
		Avatar: ["name", "src"],
		Link: ["href", "children"],
	},
	layout: {
		Place: ["title", "actions", "act", "more", "children"],
		Screen: ["title", "back", "actions", "more", "children"],
		Split: ["list", "main", "pane"],
		Section: [
			"title",
			"count",
			"description",
			"folded",
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
		Shell: ["places", "banner", "children"],
	},
	shared: {
		ListRow: [
			"leading",
			"title",
			"meta",
			"trailing",
			"marks",
			"act",
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
		FormField: ["label", "description", "error", "children"],
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
		OptionList: ["options", "value", "onChange", "children"],
		EmptyState: ["title", "sentence", "act", "children"],
		Toast: ["sentence", "act"],
		Banner: ["kind", "sentence", "act"],
		PendingBar: ["sentence", "until", "act"],
	},
	content: {
		Prose: ["markdown", "loading"],
		Code: ["text", "tail", "copy", "loading"],
		Diff: ["hunks", "layout", "loading"],
		FileRow: ["path", "added", "removed", "seen", "href", "onOpen", "loading"],
		ProseDiff: ["before", "after", "loading"],
		Comparison: ["rows", "loading"],
		Message: ["author", "name", "body", "at", "loading"],
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
