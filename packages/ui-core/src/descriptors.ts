// Framework-free descriptors: a composed region is data, so the owning
// molecule renders it.
import type { icons } from "lucide";
import type { ChipFamily, Measure, Tone, Width, Words } from "./tokens.ts";

export type { ChipFamily, Tone, Width, Words };

// A glyph of the one icon set, Lucide, by its PascalCase name (`Check`,
// `ChevronDown`), the key both `lucide-react` and `lucide-react-native`
// export it under. Lucide's own aliases are names too.
export type IconName = keyof typeof icons;

// What every act is: the run it starts. A thenable `onAct` returns holds the
// act pending until it settles; a rejection draws the server's refusal when it
// words one, else the generic `actFailed`.
export interface ActBase {
	onAct: () => unknown;
}

// A labelled text act, 44 px, with an optional `blocked` reason drawn under
// it. `destructive` marks an act that removes or ends something: an
// `ActionBar` draws it as `danger` when it is the bar's filled act and as
// `destructive` (the hairline form) otherwise. A promise its `onAct`
// returns keeps the bar's filled act pending until it settles.
export interface Act extends ActBase {
	// The act's visible text (a short phrase; truncates); the accessible name where only the `icon` draws.
	label: string;
	// The glyph a slot draws with the label, or alone where it is icon-only.
	icon?: IconName;
	// Why the act cannot run (a sentence; wraps).
	blocked?: string;
	destructive?: boolean;
	// A quiet act: words in the meta ink with no hairline (a resend). An
	// `ActionBar` draws it so unless it is the bar's filled act.
	quiet?: boolean;
	// Asked before `onAct` runs, as a decision over the page (the act's own
	// label and `destructive` on the decision's act); declined, nothing runs.
	confirm?: Decision;
	// A sentence toasted once `onAct` resolves. A rejection toasts the
	// error's sentence as a failed toast, as without it.
	done?: string;
	// An href the router goes to once `onAct` resolves, after its `done` is
	// toasted: the route a LinkAct would go to.
	to?: string;
}

// An act that goes to a route: a link on the web, an anchor to `href` that the
// router follows in place, and a press that navigates on the phone. Wherever a
// host takes an `Act` for a labelled act (a Section's, a Banner's, a row's, a
// toast's, a pending bar's, a canvas's, an empty state's) it takes a `LinkAct`
// too, and a menu takes one as an entry. A `Pane`'s missing form's way back is one; it is
// no create act. It has no run, so it never pends.
export interface LinkAct {
	// The link's visible text (a short phrase; truncates).
	label: string;
	icon?: IconName;
	href: Route;
	// Why the link cannot be followed (a sentence; wraps): it draws inert, with this reason, as a blocked act does.
	blocked?: string;
}

// An act of a slot that requires its glyph.
export type IconAct = Act & { icon: IconName };

// A link of a slot that requires its glyph.
export type IconLinkAct = LinkAct & { icon: IconName };

// A run of text: plain words, a model-written name (`quoted`: typographic
// quotes in the slot's own role, cut at 40 characters in a `meta`, wrapped
// whole in a title with a second line), a span of code (`code`: the inline
// code style; a row's whole title or a `meta` that is this one run alone is one
// value that cuts in its middle, keeping its start and end, `valueCut`, and a
// later run wraps with the text around it) or a run at strong weight
// (`strong`: the address a sentence names).
export type Run =
	| string
	| { quoted: string }
	| { code: string }
	| { strong: string };

// Runs together are one line of text: a sentence wraps, a row's title truncates
// at its end.
export type Runs = readonly Run[];

// A row's marks: a status (its dot beside its word) and a data value's chip
// on its family, each with its label; a row holds at most one of each.
export interface StatusMark {
	tone: Tone;
	// The tone's word (a word; truncates when its line is out of room), when the tone's own word does not say it.
	label?: string;
}

// A value's tag: an outlined pill with a dot in its family's hue; the
// neutral family, which has no hue, its word on a soft ground, no edge, no dot.
export interface ChipMark {
	family: ChipFamily;
	// The value (a word; truncates past the short measure, 20 characters).
	label: string;
}

// A toolbar's search: the `search` `Input`'s value and the keystrokes it
// hears, with the hint it draws while empty (the field's name is the slot word
// `search`).
export interface ToolbarSearch {
	value: string;
	onChange: (value: string) => void;
	// The hint drawn while the value is empty (a short phrase; truncates).
	placeholder?: string;
}

