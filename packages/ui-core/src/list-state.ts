// The decisions a collection (a Section's sheet, a `Table`, a `Picker` in `fit: list`) and the
// Stats meter, StepCount and Stages states make before they draw, free of any
// framework: both platforms run this one source, and it is tested without
// rendering.

import type {
	ChangeCell,
	ChangeKind,
	ChipMark,
	ChoiceSlots,
	Drop,
	IconAct,
	IconLinkAct,
	IconName,
	MenuEntry,
	Option,
	OptionGroup,
	OptionLeading,
	Picked,
	Route,
	RowMark,
	RowTitle,
	Run,
	StatusMark,
	StepState,
	TableCell,
	TableChoice,
	TableColumn,
	TablePick,
	TableRowSlots,
	ToolbarFilter,
} from "./descriptors.ts";
import { painting } from "./paint.ts";
import { nounOf } from "./rules.ts";
import {
	MEASURE_CHARACTERS,
	METER_NEAR,
	type Tone,
	type Words,
} from "./tokens.ts";

// One row of a tree as the list draws it: its item at a depth (the roots at
// 0), its place among its siblings (`place` of `size`, from 1, whichever of
// them are drawn), whether it has children to fold, and whether they are
// drawn.
export interface TreeRow<T> {
	item: T;
	key: string;
	depth: number;
	size: number;
	place: number;
	branch: boolean;
	open: boolean;
}

// The rows a tree draws, in order: each item, then its children one depth in
// unless its key is folded, so a folded item hides every descendant. A list
// folds nothing until a key is given; an item with no children (none, or an
// empty list) is a leaf and cannot fold. `folded` names keys no item holds
// harmlessly.
export function treeRows<T>(
	items: readonly T[],
	slots: {
		key: (item: T) => string;
		children: (item: T) => readonly T[] | undefined;
	},
	folded: readonly string[],
): TreeRow<T>[] {
	const rows: TreeRow<T>[] = [];
	const walk = (level: readonly T[], depth: number) => {
		for (const [at, item] of level.entries()) {
			const key = slots.key(item);
			const below = slots.children(item) ?? [];
			const open = !folded.includes(key);
			rows.push({
				item,
				key,
				depth,
				size: level.length,
				place: at + 1,
				branch: below.length > 0,
				open,
			});
			if (open) walk(below, depth + 1);
		}
	};
	walk(items, 0);
	return rows;
}

// What a key does at a row of a tree, by the WAI-ARIA tree pattern: move the
// focus to the row at an index, or open or fold the branch at a key.
export type TreeMove =
	| { focus: number }
	| { fold: string; open: boolean }
	| undefined;

// The row the tree's one tab stop is on: the active key's, else the first. A
// folded parent hides the active row, and the stop falls back to the first.
export function treeStop(
	rows: readonly Pick<TreeRow<unknown>, "key">[],
	active: string | undefined,
): number {
	return Math.max(
		rows.findIndex((each) => each.key === active),
		0,
	);
}

// What a key does with the focus on the row at `at` of the visible rows (see
// `treeRows`): Down and Up step between visible rows, Home and End go to the
// first and last; Right opens a closed branch and on an open one moves to its
// first child (the next row), on a leaf does nothing; Left folds an open
// branch, else moves to the parent (the nearest row before it a level out),
// which a root has none of. Any other key does nothing.
export function treeMove(
	rows: readonly Pick<TreeRow<unknown>, "key" | "depth" | "branch" | "open">[],
	at: number,
	key: string,
): TreeMove {
	const here = rows[at];
	if (!here) return undefined;
	const last = rows.length - 1;
	switch (key) {
		case "ArrowDown":
			return at < last ? { focus: at + 1 } : undefined;
		case "ArrowUp":
			return at > 0 ? { focus: at - 1 } : undefined;
		case "Home":
			return { focus: 0 };
		case "End":
			return { focus: last };
		case "ArrowRight":
			if (!here.branch) return undefined;
			return here.open ? { focus: at + 1 } : { fold: here.key, open: true };
		case "ArrowLeft": {
			if (here.branch && here.open) return { fold: here.key, open: false };
			const parent = rows.findLastIndex(
				(each, index) => index < at && each.depth < here.depth,
			);
			return parent < 0 ? undefined : { focus: parent };
		}
		default:
			return undefined;
	}
}

// The folded keys after a branch opens or folds: the key out of the set to
// open it, in to fold it, the set kept as it is when it already stands so.
export function folding(
	folded: readonly string[],
	key: string,
	open: boolean,
): readonly string[] {
	if (folded.includes(key) === !open) return folded;
	return open ? folded.filter((each) => each !== key) : [...folded, key];
}

// The characters a definition value keeps at its end when the row cuts it.
const VALUE_TAIL = 4;

// A definition value, cut for a row too narrow for it: the stem gives way
// from its end (an ellipsis after it) and the tail, its last VALUE_TAIL
// characters, never does, so the start and the end of a long identifier stay
// (`SHA256:uNiV…k3Qz`). Only a value of one word longer than twice the tail is
// cut: a value with a space is words (`No history yet`), which read from their
// start, and a shorter one has no middle to give; both stay one stem, so no
// space ends a node and no word is split in two. Each platform draws the stem
// truncating to its own box, so the row measures the room it gives; the two
// parts together are the whole value, which stays the accessible text and the
// copy payload. Both platforms read it, so one value cuts the same way.
export function valueCut(value: string): { stem: string; tail: string } {
	const characters = Array.from(value);
	if (characters.length <= VALUE_TAIL * 2 || /\s/.test(value))
		return { stem: value, tail: "" };
	const at = characters.length - VALUE_TAIL;
	return {
		stem: characters.slice(0, at).join(""),
		tail: characters.slice(at).join(""),
	};
}

