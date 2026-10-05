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

// A list row's leading: a glyph, a status's mark (its dot, or the spinner
// while `running`), or a person's avatar, one slot at the avatar's size
// whatever leads.
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

// A pick of several: the options ticked in the list, which stays open while
// the viewer picks, and the chosen ones drawn as removable chips.
export interface MultiPick<V extends string | null = string> {
	label: string;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	value: readonly NoInfer<V>[];
	onChange: (value: NoInfer<V>[]) => void;
}

// What a cell holds when it is a picked option or a typed value: the one
// the viewer chose, `picked` unset while neither is.
export type EitherValue<V extends string | null = string> =
	| { picked?: V }
	| { typed: string };

// A picked option or a typed value in one cell: the pick, whose list ends
// with the act that switches to typing, or the typed value, whose field ends
// with the act that switches back to the pick.
export interface EitherPick<V extends string | null = string> {
	label: string;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	value: EitherValue<NoInfer<V>>;
	onChange: (value: EitherValue<NoInfer<V>>) => void;
	placeholder?: string;
}

// One term of a rule: a pick, a pick of several, or a picked option or a
// typed value.
export type RuleValue<V extends string | null = string> =
	| { pick: OptionPick<V>; picks?: never; either?: never }
	| { picks: MultiPick<V>; pick?: never; either?: never }
	| { either: EitherPick<V>; pick?: never; picks?: never };

// A rule's terms, one of two rows: a pair (a source mapped to a target) or a
// condition (a field, fixed operator words, a value).
export type RuleTerms<V extends string | null = string> =
	| { from: RuleValue<V>; to: RuleValue<V>; field?: never }
	| {
			field: OptionPick<V>;
			operator: string;
			value: RuleValue<V>;
			from?: never;
	  };

// One row of a `Rules` list: its `id`, unique in the list, its terms, and
// `onRemove`, which draws the row's remove act.
export interface Rule<V extends string | null = string> {
	id: string;
	terms: RuleTerms<V>;
	onRemove?: () => void;
}

// A list row's trailing: a value that cannot change (an age, a count, a
// word), or a pick.
export type RowTrailing<V extends string | null = string> =
	| { age: string }
	| { count: number }
	| { value: string }
	| { pick: OptionPick<V> };

// A list row's entry: an input and the act that sends it, standing under the
// title in the meta line's place (a URL and its Import). `label` names the
// input and `error` is the line under it; once the act settles the row is
// given its result as `meta` or `status` in place of the entry.
export interface RowEntry {
	label: string;
	field: FieldControl<string>;
	placeholder?: string;
	act: Act;
	error?: string;
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

// The routes an app has, registered by a platform through declaration
// merging (`interface RouteRegistry { route: ... }`): native-ui registers the
// app's expo-router paths. Every route a descriptor carries reads it, and an
// unregistered route is any string.
// biome-ignore lint/suspicious/noEmptyInterface: a platform merges its route type in
export interface RouteRegistry {}
export type Route = RouteRegistry extends { route: infer R extends string }
	? R
	: string;

// A count that leads to its list: its figure drawn tabular beside its label,
// the whole a link to `href`. Shared by every molecule that carries counts (a
// `Meter`'s line under its bar, a stat strip's cell): zero is a count, drawn.
export interface CountLink {
	label: string;
	value: number;
	href: Route;
}

// The point a meter marks on its track: a tick at `value` of its max, named
// `label` to assistive tech. Once the meter's value reaches it the fill turns
// `warn`.
export interface MeterMark {
	value: number;
	label: string;
}

// A place in the shell: a route, a label, an icon, an optional count.
export interface PlaceSpec {
	route: Route;
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

// A file the viewer chose or dropped, the same on both platforms so one
// upload serves both: the web wraps its `File` (`blob` resolves to it), the
// phone the document picker's asset (`blob` reads its uri). `size` is in
// bytes and `type` a MIME type, empty when the platform knows none.
export interface PickedFile {
	name: string;
	size: number;
	type: string;
	blob: () => Promise<Blob>;
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

// What stands under a system message's line, exactly one of three: `row`,
// what the line names as one list row in a hairline card, opening its record;
// `code`, a free act's arguments in the code role under the line, its verb;
// `fold`, lines (split on newlines) the line opens in place, its chevron
// turning down.
export type MessageDetail =
	| {
			row: {
				leading?: RowLeading;
				title: string;
				meta?: Part[];
				status?: StatusMark;
				chip?: ChipMark;
				href?: Route;
				onOpen?: () => void;
			};
			code?: never;
			fold?: never;
	  }
	| { code: string; row?: never; fold?: never }
	| { fold: string; row?: never; code?: never };

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
// `check` is ticked; `status`, `age` (an ISO moment) and `change` (a value
// before and after, sorted by its after) are read only. Its
// `cell` reads its value from an item. Bare (`T` never), it is a column over
// any item, its cell taking none.
export type TableColumn<T = never> = (
	| (ColumnBase & { kind?: "text" | "source"; edit?: CellInput | CellPick })
	| (ColumnBase & { kind: "number"; edit?: CellInput })
	| (ColumnBase & { kind: "chip"; family: ChipFamily; edit?: CellPick })
	| (ColumnBase & { kind: "check"; edit?: CellCheck })
	| (ColumnBase & { kind: "status" | "age" | "change"; edit?: never })
) & { cell: (item: T) => TableCell };

export interface StatusCell {
	status: StatusState;
	label?: string;
}

// A `change` cell's value: what it was and what it is. A null `before` is a
// value added, a null `after` a value removed.
export interface ChangeCell {
	before: string | null;
	after: string | null;
}

// A cell's value, by its column's kind: a string (`text`, `source`, `chip`,
// `age`), a number, a boolean (`check`), a status or a change; null is an
// empty cell.
export type TableCell =
	| string
	| number
	| boolean
	| StatusCell
	| ChangeCell
	| null;

// What one committed edit hands back: the column's new value, null for a
// picked cell cleared by its empty choice.
export type CellValue = string | number | boolean | null;

// A table row's own slots, each read from the item: its id, unique in the
// table; `href`, its leading cell's link, so it opens in a new tab; and
// `locked`, the columns whose cells it draws read only.
export interface TableRowSlots<T> {
	id: (item: T) => string;
	href?: (item: T) => Route | undefined;
	locked?: (item: T) => readonly string[] | undefined;
}