// An applied filter in a toolbar: a removable chip.
export interface ToolbarChip extends ChipMark {
	// Removes the filter.
	onRemove: () => void;
}

// One filter of a toolbar, which draws it as a `Picker` while the toolbar
// holds two or fewer filters on the desktop, and folds all of them behind one
// Filters act at three or more there (`FOLD_FILTERS_AT`) and at touch whatever
// their count, a removable chip for each one set. A
// pick is set while `value` is a string (unset, or on the `null` option, the
// empty choice, it is not; its empty value is `null`), a pick of several while
// it holds any (its empty value `[]`); the toolbar's pick of several carries
// `several: true`.
export type ToolbarFilter<V extends string | null = string> =
	| OptionPick<V>
	| (MultiPick<V> & { several: true });

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
// An option carrying `blocked` cannot be chosen while it is not in the value:
// its reason replaces the description under its label, both in the disabled
// ink. In the value it draws and acts as any chosen option, so it stays
// removable.
export interface Option<V extends string | null = string> {
	value: V;
	// The option's text (a short phrase; truncates; a row pick's value holds a word, truncating past the short measure, 20 characters).
	label: string;
	// Under the label (a short phrase; truncates).
	description?: string;
	recommended?: boolean;
	status?: Tone;
	avatar?: { src?: string };
	icon?: IconName;
	chip?: ChipMark;
	// Why the option cannot be chosen (a short phrase; truncates).
	blocked?: string;
}

// Options under a group label, in a `Picker`'s list and its searchable sheet.
export interface OptionGroup<V extends string | null = string> {
	// The group's heading (a short phrase; truncates).
	label: string;
	options: Option<V>[];
}

// One segment of a `Picker` in `fit: segments`: a choice (its `value`), or a
// link (an `href` and no value), which the Picker marks selected while the
// location is its href or below it, and opens when it is pressed. A Picker
// holds choices or links, never both. A label is a word, up to the short
// measure.
export interface ChoiceSegment<V extends string = string> {
	value: V;
	label: string;
	href?: never;
}
export interface LinkSegment {
	href: string;
	label: string;
	value?: never;
}

// A list row's leading: a glyph, a status's mark (its dot, or the spinner
// while `running`), a person's avatar, a tick that chooses the row (drawn
// disabled when `blocked`, the reason the row cannot be ticked, which the row
// carries on its meta line), or a type's mark (one or two characters in the
// family's hue). An avatar, a glyph, a mark or a tick stands in one slot at the
// avatar's size; a status takes its own mark's room.
export type RowLeading =
	| {
			icon: IconName;
	  }
	| { status: Tone }
	// The avatar's `name` is a short phrase: read aloud, only its initials draw.
	| { avatar: { name: string; src?: string } }
	// A type's mark: one or two characters in the family's hue (`T`, `#`, `[ ]`,
	// `{ }`, `?`), in the code face at the caption size on the family's soft
	// ground, in a small box its slot centres.
	// `label` is the type's name ("Text", "Number"): the mark's accessible name and tooltip; without it the mark is decorative and hidden from assistive tech.
	| { mark: string; family: ChipFamily; label?: string }
	| {
			check: {
				checked: boolean;
				onChange: (checked: boolean) => void;
				// Why the row cannot be ticked (a short phrase; it leads the meta
				// line, which truncates).
				blocked?: string;
			};
	  };

// A boolean fact drawn as a mark in a list row's end group, named by its
// `label` (the mark's accessible name and tooltip; the words live there, never
// beside it). A `ring` is the required ring: an outlined circle at the dot's
// size, filled when `ring` is true. A `flag` is a glyph from the icon set for a
// fact that is true of the row (a "Personal data"): give it only while it holds.
export type RowMark =
	| { ring: boolean; label: string }
	| { flag: IconName; label: string };

// A pick that applies at once where a value stands (a row's trailing, a
// record's status fact, a toolbar's filter, the shell's switcher between a
// workspace and an account), drawn as a `Picker` at the row fit. A promise
// `onChange` returns holds the viewer's pick while it pends; a refusal puts
// it back, with its reason.
export interface OptionPick<V extends string | null = string> {
	// Tells it from a pick of several (see `MultiPick`).
	several?: false;
	// What is picked, the trigger's name (a short phrase; read aloud, never drawn on the trigger; in a toolbar the field's label in the folded panel and the lead of its chip, "Work type: Change").
	label: string;
	// The hint drawn while nothing is chosen (a short phrase; truncates).
	placeholder?: string;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	value?: NoInfer<V>;
	onChange: (value: NoInfer<V>) => unknown;
	// The act that makes a new option, ending the list under a hairline: an act that runs, or a link to where it is made.
	act?: IconAct | IconLinkAct;
}