// One function per check row slot, each called with a loaded item; `group`
// is the label the option stands under.
export interface OptionSlots<T, V extends string> {
	value: (item: T) => V;
	label: (item: T) => string;
	line?: (item: T) => string | undefined;
	recommended?: (item: T) => boolean | undefined;
	blocked?: (item: T) => string | undefined;
	group?: (item: T) => string;
}

/** An option's leading by kind, the one reading of it a picker draws from: a glyph, a status's tone, an avatar's name and `src`; each is undefined unless the option leads with it. */
export function optionLeading(option: Pick<Option, "leading"> | undefined): {
	icon: IconName | undefined;
	tone: Tone | undefined;
	avatar: { name: string; src?: string } | undefined;
} {
	const leading: OptionLeading | undefined = option?.leading;
	return {
		icon: leading && "icon" in leading ? leading.icon : undefined,
		tone: leading && "tone" in leading ? leading.tone : undefined,
		avatar: leading && "avatar" in leading ? leading.avatar : undefined,
	};
}

// A query's items as the options a static set holds: flat, or with `group`
// under each label in the order it first appears.
export function optionsOf<T, V extends string>(
	items: readonly T[],
	slots: OptionSlots<T, V>,
): Option<V>[] | OptionGroup<V>[] {
	const optionOf = (item: T): Option<V> => {
		const option: Option<V> = {
			value: slots.value(item),
			label: slots.label(item),
		};
		const line = slots.line?.(item);
		if (line !== undefined) option.line = line;
		if (slots.recommended?.(item)) option.recommended = true;
		const blocked = slots.blocked?.(item);
		if (blocked !== undefined) option.blocked = blocked;
		return option;
	};
	const { group } = slots;
	if (group === undefined) return items.map(optionOf);
	const groups = new Map<string, Option<V>[]>();
	for (const item of items) {
		const label = group(item);
		const held = groups.get(label);
		if (held) held.push(optionOf(item));
		else groups.set(label, [optionOf(item)]);
	}
	return [...groups].map(([label, options]) => ({ label, options }));
}

// A list Picker's one choice: radio rows in a radiogroup.
export interface OneChoice<V extends string> {
	// The chosen option's value; null before one is chosen.
	value: V | null;
	// Hears the option chosen.
	onChange: (value: V) => void;
}

// A list Picker's several choices: check rows, each toggling the set.
export interface SetChoice<V extends string> {
	// The chosen options' values.
	value: readonly V[];
	// Hears the whole chosen set after a toggle.
	onChange: (value: V[]) => void;
}

// A list Picker's choice in either form.
export type OptionChoice<V extends string> = OneChoice<V> | SetChoice<V>;

// The form a value picks: a set is several choices, one value or null one.
export function isOneChoice<V extends string>(
	choice: OptionChoice<V>,
): choice is OneChoice<V> {
	return !Array.isArray(choice.value);
}

// The chosen values in either form, in the order they were chosen.
export function chosenOf<V extends string>(
	choice: OptionChoice<V>,
): readonly V[] {
	if (!isOneChoice(choice)) return choice.value;
	return choice.value === null ? [] : [choice.value];
}

// A value toggled in a several-pick's set: out when it is in, else in at the
// end.
export function toggled<V extends string | null>(
	values: readonly V[],
	value: V,
): V[] {
	return values.includes(value)
		? values.filter((one) => one !== value)
		: [...values, value];
}

// Why an option cannot be chosen now: its `blocked` reason, only while it is
// not in the value. A chosen blocked option is an ordinary chosen one, so the
// viewer can always remove it.
export function optionBlocked(
	option: Option<string | null>,
	chosen: boolean,
): string | undefined {
	return chosen ? undefined : option.blocked;
}

// A press on an option: one choice hears it unless it is already chosen; a
// set hears itself with the option toggled.
export function choose<V extends string>(
	choice: OptionChoice<V>,
	option: V,
): void {
	if (isOneChoice(choice)) {
		if (choice.value !== option) choice.onChange(option);
		return;
	}
	choice.onChange(toggled(choice.value, option));
}

// A toolbar on the desktop holding this many filters or more folds all of them
// behind one Filters act; fewer stand inline as picks. At touch the toolbar is
// one row, so every filter folds. One value for both platforms, not a
// consumer's option.
export const FOLD_FILTERS_AT = 3;

// Whether a toolbar folds its `count` filters, at touch or on the desktop.
export function filtersFold(count: number, touch: boolean): boolean {
	return touch ? count > 0 : count >= FOLD_FILTERS_AT;
}

// What a filter reads of itself, whatever its options are (a list or a read
// of one).
type Filtered = Pick<ToolbarFilter<string | null>, "label" | "value">;

// A filter is set while it holds a choice: a string value, or any of several.
// `undefined` and `null` (the empty choice) are the unset one.
export function filterSet(filter: Filtered): boolean {
	const { value } = filter;
	return Array.isArray(value) ? value.length > 0 : typeof value === "string";
}

// What a filter's chip and a clear set it to: `[]` for several, else `null`.
export function filterEmpty(filter: Filtered): null | [] {
	return Array.isArray(filter.value) ? [] : null;
}

// A set filter's chip, "Work type: Change". A pick of several reads its one
// value, or from two the count as the fold of a rule's row does ("Projects:
// 5 projects"). A value its options do not hold reads as it is.
export function filterChip(
	filter: Filtered,
	options:
		| readonly Option<string | null>[]
		| readonly OptionGroup<string | null>[],
): string {
	const flat = options.flatMap((one) =>
		"options" in one ? one.options : [one],
	);
	const read = (value: string | null) =>
		flat.find((option) => option.value === value)?.label ?? value ?? "";
	const { value, label } = filter;
	if (!Array.isArray(value))
		return `${label}: ${read(typeof value === "string" ? value : null)}`;
	return value.length === 1
		? `${label}: ${read(value[0] ?? null)}`
		: `${label}: ${value.length} ${nounOf(label)}`;
}

