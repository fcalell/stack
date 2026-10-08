// Framework-free descriptors: a composed region is data, so the owning
// molecule renders it.
import type { icons } from "lucide";
import type {
	ChipFamily,
	Measure,
	StatusState,
	Width,
	Words,
} from "./tokens.ts";

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
	// The act's visible text (a short phrase; truncates).
	label: string;
	onAct: () => unknown;
	// Why the act cannot run (a sentence; wraps).
	blocked?: string;
	loading?: boolean;
	destructive?: boolean;
	// A quiet act: words in the meta ink with no hairline (a resend). An
	// `ActionBar` draws it so unless it is the bar's filled act.
	quiet?: boolean;
}

// An act that goes to a route: a link on the web and a press that navigates on
// the phone. A `Missing`'s way back is one; it is no create act.
export interface LinkAct {
	// The link's visible text (a short phrase; truncates).
	label: string;
	href: Route;
}

// An icon-only act: the label is its accessible name, never drawn. `loading`
// is an `Act`'s: the act is running, inert, its glyph swapped for the spinner.
export interface IconAct {
	icon: IconName;
	// The act's accessible name (a short phrase; read aloud, never drawn).
	label: string;
	onAct: () => void;
	loading?: boolean;
}

// A model-written name: typographic quotes around it, drawn in the slot's own
// role; cut at 40 characters in a `meta` part, wrapped whole in a title (in a
// row with a second line).
export interface Quoted {
	// The model-written name (a short phrase; cut at 40 characters in a `meta` part, wraps whole in a title with a second line).
	quoted: string;
}

export type Part = string | Quoted;

// A span of code (a flag, a path, an identifier), drawn in the inline code
// style the way `Prose` draws a backtick span. As a row's whole title or a
// whole `meta` part it is one value that cuts in its middle, keeping its
// start and its end (`valueCut`); a run inside a sentence never does.
export interface Coded {
	code: string;
}

// A `meta` part of a row: a `Part` or a span of code.
export type RowPart = Part | Coded;

// A row's title: a `Part`, one span of code, or runs of plain words and code
// that truncate at their end as one title.
export type RowTitle = RowPart | readonly (string | Coded)[];

// A row's marks: a status (its dot beside its word) and a data value's chip
// on its family, each with its label; a row holds at most one of each.
export interface StatusMark {
	state: StatusState;
	// The state's word (a word; truncates when its line is out of room).
	label: string;
}

