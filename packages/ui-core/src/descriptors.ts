// Framework-free descriptors: a composed region is data, so the owning
// molecule renders it. `TIcon` is a type parameter because the icon is a
// `lucide-solid` component on web and a `lucide-react-native` one on native,
// and ui-core depends on neither.
import type {
	ChipFamily,
	SpinnerKind,
	StatusState,
	Width,
	Words,
} from "./tokens.ts";

export type { ChipFamily, SpinnerKind, StatusState, Width, Words };

// A labelled text act, 44 px, with an optional `blocked` reason drawn under it.
// `spinner` is the busy glyph its button draws while `loading`.
export interface Act {
	label: string;
	onAct: () => void;
	blocked?: string;
	loading?: boolean;
	spinner?: SpinnerKind;
}

// An icon-only act: the label is read aloud, never drawn.
export interface IconAct<TIcon = never> {
	icon: TIcon;
	label: string;
	onAct: () => void;
}

// A model-written name: typographic quotes around it, drawn in the slot's own
// role; cut at 40 characters in a `meta` part, wrapped to two lines in a title.
export interface Quoted {
	quoted: string;
}

export type Part = string | Quoted;

// A mark on a row: an icon from the consumer's set, its label read aloud.
export interface Mark<TIcon = never> {
	icon: TIcon;
	label: string;
}

// `V` narrows the value to an enum's literals, so a `Picker` over them
// picks that enum. An option whose value is `null` is the empty choice (a
// "Not set"), and it is the only way `null` joins `V`: a pick is nullable
// because its options offer the empty choice, never by a flag.
export interface Option<V extends string | null = string> {
	value: V;
	label: string;
	description?: string;
	recommended?: boolean;
}

// Options under a group label, in a `Picker`'s list and its searchable sheet.
export interface OptionGroup<V extends string | null = string> {
	label: string;
	options: Option<V>[];
}

// What a typing control inside a bound `FormField` takes: the field's value,
// its change handler, and, when the binding autosaves, what hears each
// commit (`CommitMoment` in `./commit`: the viewer left the field or pressed
// Enter having changed it).
export interface FieldControl<V> {
	readonly value: V;
	onChange: (value: V) => void;
	onCommit?: (value: V) => void;
}

// A form field by name: its value, its change handler and its error line.
// A `FormField` given one draws the error and hands the control the rest.
export interface FieldBinding<V> extends FieldControl<V> {
	readonly error: string | undefined;
}

// A decision asked imperatively: `confirm()` opens a sheet with the title,
// the sentence and the act, and resolves to whether the act was taken.
// `destructive` draws the act as a destructive button.
export interface ConfirmAct {
	label: string;
	destructive?: boolean;
}

// The value the viewer must type before the act enables (a name the act
// removes), the field's label, and the act's `blocked` reason until then.
export interface ConfirmName {
	value: string;
	label: string;
	blocked: string;
}

export interface Confirmation {
	title: string;
	sentence: string;
	act: ConfirmAct;
	confirmName?: ConfirmName;
}

// One act of a menu: its label, an optional glyph, `destructive` for an act
// that removes or ends something, and `blocked`, the reason it cannot be
// taken, drawn under its label while the act is disabled.
export interface MenuItem<TIcon = never> {
	label: string;
	onAct: () => void;
	icon?: TIcon;
	destructive?: boolean;
	blocked?: string;
}

// A place in the shell: a route, a label, an icon, an optional count.
export interface PlaceSpec<TIcon = never> {
	route: string;
	label: string;
	icon: TIcon;
	count?: number;
}

// One line of a diff hunk; `before` and `after` are line numbers.
export interface DiffLine {
	kind: "context" | "added" | "removed";
	text: string;
	before?: number;
	after?: number;
}

export interface Hunk {
	header: string;
	lines: DiffLine[];
}

export interface ComparisonCell {
	label: string;
	value: string;
}

export interface ComparisonRow {
	label: string;
	cells: ComparisonCell[];
	chips?: Array<{ label: string }>;
}

// One bar: a label, its total, the parts it stacks by one dimension, the time
// under it.
export interface BarSeries {
	label: string;
	value: number;
	parts?: Array<{ label: string; value: number }>;
	at?: string;
}

export interface Attachment {
	id: string;
	name: string;
}

// A sentence and an act under a message input.
export interface Notice {
	sentence: string;
	act?: Act;
}

// ── Table ───────────────────────────────────────────────────────────

// A column's width: a `widths` rung, or a fraction of the table's width. A
// column with neither shares what the others leave.
export type ColumnWidth = Width | "1/4" | "1/3" | "1/2" | "2/3" | "3/4";

// How a cell edits in place: typed into the `Input` of its column's kind,
// picked from options, or ticked. A picked cell is cleared by an option
// whose value is `null`.
export interface CellInput {
	control: "input";
}

export interface CellPick {
	control: "picker";
	options: Option<string | null>[] | OptionGroup<string | null>[];
}

export interface CellCheck {
	control: "checkbox";
}

export type CellEdit = CellInput | CellPick | CellCheck;

interface ColumnBase {
	key: string;
	label: string;
	width?: ColumnWidth;
	align?: "start" | "end";
	sortable?: boolean;
}

// A column by the kind of value its cells hold, each kind with the edits
// that fit it: `text` and `source` (mono) are strings, typed or picked;
// `number` is typed; `chip` is a picked value drawn on the column's family;
// `check` is ticked; `status` and `age` (an ISO moment) are read only.
export type TableColumn =
	| (ColumnBase & { kind?: "text" | "source"; edit?: CellInput | CellPick })
	| (ColumnBase & { kind: "number"; edit?: CellInput })
	| (ColumnBase & { kind: "chip"; family: ChipFamily; edit?: CellPick })
	| (ColumnBase & { kind: "check"; edit?: CellCheck })
	| (ColumnBase & { kind: "status" | "age"; edit?: never });

export interface StatusCell {
	status: StatusState;
	label?: string;
}

// A cell's value, by its column's kind: a string (`text`, `source`, `chip`,
// `age`), a number, a boolean (`check`) or a status; null is an empty cell.
export type TableCell = string | number | boolean | StatusCell | null;

// What one committed edit hands back: the column's new value, null for a
// picked cell cleared by its empty choice.
export type CellValue = string | number | boolean | null;

export interface TableRow {
	id: string;
	cells: Record<string, TableCell>;
}