// One table row as both of its forms draw it: its own slots and each
// column's cell by key, read from its item once.
export interface TableRecord {
	id: string;
	href: Route | undefined;
	editable: boolean;
	locked: readonly string[] | undefined;
	warning: string | undefined;
	change: ChangeKind | undefined;
	blocked: string | undefined;
	moved: string | undefined;
	act: IconAct | IconLinkAct | undefined;
	more: readonly MenuEntry[] | undefined;
	drop: Drop | undefined;
	cells: Readonly<Record<string, TableCell>>;
}

// The Table's rows: each item through the row map, every column's `cell` and
// the reasons its choice gives. Over the painted items (the placeholder) a
// slot that throws paints as the item itself, never throws the page.
export function tableRecords<T>(
	items: readonly T[],
	columns: readonly TableColumn<T>[],
	row: TableRowSlots<T>,
	choose?: ChoiceSlots<T>,
	painted = false,
): TableRecord[] {
	const slot = <R>(fn: (item: T) => R, item: T): R =>
		painted ? (painting(fn, item) as R) : fn(item);
	return items.map((item) => ({
		id: slot(row.id, item),
		href: row.href && slot(row.href, item),
		editable: row.editable ? slot(row.editable, item) : true,
		locked: row.locked && slot(row.locked, item),
		warning: row.warning && slot(row.warning, item),
		change: row.change && slot(row.change, item),
		blocked: choose?.blocked && slot(choose.blocked, item),
		moved: choose?.moved && slot(choose.moved, item),
		// A painted row draws none of its acts: the column stands, its cell empty.
		act: painted ? undefined : row.act?.(item),
		more: painted ? undefined : row.more?.(item),
		drop: painted ? undefined : row.drop?.(item),
		cells: Object.fromEntries(
			columns.map((column) => [column.key, slot(column.cell, item)]),
		),
	}));
}

// The edit a cell takes: its column's, in a table that edits, never the
// leading column's, nor a column locked whole, nor a column its row locks,
// nor any column of a row that is not editable.
export function cellEdit(
	column: TableColumn,
	leading: boolean,
	edits: boolean,
	row: TableRecord,
): TableColumn["edit"] {
	if (!edits || leading || column.locked || !row.editable) return undefined;
	if (row.locked?.includes(column.key)) return undefined;
	return column.edit;
}

// A cell its row locks: it draws the lock (a locked column draws it in its
// head alone). A cell past the leading one is locked where its column would
// edit it; the leading cell, which never edits in place (it opens the row),
// is locked wherever its row lists its column, since that is a value the row
// holds read only all the same.
export function cellLocked(
	column: TableColumn,
	leading: boolean,
	edits: boolean,
	row: TableRecord,
): boolean {
	if (!edits || column.locked) return false;
	if (row.locked?.includes(column.key) !== true) return false;
	return leading || column.edit !== undefined;
}

// The rows a tick reaches: every row with no blocked reason.
export function tickable(rows: readonly TableRecord[]): TableRecord[] {
	return rows.filter((row) => row.blocked === undefined);
}

// The head tick over the rows that can be ticked: checked when all are
// chosen, mixed when some are, unchecked when none are (or none can be).
export function chooseHead(
	rows: readonly TableRecord[],
	chosen: readonly string[],
): boolean | "mixed" {
	const reach = tickable(rows);
	const ticked = reach.filter((row) => chosen.includes(row.id)).length;
	if (ticked === 0) return false;
	return ticked === reach.length ? true : "mixed";
}

// A row's tick: its id in the chosen set, or out of it.
export function chooseRow(
	chosen: readonly string[],
	id: string,
	on: boolean,
): string[] {
	const rest = chosen.filter((each) => each !== id);
	return on ? [...rest, id] : rest;
}

// What the head tick chooses: every tickable row once all of them are chosen
// is turned off, otherwise (unchecked or mixed) turned on. A chosen id the
// rows do not hold keeps its place, and the rows added join in row order.
export function chooseAllToggled(
	rows: readonly TableRecord[],
	chosen: readonly string[],
): string[] {
	const reach = tickable(rows).map((row) => row.id);
	if (chooseHead(rows, chosen) === true)
		return chosen.filter((id) => !reach.includes(id));
	return [...chosen, ...reach.filter((id) => !chosen.includes(id))];
}

// What a table's tick column reads and does, whichever way the rows are chosen
// (the ids ticked, or a pick over a read's query): `head` the head tick's
// state, the changes a tick and the head tick make, and `count` of `of` and
// `onAll` for the selection bar the route gives the Pane's foot (an
// `ActionBar`'s `chosen`, `ChosenCount`).
export interface Chooser {
	ticked: (id: string) => boolean;
	// What the ticks hold, as a drag or a mutation takes it.
	pick: Picked;
	head: boolean | "mixed";
	tick: (id: string, on: boolean) => void;
	// Ticks `on` and unticks `off` in one change (a range the keyboard extends
	// or shrinks), so no tick of the pair is read against a stale set.
	tickSet: (on: readonly string[], off: readonly string[]) => void;
	toggleAll: () => void;
	count: number;
	of: number;
	onAll: (all: boolean) => void;
}

// The loaded rows' blocked ids: a pick of the query leaves them out, as the
// head tick leaves them unticked.
const blockedIds = (rows: readonly TableRecord[]) =>
	rows.filter((row) => row.blocked !== undefined).map((row) => row.id);