export interface ChipMark {
	family: ChipFamily;
	// The value (a word; truncates past the short measure, 18 characters).
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
// An option carrying `chip` draws it after its label, in the list and on the
// trigger: the option's kind (a context's Draft, Ready), where `status` is a
// work state that moves.
export interface Option<V extends string | null = string> {
	value: V;
	// The option's text (a short phrase; truncates; a row pick's pill holds a word, truncating past the short measure, 18 characters).
	label: string;
	// Under the label (a short phrase; truncates).
	description?: string;
	recommended?: boolean;
	status?: StatusState;
	avatar?: { src?: string };
	icon?: IconName;
	chip?: ChipMark;
}

// Options under a group label, in a `Picker`'s list and its searchable sheet.
export interface OptionGroup<V extends string | null = string> {
	// The group's heading (a short phrase; truncates).
	label: string;
	options: Option<V>[];
}

// A list row's leading: a glyph, a status's mark (its dot, or the spinner
// while `running`), a person's avatar, or a tick that chooses the row (drawn
// disabled when `blocked`, the reason the row cannot be ticked, which the row
// carries on its meta line), one slot at the avatar's size whatever leads.
export type RowLeading =
	| {
			icon: IconName;
	  }
	| { status: StatusState }
	// The avatar's `name` is a short phrase: read aloud, only its initials draw.
	| { avatar: { name: string; src?: string } }
	| {
			check: {
				checked: boolean;
				onChange: (checked: boolean) => void;
				// Why the row cannot be ticked (a short phrase; it leads the meta
				// line, which truncates).
				blocked?: string;
			};
	  };

// A pick that applies at once where a value stands (a row's trailing, a
// record's status fact), drawn as a `Picker` at the row fit.
export interface OptionPick<V extends string | null = string> {
	// What is picked, the trigger's name (a short phrase; read aloud, never drawn on the trigger).
	label: string;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	value?: NoInfer<V>;
	onChange: (value: NoInfer<V>) => void;
}

// A pick of several: the options ticked in the list, which stays open while
// the viewer picks, and the chosen ones drawn as removable chips.
export interface MultiPick<V extends string | null = string> {
	// What is picked, the trigger's name (a short phrase; read aloud, never drawn on the trigger).
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
	// What is picked, the trigger's name (a short phrase; read aloud, never drawn on the trigger).
	label: string;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	value: EitherValue<NoInfer<V>>;
	onChange: (value: EitherValue<NoInfer<V>>) => void;
	// The hint drawn while the typed value is empty (a short phrase; truncates).
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
			// The fixed words between the field and the value (a word; wraps).
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
// word), or a pick. An `age` is an ISO moment: the row words it short ("2 min")
// and keeps it current from the shared clock. Its `beside` is a short value (a
// spend, "$0.12") drawn after the age, whole or gone with it; a row that waits
// draws the same bar for it, since the loaded width is not derivable.
export type RowTrailing<V extends string | null = string> =
	| { age: string; beside?: string }
	| { count: number }
	// A word: whole or gone on the web (the row leaves it once the title would hold under half its line), kept whole on the phone.
	| { value: string }
	| { pick: OptionPick<V> };

// A list row's entry: an input and the act that sends it, standing under the
// title in the meta line's place (a URL and its Import). `label` names the
// input and `error` is the line under it; once the act settles the row is
// given its result as `meta` or `status` in place of the entry.
export interface RowEntry {
	// The input's accessible name (a short phrase; read aloud, never drawn).
	label: string;
	field: FieldControl<string>;
	// The hint drawn while the input is empty (a short phrase; truncates).
	placeholder?: string;
	act: Act;
	// The line under the input (a sentence; wraps).
	error?: string;
}

// A `FormField` whose question is answered: it folds to one summary row with
// `answer` and an Edit act that `onEdit` hears; clearing it reopens the field.
export interface Answered {
	// The answer in the summary row (a short phrase; truncates).
	answer: string;
	onEdit: () => void;
}

// A fact outside the context that can edit it: why it cannot change here, a
// request that holds it ("Held by CR-12, Ana"). With `href` the whole
// reason is a link to what holds it.
export interface Lock {
	// Why the fact cannot change here (a sentence; wraps).
	reason: string;
	href?: Route;
}

// What a definition shows as data: words or a status. Each platform's
// `DefinitionValue` adds its own node (a control that changes the fact in
// place); ui-core holds no node type.
// A string is a word or a short phrase: it truncates at its end, an
// identifier of one word over eight characters cuts in its middle.
export type DefinitionData = string | { status: StatusState; label?: string };

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
	// The line that takes the description's place (a sentence; wraps).
	readonly error: string | undefined;
}

// A decision asked imperatively: `confirm()` opens a sheet with the title,
// the sentence and the act, and returns nothing. The act runs the work: while
// the promise its `onAct` returns pends, the act is pending and the sheet's
// other acts are inert; the sheet closes when it resolves and stays open,
// the act ready again, when it rejects. Dismissing the sheet runs nothing.
// `destructive` draws the act as a destructive button.
export interface ConfirmAct {
	// The act's visible text (a short phrase; truncates).
	label: string;
	onAct: () => Promise<unknown>;
	destructive?: boolean;
}

// The value the viewer must type before the act enables (a name the act
// removes), the field's label, and the act's `blocked` reason until then.
export interface ConfirmName {
	// The name to type, compared with the typed text and never drawn (text).
	value: string;
	// The field's label (a short phrase; wraps).
	label: string;
	// Why the act is blocked until then (a sentence; wraps).
	blocked: string;
}

// `cancel` is the way out's label, the `cancel` word unless given: the
// decision's own words for leaving it ("Keep editing", "Stay"). The way out
// runs nothing; Escape, the scrim and the sheet's close dismiss alike.
export interface Confirmation {
	// The sheet's heading (a short phrase; wraps).
	title: string;
	// What the decision asks (a sentence; wraps).
	sentence: string;
	act: ConfirmAct;
	// The way out's text (a short phrase; truncates).
	cancel?: string;
	confirmName?: ConfirmName;
}

// One act of a menu: its label, an optional glyph, `destructive` for an act
// that removes or ends something, and `blocked`, the reason it cannot be
// taken, drawn under its label while the act is disabled.
export interface MenuItem {
	// The act's text (a short phrase; truncates).
	label: string;
	onAct: () => void;
	icon?: IconName;
	destructive?: boolean;
	// Why the act cannot be taken (a sentence; wraps).
	blocked?: string;
}

// What the shell's switcher switches between (a workspace, an account), or the
// context a `Place` stands in beside its title (a change set, a version): a
// pick whose options carry their avatars or chips, the current one on the
// trigger and ticked in the list, and `act`, the act that makes a new one,
// under a hairline after the options.
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
	// What is counted (a word; wraps).
	label: string;
	value: number;
	href: Route;
}