// A pick of several: the options ticked in the list, which stays open while
// the viewer picks, and the chosen ones drawn as removable chips (in a rule's
// row, one chip for one value and from two a token naming how many). Its
// empty value is `[]`.
export interface MultiPick<V extends string | null = string> {
	// Tells it from a pick of one, so an inline `onChange` reads its value's type
	// from the entry it stands in (a toolbar's filter requires it).
	several?: true;
	// What is picked, the trigger's name (a short phrase; read aloud, and in a rule's row the noun of the folded count, its first letter lowercased: "5 projects").
	label: string;
	// The hint drawn while nothing is chosen (a short phrase; truncates).
	placeholder?: string;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	value: readonly NoInfer<V>[];
	// A promise it returns holds the viewer's picks while it pends; a refusal
	// puts them back, with its reason.
	onChange: (value: NoInfer<V>[]) => unknown;
	// The act that makes a new option, ending the list under a hairline: an act that runs, or a link to where it is made.
	act?: IconAct | IconLinkAct;
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
// word). An `age` is an ISO moment: the row words it short ("2 min")
// and keeps it current from the shared clock. Its `beside` is a short value (a
// spend, "$0.12") drawn after the age, whole or gone with it; a row that waits
// draws the same bar for it, since the loaded width is not derivable.
export type RowTrailing =
	| { age: string; beside?: string }
	| { count: number }
	// A word: whole or gone on the web (the row leaves it once the title would hold under half its line), kept whole on the phone.
	| { value: string };

// A list row's entry: an input and the act that sends it, standing under the
// title in the meta line's place (a URL and its Import), the act's label whole
// (on a line too narrow for both it stands under the input). `label` names the
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

// A row's title: words (`Run`, `Runs`), a span of code (`{ code }`, the mono
// cut in its middle; with `copy` it carries a copy act: an identifier), the
// word that says there is no value (`{ absent }`, "Any", "None", drawn in the
// meta ink) or a status (`{ status, label? }`, its compact pill at the
// title's start).
export type RowTitle =
	| Run
	| Runs
	| { code: string; copy: true }
	| { absent: string }
	| { status: Tone; label?: string };

// A row's lock: why the row cannot change here, a request that holds it ("Held
// by CR-12, Ana") or a role that cannot. The lock is a glyph named by the
// reason; with `href` it is a link to what holds the fact, without one inert.
export interface Lock {
	reason: string;
	href?: Route;
}

/** A row of a Section's sheet: a row item or a file; `"path" in row` tells the last. */
export type Row<V extends string | null = string> = RowItem<V> | FileItem;

/** One row of a Section's sheet, a fact or a thing alike: it draws whichever slots it fills, on one box. A row with a `label` stands in the sheet's two columns (the label in the first, as wide as the widest of the Pane); a row without one starts its text group at the row's start. */
export interface RowItem<V extends string | null = string> {
	/** The row's React key, unique across the whole sheet, a tree's children included; the label's text, then the title's, when none is given. */
	key?: string;
	/** Where the row stands in a change set: its mark at the row's start, ahead of the leading mark (a set's untouched rows are `unchanged`, so the titles line up). */
	change?: ChangeKind;
	/** What the row is, in the aligned column ahead of its text (a short phrase; wraps to the room its title leaves), at the body role in the meta ink; `{ code }` is a machine name (a key, a path) in the code role, in the meta ink too. The column is as wide as the widest label of every list in the Pane. On touch a value stands under its label, and a label with no title, meta or entry (a switch's, an act's) stands on one line with the end group. */
	label?: string | { code: string };
	/** The row's leading mark: a glyph, a status, an avatar, a type's mark (its `label` names it) or a tick that chooses the row. */
	leading?: RowLeading;
	/** What the row names (a short phrase; truncates at its end, wraps whole while `wrap`, whether the row has a `label` or not); runs of words and `{ code }` draw the code bare in the mono, as a machine name in a row stands (voice 7); the platform widens it to a `Datum`. */
	title?: RowTitle;
	/** What follows the title on its line while the row is one line, and stands under it where the row is two (on touch, below the row's one-line width, or beside a mark): its parts (each a short phrase) joined by a middle dot, cut with an ellipsis at the line's end in one line and in two each part wrapping whole, its words wrapping only where it is longer than the line, so no dot stands at either end of a line; a `{ code }` part is bare in the mono, and one alone in a one-line row cuts in its middle (`valueCut`); the platform widens it to a `Datum`. */
	meta?: Runs;
	/** A value in the row's end group (an age, a count, a word), cut with an ellipsis to the room the end's controls and acts leave. */
	trailing?: RowTrailing;
	/** A work state, the first of the row's marks: its dot and word at the start of the meta line. A row with a mark stands its meta line under its title at every width. */
	status?: StatusMark;
	/** What is wrong with the row, a warning mark in the meta line after the status (a short phrase); the meta parts after the marks stand a middle dot apart from them. */
	warning?: string;
	/** What the row holds or why it cannot change here, a lock mark in the meta line after the warning (a short phrase); with an `href` the lock links to what holds the fact. A locked row takes no act or open. */
	lock?: string | Lock;
	/** A data value's chip, a mark in the meta line after the lock. */
	chip?: ChipMark;
	/** Boolean facts of the row, marks in the meta line after the chip, in order, each its glyph and its `label`: the required ring (a ring that does not hold draws nothing), a flag glyph. */
	marks?: readonly RowMark[];
	/** An input and its act under the title, in the meta line's place; give `meta` and the marks back once the act settles. */
	entry?: RowEntry;
	/** The steps of the work the row's act pends on, one line each in the meta line's place. */
	steps?: readonly StatusMark[];
	/** The row stands off a highlighted path: its title in the meta ink, still a hit and focusable. */
	dim?: boolean;
	/** The title is a passage read whole: it wraps to every line instead of truncating. */
	wrap?: boolean;
	/** A setting that changes the row's fact in place, named by the label; the platform widens `checked` to a `Datum`. */
	switch?: { checked: boolean; onChange: (checked: boolean) => unknown };
	/** A pick that chooses in place and applies at once, in the end group; the platform widens `options` and `value` to a `Datum`. */
	pick?: Omit<OptionPick<V>, "act" | "several">;
	/** The row's one act at its end, ahead of the more act, or a link to a route: an icon act, its label the accessible name and the tooltip; the row's other acts are its `more`. The platform widens it to a `Datum`. */
	act?: IconAct | IconLinkAct;
	/** The row's acts, in a menu under the more act at its end; the platform widens it to a `Datum`. */
	more?: readonly MenuEntry[];
	/** Where the row goes when opened; the row is current at it and at every address below it (`isCurrent`). */
	href?: string;
	/** Whether the row is current, whatever its `href`: `true` for the open record, or a place whose page has opened a record at an address outside its own; `false` for a second row of the open record's address (one listed twice, as a kind's page and again among the stale ones), so the record is current once. Absent, the row is current at its `href`. */
	selected?: boolean;
	/** Opens what the row names. */
	onOpen?: () => void;
	/** The row's children, which make the sheet a tree: they draw one level in under it, and its fold act folds them. */
	children?: readonly RowItem<V>[];
	/** The key of the Section's `groups` entry the row stands in; a tree's group is its root rows', children following their parent. */
	group?: string;
}

/** A band over a Section's rows: the rows whose `group` is its `key`, under its label, the count of those rows (none where it is the Section's one band and holds every row, the heading's count being the same) and its act. */
export interface Band {
	/** The key the rows' `group` names. */
	key: string;
	/** The band's label (a short phrase; truncates). */
	label: string;
	/** The band's one icon act at its end, or a link to a route. */
	act?: IconAct | IconLinkAct;
}

/** A changed file in a review's sheet. */
export interface FileItem {
	/** The row's React key, unique across the sheet. */
	key: string;
	/** The file's path (the directory gives way first when it is too long, then the name's middle). */
	path: string;
	/** Lines added; zero draws nothing. */
	added: number;
	/** Lines removed; zero draws nothing. */
	removed: number;
	/** Whether the reviewer has seen the file: a tick when seen, a ring when not; absent, the file glyph leads. */
	seen?: boolean;
	/** Where the file stands in a change set: the change mark at the row's start. */
	change?: ChangeKind;
	/** Why the file is listed, a data value's chip between the path and the counts. */
	chip?: ChipMark;
	/** Where the row goes when opened; the row is selected at it. */
	href?: string;
	/** Opens the file. */
	onOpen?: () => void;
}

// What a typing control inside a bound `FormField` takes: the field's value,
// its change handler, and, when the binding autosaves, what hears each
// commit (`CommitMoment` in `./commit`: the viewer left the field or pressed
// Enter having changed it).
export interface FieldControl<V> {
	readonly value: V;
	onChange: (value: V) => unknown;
	onCommit?: (value: V) => unknown;
}

// A form field by name: its value, its change handler and its error line.
// A `FormField` given one draws the error and hands the control the rest.
export interface FieldBinding<V> extends FieldControl<V> {
	// The line that takes the description's place (a sentence; wraps): words,
	// or runs whose `{ code }` stands boxed in the mono.
	readonly error: Run | Runs | undefined;
}

// A decision asked imperatively: `confirm()` opens a sheet with the title,
// the sentence and the act, and returns nothing. The act runs the work: while
// the promise its `onAct` returns pends, the act is pending and the sheet's
// other acts are inert; the sheet closes when it resolves and stays open,
// the act ready again, when it rejects. Dismissing the sheet runs nothing.
// `destructive` draws the act as a destructive button.
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
export interface Decision {
	// The sheet's heading (a short phrase; wraps).
	title: string;
	// What the decision asks (a sentence; wraps).
	sentence: string;
	// The way out's text (a short phrase; truncates).
	cancel?: string;
	confirmName?: ConfirmName;
}

// A decision with the act it runs: what `confirm()` draws.
export interface Confirmation extends Decision {
	act: Act;
}

// What a menu holds: acts that run and links that go.
export type MenuEntry = Act | LinkAct;

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
// bound stat's line under its bar, a stat strip's cell): zero is a count, drawn.
export interface CountLink {
	// What is counted (a word; wraps).
	label: string;
	value: number;
	href: Route;
}

// A count in a strip: a label over its figure (zero is a count, drawn), an
// optional unit beside the figure and meta line under it, then either the
// whole cell a link to `href` or sub-counts that are links of their own, never
// both, since a cell inside a link cannot hold links. A count with a `bound`
// is a share of a limit, how much of a quota is used: the cell draws the meter
// form, the label with the share in percent at its end over a bar filling by
// the share, then its meta line or its sub-counts. It has no unit, since the
// share stands in the figure's place, and no `href`, since its sub-counts are
// the links.
export type StatSpec = {
	// What the figure counts (a short phrase; wraps).
	label: string;
	value: number;
	// Under the figure (a sentence; wraps).
	meta?: string;
} & (
	| ({
			// What the figure counts, beside it (a word; wraps).
			unit?: string;
			bound?: never;
			mark?: never;
	  } & (
			| { counts?: readonly CountLink[]; href?: never }
			| { href: Route; counts?: never }
	  ))
	| {
			// The limit: past it the share is over.
			bound: number;
			// A tick across the bar at the mark's value, the point the fill turns amber at.
			mark?: MeterMark;
			counts?: readonly CountLink[];
			unit?: never;
			href?: never;
	  }
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
	// Why the rail ended (a sentence; wraps), when it says one; empty or absent, the row draws its label alone.
	reason?: string;
}

// A place in the shell: a route, a label, an icon, an optional count, and where it stands in the sidebar.
export interface PlaceSpec {
	route: Route;
	// The place's name (a word; truncates).
	label: string;
	icon: IconName;
	count?: number;
	// The name of the group the place stands in (a word; truncates). Consecutive
	// places with the same group stand together under its label in the sidebar;
	// a place with none stands ungrouped. The tab bar and the More page ignore it.
	group?: string;
	// The place stands in the footer group at the sidebar's bottom (settings, an
	// exit), after the others and under no label. The tab bar and the More page
	// ignore it.
	end?: boolean;
}

// A group of places in the sidebar, named by `PlaceSpec.group`. One with a
// `switcher` is a scope (a project) whose places follow its pick: the pick
// stands as a row under the group's label, before the places.
export interface GroupSpec {
	// The group's name (a word; truncates), as the places' `group` names it.
	label: string;
	switcher?: OptionPick;
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
	// The hunk's header in git's form (`@@ -12,7 +12,9 @@ export function total`),
	// optional. Its ranges are never drawn: the lines' numbers say where a hunk
	// stands and an elided mark parts it from the hunk before. What git writes
	// after the ranges (the enclosing function, a short phrase; truncates) stands
	// in that mark; a header in no git form stands there whole.
	header?: string;
	lines: DiffLine[];
}

// A file the viewer chose or dropped, the same on both platforms so one
// upload serves both: the web wraps its `File` (`blob` resolves to it), the
// phone the document picker's asset (`blob` reads its uri). `size` is in
// bytes and `type` a MIME type, empty when the platform knows none. `src` is
// a local address the file can be drawn from before it is uploaded (an
// `Attachment`'s thumbnail): the phone's asset uri, set on every file and
// needing no revoke, and on the web an object URL that `Thread`'s composer's attach
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
	// measure, 20 characters), or a thumbnail's accessible name.
	name: string;
	src?: string;
}