/** The ids ticked, as a `Chooser`: the head tick and choose-all reach the loaded rows that can be ticked. */
export function idsChooser(
	rows: readonly TableRecord[],
	chosen: readonly string[],
	change: (ids: string[]) => void,
): Chooser {
	const reach = tickable(rows).map((row) => row.id);
	return {
		ticked: (id) => chosen.includes(id),
		pick: { ids: [...chosen] },
		head: chooseHead(rows, chosen),
		tick: (id, on) => change(chooseRow(chosen, id, on)),
		tickSet: (on, off) =>
			change([
				...chosen.filter((id) => !on.includes(id) && !off.includes(id)),
				...on,
			]),
		toggleAll: () => change(chooseAllToggled(rows, chosen)),
		count: chosen.length,
		of: reach.length,
		onAll: (all) => change(all ? reach : []),
	};
}

/** A `Picked`, as a `Chooser` over the loaded `rows`. `query` is the read's query when it pages (undefined: the head tick chooses loaded ids, as `idsChooser` does) and `total` the rows it matches when known (a window), which the count and the head tick stand on; without it they stand on the loaded rows. */
export function pickChooser<Q>(
	rows: readonly TableRecord[],
	picked: Picked<Q>,
	pick: (picked: Picked<Q>) => void,
	span: { query: Q | undefined; total: number | undefined },
): Chooser {
	const { query, total } = span;
	const reach = tickable(rows).length;
	const of = total ?? reach;
	if ("ids" in picked) {
		const ids = idsChooser(rows, picked.ids, (next) => pick({ ids: next }));
		if (query === undefined) return { ...ids, of };
		const everyRow: Picked<Q> = { query, except: blockedIds(rows) };
		return {
			...ids,
			// Chosen, the head tick clears; otherwise it chooses the query.
			toggleAll: () => pick(ids.head === true ? { ids: [] } : everyRow),
			of,
			onAll: (all) => pick(all ? everyRow : { ids: [] }),
		};
	}
	const { except } = picked;
	const count = Math.max(0, of - except.length);
	return {
		ticked: (id) => !except.includes(id),
		pick: picked,
		head: count === 0 ? false : except.length === 0 ? true : "mixed",
		tick: (id, on) =>
			pick({
				query: picked.query,
				except: on ? except.filter((each) => each !== id) : [...except, id],
			}),
		tickSet: (on, off) =>
			pick({
				query: picked.query,
				except: [
					...except.filter((id) => !on.includes(id) && !off.includes(id)),
					...off,
				],
			}),
		toggleAll: () => pick({ ids: [] }),
		count,
		of,
		onAll: (all) =>
			pick(
				all ? { query: picked.query, except: blockedIds(rows) } : { ids: [] },
			),
	};
}

/** Whether `choose` is a pick over a query rather than the ids ticked. */
export function isPick<T, Q>(
	choose: TableChoice<T> | TablePick<T, Q>,
): choose is TablePick<T, Q> {
	return "picked" in choose;
}

// The reason a row's tick stands as it does, drawn under its leading cell: why
// it cannot be ticked, else why a rule moved it.
export function chooseReason(row: TableRecord): string | undefined {
	return row.blocked ?? row.moved;
}

// The columns whose values a touch row says with their column's label
// (`Staging: Passing`, `Observed: usd`): a value whose kind stands in more than
// one column of the row, since each is ambiguous among the others. Statuses
// are one kind, words (`text`, `source`, a column with no kind) another; a
// number always carries its label, a chip its own mark, an age and a change
// say what they are, and a lone value of its kind is the row's one such fact.
export function touchNamed(
	columns: readonly { key: string; kind?: string }[],
): ReadonlySet<string> {
	// The kind a column's value says by: a status, or words.
	const groupOf = (kind: string | undefined) =>
		kind === "status"
			? "status"
			: kind === undefined || kind === "text" || kind === "source"
				? "words"
				: undefined;
	const alike = (column: { kind?: string }) =>
		columns.filter((other) => groupOf(other.kind) === groupOf(column.kind))
			.length;
	return new Set(
		columns
			.filter((column) => groupOf(column.kind) && alike(column) > 1)
			.map((column) => column.key),
	);
}

// The rows a Section's head counts: its top-level rows, the things it lists,
// less those marked `counted: false` (an entry, an end, an add row, a ref that
// rejoins: rows of the sheet that are no step of it), and at any depth below
// them the rows marked `counted: true` (a step in an option's leg). A nested
// row is otherwise a part of its row, never counted.
type Counted = { counted?: boolean; children?: readonly object[] };
export function listedRows(rows: readonly object[]): readonly object[] {
	const nested = (row: object): readonly object[] =>
		((row as Counted).children ?? []).flatMap((child) => [
			...((child as Counted).counted === true ? [child] : []),
			...nested(child),
		]);
	return rows.flatMap((row) => [
		...((row as Counted).counted === false ? [] : [row]),
		...nested(row),
	]);
}

// Whether a read's own count (its top-level rows) is the head's: no row says
// otherwise.
export function ownCount(rows: readonly object[]): boolean {
	const listed = listedRows(rows);
	return (
		listed.length === rows.length && listed.every((row, at) => row === rows[at])
	);
}

// The most characters a touch row's fact holds: what a badge on the narrowest
// phone's row draws of the meta role (about 28, as "After the change: $480 a
// mont" is cut), less the room the glyphs' own widths take. A fact is a short
// thing; a longer value is a sentence, which a cut badge would hide and touch
// cannot hover to read.
export const TOUCH_FACT_FITS = 24;