// A count in a strip: a label over its figure (zero is a count, drawn), an
// optional unit beside the figure and meta line under it, then either the
// whole cell a link to `href` or sub-counts that are links of their own, never
// both, since a cell inside a link cannot hold links.
export type StatSpec = {
	// What the figure counts (a short phrase; wraps).
	label: string;
	value: number;
	// What the figure counts, beside it (a word; wraps).
	unit?: string;
	// Under the figure (a sentence; wraps).
	meta?: string;
} & (
	| { counts?: readonly CountLink[]; href?: never }
	| { href: Route; counts?: never }
);

// The point a meter marks on its track: a tick at `value` of its max. Once the
// meter's value reaches it the fill turns `warn`.
export interface MeterMark {
	value: number;
}

// Where a flow stands at one of its steps: done, the current one, or still to
// come. A step count's segments and a rail's stages both read it.
export type StepState = "done" | "current" | "later";

// One stage of a rail of fixed states: its label and where the rail stands at
// it. A done or current stage may carry the moment it was reached or began
// (`at`, an ISO moment); a later one has none to give.
// The `label` is a short phrase: it wraps.
export type Stage =
	| { label: string; state: Exclude<StepState, "later">; at?: string }
	| { label: string; state: "later"; at?: never };

// How a rail ended short of its last stage: the terminal row that stands in
// place of every stage after the last done one, its reason under its label.
export interface StageEnd {
	// The terminal row's text (a short phrase; wraps).
	label: string;
	// Why the rail ended (a sentence; wraps).
	reason: string;
}

// A meta line as data: runs of plain words, a part at strong weight (the
// address a sentence names) a `{ strong }` run, the way a nested `Text strong`
// draws, and a span of code a `{ code }` run. Its runs together are a
// sentence: it wraps.
export type Sentence = readonly (string | { strong: string } | Coded)[];

// The product's mark a `Gate` leads with: its `name`, which draws in the place
// of the image at `src` while that fails or `src` is absent.
export interface GateMark {
	// The product's name (a short phrase; wraps).
	name: string;
	src?: string;
}

// A place in the shell: a route, a label, an icon, an optional count.
export interface PlaceSpec {
	route: Route;
	// The place's name (a word; truncates).
	label: string;
	icon: IconName;
	count?: number;
}

// One line of a diff hunk; `before` and `after` are line numbers.
export interface DiffLine {
	kind: "context" | "added" | "removed";
	// The line's code (text; wraps under itself).
	text: string;
	before?: number;
	after?: number;
}

export interface Hunk {
	// The hunk's header (text; wraps), in git's form: `@@ -1,3 +1,4 @@`.
	header: string;
	lines: DiffLine[];
}

// A file the viewer chose or dropped, the same on both platforms so one
// upload serves both: the web wraps its `File` (`blob` resolves to it), the
// phone the document picker's asset (`blob` reads its uri). `size` is in
// bytes and `type` a MIME type, empty when the platform knows none. `src` is
// a local address the file can be drawn from before it is uploaded (an
// `Attachment`'s thumbnail): the phone's asset uri, set on every file and
// needing no revoke, and on the web an object URL that `MessageInput`'s attach
// path makes for an image alone, which the consumer revokes
// (`URL.revokeObjectURL`) when it detaches the attachment.
export interface PickedFile {
	name: string;
	size: number;
	type: string;
	blob: () => Promise<Blob>;
	src?: string;
}

// A file that goes with a message: a chip of its name, or, with `src` (an
// image's address), a thumbnail that opens full size.
export interface Attachment {
	id: string;
	// The file's name: the chip's label (a word; truncates past the short
	// measure, 18 characters), or a thumbnail's accessible name.
	name: string;
	src?: string;
}

// A sentence and an act under a message input.
export interface Notice {
	// What it says (a sentence; wraps).
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
				title: Part;
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

// A column's width: the short measure of a label, the measure of running
// text, or a fraction of the table's width. A column with none shares what the
// others leave.
export type ColumnWidth =
	| Measure
	| "measure"
	| "1/4"
	| "1/3"
	| "1/2"
	| "2/3"
	| "3/4";

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
	// The column's head (a short phrase; truncates).
	label: string;
	width?: ColumnWidth;
	align?: "start" | "end";
	sortable?: boolean;
	// The column is read only in this table: its cells never edit (its `edit` is
	// ignored) and its head draws a lock glyph.
	locked?: boolean;
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
	// The word, when the state's own word does not say it (a word; truncates
	// when its line is out of room).
	label?: string;
}