// A sentence and an act under a message input.
export interface Notice {
	// What it says (a sentence; wraps).
	sentence: string;
	act?: Act | LinkAct;
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
				title: Run;
				meta?: Runs;
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

// A column's width: the short measure of a label or a quarter of the table's
// width. A column with none shares what the others leave.
export type ColumnWidth = Measure | "1/4";

interface ColumnBase {
	key: string;
	// The column's head (a short phrase; truncates).
	label: string;
	width?: ColumnWidth;
	sortable?: boolean;
	// The column's cells wrap onto further lines and hyphenate, as a long
	// value reads whole, instead of truncating. The row grows to its tallest
	// cell.
	wrap?: boolean;
	// The column is read only in this table: its cells never edit (its `edit` is
	// ignored) and its head draws a lock glyph.
	locked?: boolean;
}

// A column by the kind of value its cells hold, each kind with the edits
// that fit it: `text`, `source` (mono) and `number` are typed; `chip` (a value
// drawn on the column's family), `status`, `age` (an ISO moment) and `change` (a
// value before and after, sorted by its after) are read only. Its
// `cell` reads its value from an item. Bare (`T` never), it is a column over
// any item, its cell taking none.
export type TableColumn<T = never> = (
	| (ColumnBase & { kind?: "text" | "source" | "number"; edit?: "input" })
	| (ColumnBase & { kind: "chip"; family: ChipFamily; edit?: never })
	| (ColumnBase & { kind: "status" | "age" | "change"; edit?: never })
) & { cell: (item: T) => TableCell };

// A `change` cell's value: what it was and what it is. A null `before` is a
// value added, a null `after` a value removed.
export interface ChangeCell {
	// Each value is a short phrase; it truncates.
	before: string | null;
	after: string | null;
}

// A cell's value, by its column's kind: a string (`text`, `source`, `chip`,
// `age`), a number, a status mark, a change or, in a `chip` column, a chip
// mark naming its own family; null is an empty cell.
// A string cell is a short phrase: it truncates (a `chip` cell a word,
// truncating past the short measure, 20 characters). A `chip` cell given as a
// string draws on the column's `family`; one given as `{ label, family }`
// draws on its own, as a column of kinds takes each kind's hue.
export type TableCell =
	| string
	| number
	| StatusMark
	| ChipMark
	| ChangeCell
	| null;

// A selection bar's count of the rows a list chooses: `count` of `of` (the rows
// that can be chosen). `onAll` adds the acts beside the count: one that clears
// the rows while any are chosen (it hears `false`) and one that chooses every
// row while some stand unchosen (`true`). Both draw at every width: a table draws
// its head tick by the width of its own column, which the bar cannot tell.
export interface ChosenCount {
	count: number;
	of: number;
	// What the rows are called in the sentence (a plural word, "items"): "0 of 4 items chosen"; without it "0 of 4 chosen".
	noun?: string;
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
	// What the rows are called in the selection bar's count (a plural word): "0 of 4 promotable chosen".
	noun?: string;
	// Each reason is a short phrase; it truncates under the leading cell.
	blocked?: (item: T) => string | undefined;
	moved?: (item: T) => string | undefined;
}

// What one committed edit hands back: the column's new value, null for a
// number cleared.
export type CellValue = string | number | null;

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
// table; `href`, its leading cell's link, so it opens in a new tab; `editable`,
// whether its cells edit in place (false: they draw the plain value, no mark
// and no act, a row that is simply not editable); `locked`, the columns whose
// cells it draws read only with a lock, the hold of an open change set;
// `warning`, what is wrong with
// the row, drawn after its leading cell's name (a warn glyph and the
// sentence; the phone's row carries it as a `ListRow` warning); and `change`,
// where the row stands in a change set, its mark ahead of the leading cell's
// name (the phone's row carries it as a `ListRow` change).
export interface TableRowSlots<T> {
	id: (item: T) => string;
	href?: (item: T) => Route | undefined;
	editable?: (item: T) => boolean;
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

// What a node is in its graph, drawn in its shape and tone: `start` a pill in
// the accent, `step` the plain card, `decision` a compact card with a diamond
// (its answers are its out-edges' labels), `wait` a card in the attention
// tone (something waits for the operator), `call` a card with a double edge
// (another graph runs here), `end` a quiet pill.
export type CanvasRole =
	| "start"
	| "step"
	| "decision"
	| "wait"
	| "call"
	| "end";

// One node: its glyph, its words and the one figure in its trailing slot,
// `number` (a place in a sequence) over `count`. A `problem` is drawn in
// place of `line`; an `off` node is drawn quiet over its role. Without a
// `position` the canvas places it.
export interface CanvasNode {
	id: string;
	icon: IconName;
	// What the node is, in its shape and tone (`step`, the plain card, without one).
	role?: CanvasRole;
	// A `call` node's graph: it draws an open act that goes there without choosing the node.
	href?: Route;
	// Over the title (a short phrase; truncates).
	overline?: string;
	// The node's name (a short phrase; truncates).
	title: string;
	// Under the title (a phrase; wraps to a second line, then truncates).
	line?: string;
	number?: number;
	count?: number;
	// The node's status: its dot and its `label`, leading the line under the title (a word or two; whole up to the short measure, then truncates).
	status?: StatusMark;
	// What is wrong with the node, in `line`'s place (a short phrase; truncates).
	problem?: string;
	off?: boolean;
	position?: CanvasPoint;
}

// An edge from one node's id to another's, its `label` drawn on it; a
// `handoff` edge carries its glyph beside the label. An end may name a group
// that holds nothing present, which stands in the path as a node does.
export interface CanvasEdge {
	id: string;
	from: string;
	to: string;
	// Drawn on the edge in a chip (a word; truncates past the short measure, 20 characters).
	label?: string;
	handoff?: boolean;
}

// A frame round the nodes and groups it `holds`, by id; a group may hold a
// group. A group holding nothing present is a frame of its head alone.
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

// ── Thread ──────────────────────────────────────────────────────────

// One message of a thread, by its author: `you`, a bubble at the column's end;
// `other`, a reply read as Prose under its name; `system`, one meta line
// centred in the thread. A turn takes `name`, `attachments`, `meta` and
// `streaming`; a system line takes `onOpen` and `detail`.
export type Message = {
	// What was said (text; wraps): plain text for `you` and `system`, markdown for `other`.
	body: string;
	// When it was said, an ISO moment: drawn as the time today, the day's word and the time a day either side, else the date and time (its year only when it is not this year's).
	at?: string;
} & (
	| {
			author: "you" | "other";
			// Who said it: drawn over `other`'s reply; yours draws none (a short phrase; wraps).
			name?: string;
			// What came with it, one row over the bubble or the reply: an attachment with `src` a thumbnail that opens full size, one without a chip of its name.
			attachments?: readonly Attachment[];
			// Where it came from ("by voice", "Kitchen"), joined by a middle dot before the time (each a short phrase; the line breaks between a part's words, never at a dot).
			meta?: Runs;
			// The reply is still arriving: a marker left open at its end (an emphasis, a strong run, a code span, a link, a fence) is drawn in its own form from its first character, and its closing marker changes nothing already drawn; unset or `false`, an unmatched marker is text. Yours is always whole.
			streaming?: boolean;
			onOpen?: never;
			detail?: never;
	  }
	| {
			author: "system";
			// Opens what the line names: the line becomes the act, a chevron after it.
			onOpen?: () => void;
			// What stands under the line, one of three: a row in a hairline card that opens its record, a free act's arguments in the code role, or lines the line opens in place (it takes no `onOpen` then).
			detail?: MessageDetail;
			name?: never;
			streaming?: never;
			attachments?: never;
			meta?: never;
	  }
);