// A touch row's facts and sentences from a table's values, in the order the
// line yields them: the reason a rule moved the row's tick, then each value that
// stands as a fact. A value longer than `TOUCH_FACT_FITS` is no fact: it is said
// whole in the row's `line` beside what changed (`changeMeta`), with its label,
// as a column that wraps is.
export function touchFacts(
	values: readonly string[],
	moved: string | undefined,
): { facts: string[]; said: string[] } {
	const long = (value: string) => value.length > TOUCH_FACT_FITS;
	return {
		facts: [
			...(moved === undefined ? [] : [moved]),
			...values.filter((value) => !long(value)),
		],
		said: values.filter(long),
	};
}

// Whether a slot's answer is a touch row's split: a slot that threw over the
// filler answers the record itself.
export function isTouchSplit(
	value: unknown,
): value is ReturnType<typeof touchFacts> {
	return (
		typeof value === "object" &&
		value !== null &&
		"facts" in value &&
		"said" in value
	);
}

// The share of the table's width a fractional column takes.
const FRACTION: Record<string, number> = {
	"1/4": 1 / 4,
};

const SHORT = "var(--container-measure-short)";

// The characters of a header word the short measure holds with the head's
// inset and its sort glyph; a header with a longer word asks for its own floor.
const WORD_FITS = 12;
// The characters the head's inset and sort glyph take of a column's width.
const HEAD_ROOM = MEASURE_CHARACTERS["measure-short"] - WORD_FITS;

// A column of figures (a number, an age) holds a few characters, so with no
// `width` of its own it stands at half the short measure where a word-valued
// column shares what the others leave (and never less than the short measure).
// An age holds the longest relative word the language has, in characters
// (`ageLongest`), with the cell's inset, so no age is cut at any size.
const FIGURE_KINDS: readonly (string | undefined)[] = ["number", "age"];
const FIGURE_WIDTH = `calc(${SHORT} / 2)`;
const CELL_INSET = "2 * var(--spacing-pad) + 2 * var(--spacing-hairline)";

// A column of one word, a chip or a status, with no `width` of its own stands
// at the short measure, so it does not take the share a column of free text does.
const WORD_KINDS: readonly (string | undefined)[] = ["chip", "status"];

/** The width a column stands at when its kind gives it one: a figure column with no `width` (an age at the characters of its longest word, `age`). Others take their `width` or share the room. */
export function figureWidth(
	column: Pick<TableColumn, "width" | "kind">,
	age: number,
): string | undefined {
	if (column.width !== undefined) return undefined;
	if (column.kind === "age") return `calc(${age}ch + ${CELL_INSET})`;
	return FIGURE_KINDS.includes(column.kind) ? FIGURE_WIDTH : undefined;
}

/** The width a column asks of the grid: its own, or the short measure for a column of one word (a chip, a status); none shares what the others leave. */
export function columnWidth(
	column: Pick<TableColumn, "width" | "kind">,
): NonNullable<TableColumn["width"]> | undefined {
	if (column.width !== undefined) return column.width;
	return WORD_KINDS.includes(column.kind) ? "measure-short" : undefined;
}

// A column's floor, as a CSS length: the short measure (half of it for a
// figure column with no `width`, `figureWidth`), or, where its header has a
// word that measure cannot hold, the room that word takes (a character is the
// head's `ch`, one over for the glyphs' rounding) with the head's inset on
// both sides and its sort glyph. A header wraps between words, so only its
// longest word sets the floor, and a longer word is never cut.
export function columnFloor(
	column: Pick<TableColumn, "label"> &
		Partial<Pick<TableColumn, "width" | "kind">>,
	age: number,
): string {
	const figure = figureWidth(column, age);
	const fits = !figure
		? WORD_FITS
		: (column.kind === "age" ? age : MEASURE_CHARACTERS["measure-short"] / 2) -
			HEAD_ROOM;
	const base = figure ?? SHORT;
	const word = Math.max(
		0,
		...column.label.split(/\s+/).map((part) => part.length),
	);
	return word > fits
		? `max(${base}, calc(${word + 1}ch + 2 * var(--spacing-pad) + var(--spacing-control)))`
		: base;
}

// The least width a grid stands at, as a CSS length, so its columns never
// squeeze below their floor and the scroller takes the rest: the columns that
// keep a measure (a column with none is at the short one, a figure column at
// half of it, or at its header's longest word where that is wider,
// `columnFloor`), the tick column when the table chooses rows, a target for
// each icon of the acts column, and the fractions' complement of what is left,
// so a fractional column stands at its share of the whole. The fractions are
// plain numbers, so the division is valid CSS; fractions that fill the table
// leave nothing to divide and the sum stands as it is.
export function gridFloor(
	columns: readonly (Pick<TableColumn, "label"> &
		Partial<Pick<TableColumn, "width" | "kind">>)[],
	choosing: boolean,
	acts: number,
	age: number,
): string {
	const parts = choosing ? ["var(--spacing-target)"] : [];
	// The acts column at the end: a target for each icon it holds.
	if (acts > 0) parts.push(`var(--spacing-target) * ${acts}`);
	let fractions = 0;
	for (const column of columns) {
		const { width } = column;
		if (width !== undefined && width in FRACTION) {
			fractions += FRACTION[width] as number;
		} else {
			parts.push(columnFloor(column, age));
		}
	}
	const sum = parts.length ? parts.join(" + ") : "0px";
	const left = Number((1 - fractions).toFixed(6));
	return fractions > 0 && left > 0
		? `calc((${sum}) / ${left})`
		: `calc(${sum})`;
}

// A table with this many columns, or any column that starts `hidden`, draws a
// columns menu in its head; fewer fit the page and have nothing to hide.
export const COLUMNS_MENU_FROM = 8;