// A `change` cell's value: what it was and what it is. A null `before` is a
// value added, a null `after` a value removed.
export interface ChangeCell {
	// Each value is a short phrase; it truncates.
	before: string | null;
	after: string | null;
}

// A cell's value, by its column's kind: a string (`text`, `source`, `chip`,
// `age`), a number, a boolean (`check`), a status or a change; null is an
// empty cell.
// A string cell is a short phrase: it truncates (a `chip` cell a word,
// truncating past the short measure, 18 characters).
export type TableCell =
	| string
	| number
	| boolean
	| StatusCell
	| ChangeCell
	| null;

// A selection bar's count of the rows a list chooses: `count` of `of` (the rows
// that can be chosen). `onAll` adds the acts beside the count: one that clears
// the rows while any are chosen (it hears `false`) and one that chooses every
// row while some stand unchosen (`true`). The choose-all act draws wherever the
// table shows no head tick (below `tablet` of the page on the web, always on
// the phone), since the head tick is the select-all where it stands.
export interface ChosenCount {
	count: number;
	of: number;
	onAll?: (all: boolean) => void;
}

// The rows a table chooses, controlled: `chosen` the ids ticked and
// `onChange` hearing the set the viewer's tick or the head tick makes, which
// the consumer applies its rule to and hands back through `chosen`. `blocked`
// names why a row cannot be ticked, `moved` why a rule moved its tick; each
// reason stands under the row's leading cell.
export interface TableChoice<T> {
	chosen: readonly string[];
	onChange: (ids: string[]) => void;
	// Each reason is a short phrase; it truncates under the leading cell.
	blocked?: (item: T) => string | undefined;
	moved?: (item: T) => string | undefined;
}

// What one committed edit hands back: the column's new value, null for a
// picked cell cleared by its empty choice.
export type CellValue = string | number | boolean | null;

// Where a record, a row or a field stands in a change set: added, changed,
// removed, `unchanged` (so a marked set lines up) or `stale` (the change set
// no longer matches what it was made against). One mark draws it on every
// part that carries a `change`.
export type ChangeKind =
	| "added"
	| "changed"
	| "removed"
	| "unchanged"
	| "stale";

// A table row's own slots, each read from the item: its id, unique in the
// table; `href`, its leading cell's link, so it opens in a new tab; `locked`,
// the columns whose cells it draws read only; `warning`, what is wrong with
// the row, drawn after its leading cell's name (a warn glyph and the
// sentence; the phone's row carries it as a `ListRow` warning); and `change`,
// where the row stands in a change set, its mark ahead of the leading cell's
// name (the phone's row carries it as a `ListRow` change).
export interface TableRowSlots<T> {
	id: (item: T) => string;
	href?: (item: T) => Route | undefined;
	locked?: (item: T) => readonly string[] | undefined;
	// The warning's label (a short phrase; truncates).
	warning?: (item: T) => string | undefined;
	change?: (item: T) => ChangeKind | undefined;
}

// A point on the canvas, in its own coordinates.
export interface CanvasPoint {
	x: number;
	y: number;
}

// One node: its glyph, its words and the one figure in its trailing slot,
// `number` (a place in a sequence) over `count`. A `problem` is drawn in
// place of `line`; an `off` node is drawn quiet. Without a `position` the
// canvas places it.
export interface CanvasNode {
	id: string;
	icon: IconName;
	// Over the title (a short phrase; truncates).
	overline?: string;
	// The node's name (a short phrase; truncates).
	title: string;
	// Under the title (a short phrase; truncates).
	line?: string;
	number?: number;
	count?: number;
	status?: StatusMark;
	// What is wrong with the node, in `line`'s place (a short phrase; truncates).
	problem?: string;
	off?: boolean;
	position?: CanvasPoint;
}

// An edge from one node's id to another's, its `label` drawn on it; a
// `handoff` edge carries its glyph beside the label.
export interface CanvasEdge {
	id: string;
	from: string;
	to: string;
	// Drawn on the edge in a chip (a word; truncates past the short measure, 18 characters).
	label?: string;
	handoff?: boolean;
}

// A frame round the nodes and groups it `holds`, by id; a group may hold a
// group.
export interface CanvasGroup {
	id: string;
	// The frame's heading (a short phrase; truncates).
	head: string;
	holds: readonly string[];
}

// A run or scenario's taken path, by id; everything else dims. `at` is the
// node the run stands at.
export interface CanvasPath {
	nodes: readonly string[];
	edges: readonly string[];
	at?: string;
}
