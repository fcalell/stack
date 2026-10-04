// Framework-free descriptors: a composed region is data, so the owning
// molecule renders it.
import type { icons } from "lucide";
import type { ChipFamily, StatusState, Width, Words } from "./tokens.ts";

export type { ChipFamily, StatusState, Width, Words };

// A glyph of the one icon set, Lucide, by its PascalCase name (`Check`,
// `ChevronDown`), the key both `lucide-react` and `lucide-react-native`
// export it under. Lucide's own aliases are names too.
export type IconName = keyof typeof icons;

// A labelled text act, 44 px, with an optional `blocked` reason drawn under
// it. `destructive` marks an act that removes or ends something: an
// `ActionBar` draws it as `danger` when it is the bar's filled act and as
// `destructive` (the hairline form) otherwise. A promise its `onAct`
// returns keeps the bar's filled act pending until it settles.
export interface Act {
	label: string;
	onAct: () => unknown;
	blocked?: string;
	loading?: boolean;
	destructive?: boolean;
}

// An icon-only act: the label is read aloud, never drawn.
export interface IconAct {
	icon: IconName;
	label: string;
	onAct: () => void;
}

// A model-written name: typographic quotes around it, drawn in the slot's own
// role; cut at 40 characters in a `meta` part, wrapped to two lines in a title.
export interface Quoted {
	quoted: string;
}

export type Part = string | Quoted;

// A row's marks: a status (its dot beside its word) and a data value's chip
// on its family, each with its label; a row holds at most one of each.
export interface StatusMark {
	state: StatusState;
	label: string;
}

export interface ChipMark {
	family: ChipFamily;
	label: string;
}

// `V` narrows the value to an enum's literals, so a `Picker` over them
// picks that enum. An option whose value is `null` is the empty choice (a
// "Not set"), and it is the only way `null` joins `V`: a pick is nullable
// because its options offer the empty choice, never by a flag.
// An option carrying `status` is a work state: a pick over such options is
// a status that moves, its options and its value drawn as the status (its
// dot beside `label`).
// An option carrying `avatar` stands for a person or a workspace: its avatar,
// drawn from the label's initials or `src`, leads it.
// An option carrying `icon` leads with its glyph (a sort's direction), in
// the trigger too. An option takes one leading form.
export interface Option<V extends string | null = string> {
	value: V;
	label: string;
	description?: string;
	recommended?: boolean;
	status?: StatusState;
	avatar?: { src?: string };
	icon?: IconName;
}

// Options under a group label, in a `Picker`'s list and its searchable sheet.
export interface OptionGroup<V extends string | null = string> {
	label: string;
	options: Option<V>[];
}

// A list row's leading: a glyph, a status's dot, or a person's avatar, one
// slot at the avatar's size whatever leads.
export type RowLeading =
	| {
			icon: IconName;
	  }
	| { status: StatusState }
	| { avatar: { name: string; src?: string } };

// A pick that applies at once where a value stands (a row's trailing, a
// record's status fact), drawn as a `Picker` at the row fit.
export interface OptionPick<V extends string | null = string> {
	label: string;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	value?: NoInfer<V>;
	onChange: (value: NoInfer<V>) => void;
}

// A list row's trailing: a value that cannot change (an age, a count, a
// word), or a pick.
export type RowTrailing<V extends string | null = string> =
	| { age: string }
	| { count: number }
	| { value: string }
	| { pick: OptionPick<V> };

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
// the sentence and the act, and returns nothing. The act runs the work: while
// the promise its `onAct` returns pends, the act is pending and the sheet's
// other acts are inert; the sheet closes when it resolves and stays open,
// the act ready again, when it rejects. Dismissing the sheet runs nothing.
// `destructive` draws the act as a destructive button.
export interface ConfirmAct {
	label: string;
	onAct: () => Promise<unknown>;
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
export interface MenuItem {
	label: string;
	onAct: () => void;
	icon?: IconName;
	destructive?: boolean;
	blocked?: string;
}

// What the shell's switcher switches between (a workspace, an account): a
// pick whose options carry their avatars, the current one on the trigger and
// ticked in the list, and `act`, the act that makes a new one, under a
// hairline after the options.
export interface Switcher extends OptionPick {
	act?: IconAct;
}

// A place in the shell: a route, a label, an icon, an optional count.
export interface PlaceSpec {
	route: string;
	label: string;
	icon: IconName;
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

// One bar: a label, its total, its parts' values by the chart's key names (a
// key it lacks is 0), the time under it.
export interface BarSeries {
	label: string;
	value: number;
	parts?: Readonly<Record<string, number>>;
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

// A row with `href` is its leading cell's link, so it opens in a new tab;
// `locked` names the columns whose cells this row draws read only.
export interface TableRow {
	id: string;
	href?: string;
	cells: Record<string, TableCell>;
	locked?: readonly string[];
}