// The viewer's say over the columns, by key: `true` shows a column, `false`
// hides it. A column the viewer has not decided stands as its own `hidden`
// declares, so a column the consumer adds later takes its default.
export type ColumnChoice = Readonly<Record<string, boolean>>;

/** Whether a table draws a columns menu. */
export function hideable(
	columns: readonly Pick<TableColumn, "hidden">[],
): boolean {
	return (
		columns.length >= COLUMNS_MENU_FROM ||
		columns.some((column) => column.hidden === true)
	);
}

/** Where a table keeps the viewer's columns: its name, so it stays put as the viewer opens a record under it and when a column is added; a table the app has not given a name is keyed by its columns' keys, sorted, so it still has its own. */
export function columnsKey(
	columns: readonly Pick<TableColumn, "key">[],
	label: string | undefined,
): string {
	if (label !== undefined) return `stack.table.columns:${label}`;
	let hash = 5381;
	for (const char of columns
		.map((column) => column.key)
		.sort()
		.join(","))
		hash = (hash * 33) ^ char.charCodeAt(0);
	return `stack.table.columns:#${(hash >>> 0).toString(36)}`;
}

/** Whether the viewer's choice stands apart from the columns' own `hidden`. */
export function columnsChanged(
	columns: readonly Pick<TableColumn, "key" | "hidden">[],
	choice: ColumnChoice,
): boolean {
	return columns.some(
		(column, place) =>
			columnShown(column, place, choice) !== (column.hidden !== true),
	);
}

/** The viewer's choice as stored text holds it; anything that is not a record of booleans is no choice. */
export function parseColumnChoice(raw: string | null): ColumnChoice {
	try {
		const value: unknown = JSON.parse(raw ?? "null");
		if (typeof value !== "object" || value === null || Array.isArray(value))
			return {};
		return Object.fromEntries(
			Object.entries(value).filter(
				(entry): entry is [string, boolean] => typeof entry[1] === "boolean",
			),
		);
	} catch {
		return {};
	}
}

/** Whether the column at `place` stands: the leading column, the row's name, always does. */
export function columnShown(
	column: Pick<TableColumn, "key" | "hidden">,
	place: number,
	choice: ColumnChoice,
): boolean {
	return place === 0 || (choice[column.key] ?? column.hidden !== true);
}

/** The columns that stand, in order. */
export function visibleColumns<C extends Pick<TableColumn, "key" | "hidden">>(
	columns: readonly C[],
	choice: ColumnChoice,
): readonly C[] {
	return columns.some((column, place) => !columnShown(column, place, choice))
		? columns.filter((column, place) => columnShown(column, place, choice))
		: columns;
}

// A cell cursor's place: a row and a column (the tick column, when the table
// chooses rows, is column 0).
export interface Cursor {
	row: number;
	column: number;
}

/** The rows a view holds less one, which PageUp and PageDown move by so the row last in view leads the next: `view` and `row` are heights. */
export function pageRows(view: number, row: number): number {
	return row > 0 ? Math.max(1, Math.floor(view / row) - 1) : 1;
}

/** Whether the key moves along the rows (the keys a held Shift extends the ticks along). */
export function alongRows(key: string): boolean {
	return (
		key === "ArrowUp" ||
		key === "ArrowDown" ||
		key === "PageUp" ||
		key === "PageDown"
	);
}

/** Where a grid's key takes the cell cursor, `undefined` for a key that is not a move: the arrows by a cell, Home and End along the row (with Ctrl, to the first and last cell of the grid), PageUp and PageDown by `page` rows. It stops at the edges. */
export function moveCursor(
	key: string,
	at: Cursor,
	ctrl: boolean,
	bounds: { rows: number; columns: number; page: number },
): Cursor | undefined {
	const { row, column } = at;
	const lastRow = Math.max(bounds.rows - 1, 0);
	const lastColumn = Math.max(bounds.columns - 1, 0);
	switch (key) {
		case "ArrowRight":
			return { row, column: Math.min(column + 1, lastColumn) };
		case "ArrowLeft":
			return { row, column: Math.max(column - 1, 0) };
		case "ArrowDown":
			return { row: Math.min(row + 1, lastRow), column };
		case "ArrowUp":
			return { row: Math.max(row - 1, 0), column };
		case "PageDown":
			return { row: Math.min(row + bounds.page, lastRow), column };
		case "PageUp":
			return { row: Math.max(row - bounds.page, 0), column };
		case "Home":
			return ctrl ? { row: 0, column: 0 } : { row, column: 0 };
		case "End":
			return ctrl
				? { row: lastRow, column: lastColumn }
				: { row, column: lastColumn };
		default:
			return undefined;
	}
}

/** The ids of the rows that can be ticked between two places, either way round and inclusive; a place with no row loaded (a window's page not here yet) is passed over. */
export function rangeIds(
	rows: readonly (TableRecord | undefined)[],
	from: number,
	to: number,
): string[] {
	const ids: string[] = [];
	for (let at = Math.min(from, to); at <= Math.max(from, to); at++) {
		const row = rows[at];
		if (row && row.blocked === undefined) ids.push(row.id);
	}
	return ids;
}

// How a table's sort stands: the column and the way round it turns.
export interface Sort {
	key: string;
	direction: "descending" | "ascending";
}

// What a cell reads as: a status its word, an age its distance from now
// (`age`, the platform's own words for it).
export function shown(
	column: TableColumn,
	cell: TableCell | undefined,
	age: (moment: string) => string,
): string {
	if (cell === null || cell === undefined) return "";
	if (isChangeCell(cell)) return cell.after ?? "";
	if (typeof cell === "object") return cell.label ?? "";
	if (column.kind === "age") return age(String(cell));
	return String(cell);
}

// What a cell sorts by: a number or a moment as itself, anything else as the
// text it reads as; an empty cell as "".
export function order(
	column: TableColumn,
	cell: TableCell | undefined,
): number | string {
	if (cell === null || cell === undefined) return "";
	if (typeof cell === "number") return cell;
	if (isChangeCell(cell)) return cell.after ?? "";
	if (typeof cell === "object")
		return "tone" in cell ? (cell.label ?? cell.tone) : cell.label;
	if (column.kind === "age") return Date.parse(cell);
	return cell;
}

// How much a status asks of the viewer, the mildest first: what is done or
// live asks nothing, what has not started waits, and what waits on someone, needs
// a look or failed asks more in turn. `TONES` lists the states, not
// their weight, so a status column sorts by this and then by its label.
const STATUS_SEVERITY: Record<Tone, number> = {
	done: 0,
	active: 1,
	running: 2,
	idle: 3,
	waiting: 4,
	attention: 5,
	failed: 6,
};

// Rows by the sorted column, an empty cell last either way. A status cell sorts
// by its state's severity (ascending the mildest first, descending the worst),
// then by its label, so "Untested", "11 failing" and "6 passing" are ordered by
// what they say and "6 failing" stands before "11 failing".
export function sorted(
	rows: readonly TableRecord[],
	columns: readonly TableColumn[],
	sort: Sort | undefined,
): readonly TableRecord[] {
	const column = columns.find((c) => c.key === sort?.key);
	if (!sort || !column) return rows;
	const sign = sort.direction === "ascending" ? 1 : -1;
	return [...rows].sort((a, b) => {
		const x = order(column, a.cells[column.key]);
		const y = order(column, b.cells[column.key]);
		if (x === "" || y === "") return x === y ? 0 : x === "" ? 1 : -1;
		const [left, right] = [a.cells[column.key], b.cells[column.key]];
		if (isStatusCell(left) && isStatusCell(right)) {
			const apart = STATUS_SEVERITY[left.tone] - STATUS_SEVERITY[right.tone];
			if (apart !== 0) return apart * sign;
		}
		if (typeof x === "number" && typeof y === "number") return (x - y) * sign;
		return (
			String(x).localeCompare(String(y), undefined, { numeric: true }) * sign
		);
	});
}

// What a change cell is: both values, a value added (no before) or removed (no
// after); none when it holds neither, drawing nothing.
export type ChangeCellKind = Exclude<ChangeKind, "unchanged" | "stale">;

// A table cell that holds a change (the object with a `before`).
export function isChangeCell(cell: TableCell | undefined): cell is ChangeCell {
	return typeof cell === "object" && cell !== null && "before" in cell;
}

// A `chip` column's cell as a chip: a string on the column's family, a chip
// mark on its own; none when the cell is empty.
export function chipOf(
	column: Extract<TableColumn, { kind: "chip" }>,
	cell: TableCell | undefined,
): ChipMark | undefined {
	if (typeof cell === "string") return { family: column.family, label: cell };
	if (typeof cell === "object" && cell !== null && "family" in cell)
		return cell;
	return undefined;
}

// A table cell that holds a status (the object with a `state`).
export function isStatusCell(cell: TableCell | undefined): cell is StatusMark {
	return typeof cell === "object" && cell !== null && "tone" in cell;
}

export function changeKind(cell: ChangeCell): ChangeCellKind | undefined {
	if (cell.before !== null && cell.after !== null) return "changed";
	if (cell.after !== null) return "added";
	if (cell.before !== null) return "removed";
	return undefined;
}

// A change cell as a touch row's meta part: "X → Y", or the word added or
// removed before the one value it holds.
export function changeMeta(
	cell: ChangeCell,
	words: Pick<Words, "added" | "removed">,
): string {
	switch (changeKind(cell)) {
		case "changed":
			return `${cell.before} → ${cell.after}`;
		case "added":
			return `${words.added} ${cell.after}`;
		case "removed":
			return `${words.removed} ${cell.before}`;
		default:
			return "";
	}
}

// A change mark's glyph by kind: drawn, and named by the kind's own word. A
// glyph means one thing, so none is an act's or a state's: `added` and
// `removed` are the boxed plus and minus a diff's file marks are, never the
// bare plus of an add act standing on the same screen, nor a circle that
// reads as a picked radio beside a verb's class.
export const CHANGE_GLYPH: Readonly<Record<ChangeKind, IconName>> = {
	added: "SquarePlus",
	changed: "PencilLine",
	removed: "SquareMinus",
	unchanged: "Equal",
	stale: "History",
};

// Whether a sheet's rows are facts alone: every row names what it is in the
// label column (a definition list). A count is a list's, the things it
// holds, so a Section of facts draws none beside its title. Both platforms
// read it.
export function factsOnly(rows: readonly object[]): boolean {
	return (
		rows.length > 0 &&
		rows.every((row) => "label" in row && row.label !== undefined)
	);
}

// The back act's glyph, on every platform and at every density. A chevron
// says "opens here" and an arrow "leads elsewhere", so the way back is the
// arrow: a back chevron would say a second thing with the fold's glyph.
export const BACK_GLYPH: IconName = "ArrowLeft";

export type MeterLevel = "under" | "near" | "over" | "met";

// The level a share of the max stands at: past the max over, from `near` near
// (`METER_NEAR`, or a meter's own mark), else under. A meter of a goal (tests
// passing of all of them) reads the other way: full is `met`, the good tone,
// and anything short of it is `under`, the neutral one, never near or over,
// since more of a goal is never a warning. Both platforms read it, so one meter
// draws one level.
export function levelOf(
	share: number,
	near: number = METER_NEAR,
	goal = false,
): MeterLevel {
	if (goal) return share >= 1 ? "met" : "under";
	if (share > 1) return "over";
	if (share >= near) return "near";
	return "under";
}

// The state of a step counted from one when the flow stands at `at`. Both
// platforms read it, so one step count draws one state per segment.
export function stepStateOf(step: number, at: number): StepState {
	if (step < at) return "done";
	if (step === at) return "current";
	return "later";
}

// The stages a rail draws: all of them, or, once the rail has ended, those up
// to the last done one (every stage after it gives way to the terminal row).
// Both platforms read it, so one rail draws the same rows.
export function stagesShown<T extends { state: string }>(
	steps: readonly T[],
	ended: boolean,
): readonly T[] {
	if (!ended) return steps;
	let last = steps.length;
	while (last > 0 && steps[last - 1]?.state !== "done") last--;
	return steps.slice(0, last);
}

// The characters a file name keeps at its start and before its extension.
const NAME_LEAD = 3;

// The room a file row's directory keeps beside the name's floor: two
// characters, its first and the ellipsis after it ("d…"). The engine keeps a
// cut box's first character before the ellipsis, so a one-character box draws
// a clipped sliver of the next glyph and no ellipsis; two read as cut. Both
// platforms add it to the path's floor when the path has a directory.
export const DIRECTORY_LEAD = 2;

// A file row's name, cut: its end (`tail`, never cut) is the extension and the
// NAME_LEAD characters before it (twice that without an extension), but its
// stem keeps its first NAME_LEAD characters, so a short name never loses its
// start. `floor` is the least characters the path shows of the name: the whole
// name when it is short, else its cut form (the lead, an ellipsis, the tail).
// The name is the path after its last slash; the slash stays with the
// directory, so a path whose directory has given way draws none. Both
// platforms read it, so one name cuts the same way.
export function pathCut(name: string): {
	stem: string;
	tail: string;
	floor: number;
} {
	const dot = name.lastIndexOf(".");
	const kept = dot > 0 ? name.length - dot + NAME_LEAD : NAME_LEAD * 2;
	const cut =
		name.length - Math.max(0, Math.min(kept, name.length - NAME_LEAD));
	return {
		stem: name.slice(0, cut),
		tail: name.slice(cut),
		floor: Math.min(name.length, NAME_LEAD + 1 + kept),
	};
}

/** The direction a column sorts in first: words from A, figures and ages largest and newest first. */
export function firstDirection(
	column: Pick<TableColumn, "kind">,
): Sort["direction"] {
	return FIGURE_KINDS.includes(column.kind) ? "descending" : "ascending";
}

/** The direction opposite to `direction`. */
export const turnedOver = (direction: Sort["direction"]): Sort["direction"] =>
	direction === "ascending" ? "descending" : "ascending";

/** A header pressed again turns its sort over, then off; another column sorts in its first direction. */
export function nextSort(
	sort: Sort | undefined,
	column: Pick<TableColumn, "key" | "kind">,
): Sort | undefined {
	const { key } = column;
	const first = firstDirection(column);
	if (sort?.key !== key) return { key, direction: first };
	return sort.direction === first
		? { key, direction: turnedOver(first) }
		: undefined;
}

/** Whether a column's cells stand at the end of their box: a number's do. */
export const isEnd = (column: TableColumn) => column.kind === "number";

/** Whether a row's title is a status (its dot and word). */
export function isStatus(value: RowTitle | undefined): value is StatusMark {
	return typeof value === "object" && value !== null && "tone" in value;
}

// ── Facts ──────────────────────────────────────────────────────────────
// A list of facts (`Fact`) is told apart by the keys its members carry. These
// are the one reading of it; a component's drawing takes its facts through
// `splitFacts`, which hands the kinds apart in the order each draws them.

const keyed = (fact: unknown, ...keys: string[]): boolean =>
	typeof fact === "object" &&
	fact !== null &&
	!Array.isArray(fact) &&
	keys.some((key) => key in fact);

/** Whether a fact is a status: `{ tone, label? }`. */
export const isStatusFact = (fact: unknown): fact is StatusMark =>
	keyed(fact, "tone");

/** Whether a fact is what is wrong: `{ warning }`. */
export const isWarningFact = (fact: unknown): fact is { warning: string } =>
	keyed(fact, "warning");

/** Whether a fact is a chip: `{ family, label }`. */
export const isChipFact = (fact: unknown): fact is ChipMark =>
	keyed(fact, "family") && keyed(fact, "label");

/** Whether a fact is a boolean mark: a `ring` or a `flag`. */
export const isMarkFact = (fact: unknown): fact is RowMark =>
	keyed(fact, "ring", "flag");

/** A list of facts by kind: its status (the first one, which leads the line and takes the row's lock after it; a further status is a badge in the list's own order), its warnings, chips and boolean marks in the order given, and its words, each one fact. */
export interface FactParts {
	status: StatusMark | undefined;
	warnings: string[];
	chips: ChipMark[];
	marks: RowMark[];
	words: Run[];
}

/** A list of facts by kind. A member that is none of the marks is words (a placeholder too, which a painted list counts as one filler); an absent member says nothing. */
export function splitFacts(facts: readonly unknown[] | undefined): FactParts {
	const parts: FactParts = {
		status: undefined,
		warnings: [],
		chips: [],
		marks: [],
		words: [],
	};
	for (const fact of facts ?? []) {
		if (fact === undefined || fact === null || fact === false) continue;
		if (isStatusFact(fact)) parts.status ??= fact;
		else if (isWarningFact(fact)) parts.warnings.push(fact.warning);
		else if (isChipFact(fact)) parts.chips.push(fact);
		else if (isMarkFact(fact)) parts.marks.push(fact);
		else parts.words.push(fact as Run);
	}
	return parts;
}
