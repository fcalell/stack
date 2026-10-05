// The decisions a collection (a `List`, a `Table`, an `OptionList`), the
// `Section` around it, and the Meter, StepCount and Stages states make before
// they draw, free of any framework: both platforms run this one source, and it
// is tested without rendering.

import type {
	ChangeCell,
	ChangeKind,
	IconName,
	Option,
	OptionGroup,
	Route,
	StatusCell,
	StepState,
	TableCell,
	TableChoice,
	TableColumn,
	TableRowSlots,
} from "./descriptors.ts";
import { filled, METER_NEAR, type Words } from "./tokens.ts";
import type { RowGround } from "./variants.ts";

export type ListState = "pending" | "failed" | "missing" | "empty" | "loaded";

export interface ListInput {
	query?: {
		isPending: boolean;
		isError: boolean;
		error?: unknown;
		data: readonly unknown[] | undefined;
	};
	items?: readonly unknown[];
	// The items are on their way (a compound body's loading form).
	loading?: boolean;
	// A loading Section around the list waits.
	sectionLoading: boolean;
	// A Section around the list takes its busy state.
	inSection: boolean;
	// The list has an empty form to draw.
	hasEmpty: boolean;
}

// The list's own items wait: its query is pending or `loading` is set. A
// Section around registers it as a waiter.
export function listWaits(input: ListInput): boolean {
	return input.query?.isPending === true || input.loading === true;
}

// A failed read whose answer is that the thing does not exist: its error
// carries the code stack's procedures throw (`ORPCError("NOT_FOUND")`) or an
// HTTP 404, read by shape so no client library is imported.
export function missing(query: { error?: unknown }): boolean {
	const { error } = query;
	if (typeof error !== "object" || error === null) return false;
	return (
		("code" in error && error.code === "NOT_FOUND") ||
		("status" in error && error.status === 404)
	);
}

// What a QueryBoundary draws once no query waits: missing when every failed
// query answers not found, failed when any fails otherwise, else its body.
export function boundaryState(
	queries: readonly { isError: boolean; error?: unknown }[],
): "failed" | "missing" | "loaded" {
	const failed = queries.filter((query) => query.isError);
	if (failed.length === 0) return "loaded";
	return failed.every(missing) ? "missing" : "failed";
}

// Pending while its own items wait or a loading Section waits; missing when
// its query answers not found, failed when it fails otherwise; empty when no
// item answers and an empty form is given; else loaded (no item and no empty
// form draws none).
export function listState(input: ListInput): ListState {
	if (listWaits(input) || input.sectionLoading) return "pending";
	if (input.query?.isError) return missing(input.query) ? "missing" : "failed";
	const items = input.query ? input.query.data : input.items;
	if (!items?.length && input.hasEmpty) return "empty";
	return "loaded";
}

// The item count a list reports to the Section around it: its items' length
// once they answer, none while they wait or once its query fails or answers
// not found.
export function listCount(input: ListInput): number | undefined {
	const state = listState(input);
	if (state === "pending" || state === "failed" || state === "missing")
		return undefined;
	return (input.query ? input.query.data : input.items)?.length ?? 0;
}

// Busy while its own items wait outside a Section; in one, the Section is
// busy once.
export function listBusy(input: ListInput): boolean {
	return listWaits(input) && !input.inSection;
}

// The failed form's Retry: it refetches the query.
export function retryOf(query: { refetch: () => unknown }): () => void {
	return () => {
		query.refetch();
	};
}

// What a list's rows stand on: in a `Group`, the card (at the card's inset,
// the group's hairline once between them, the card their box and the frame
// of its failed and empty forms); anywhere else the list ground, in the
// list's own box.
export function listGround(inGroup: boolean): RowGround {
	return inGroup ? "group" : "list";
}

// What a waiting `Group` draws: the waiting rows of the Lists it holds
// (however deep), each in the slots its map declares; with no List, setting
// row skeletons in place of its static rows.
export function groupWait(lists: number): "rows" | "settings" {
	return lists > 0 ? "rows" : "settings";
}

// The kind of mark every row of a list leads with.
export type LeadingKind = "avatar" | "icon" | "status" | "check";

// The slots a waiting ListRow draws, known before any item: its change mark's
// lane, a tree's fold lane, its leading mark by kind, a meta line (at a chip's height when a chip may stand on it, the
// marks' bar at its end when a status, a warning, a lock or a chip may), an entry's field and
// button in the meta line's place (it wins over the meta line), a labelled act
// at the row's end, a trailing value, and the more act's room, kept empty. A
// step list is a meta line while it waits (the steps draw once an act pends,
// which no waiting row has), and a `wrap` list's waiting row draws its
// one-line form (one body line in the title's place, its leading, trailing and
// acts on it), the row it loads into when the title fits a line.
export interface RowShape {
	wrap: boolean;
	tree: boolean;
	change: boolean;
	leading: LeadingKind | null;
	meta: boolean;
	chip: boolean;
	marks: boolean;
	entry: boolean;
	act: boolean;
	trailing: boolean;
	more: boolean;
}

// A `leading` slot: one of its keys holds the item's mark.
type LeadingKeys = {
	avatar?: unknown;
	icon?: unknown;
	status?: unknown;
	check?: unknown;
};

// The kind a `leading` slot declares by its one key.
function leadingKind(leading: LeadingKeys | undefined): LeadingKind | null {
	if (leading === undefined) return null;
	if (leading.avatar !== undefined) return "avatar";
	if (leading.icon !== undefined) return "icon";
	if (leading.check !== undefined) return "check";
	return "status";
}

// The waiting row's shape from the slots a `row` map declares, read by key:
// no slot function runs.
export function rowShape(slots: {
	wrap?: boolean;
	children?: unknown;
	change?: unknown;
	leading?: LeadingKeys;
	meta?: unknown;
	steps?: unknown;
	status?: unknown;
	warning?: unknown;
	lock?: unknown;
	chip?: unknown;
	entry?: unknown;
	act?: unknown;
	trailing?: unknown;
	more?: unknown;
}): RowShape {
	const marks =
		slots.status !== undefined ||
		slots.warning !== undefined ||
		slots.lock !== undefined ||
		slots.chip !== undefined;
	return {
		wrap: slots.wrap === true,
		tree: slots.children !== undefined,
		change: slots.change !== undefined,
		leading: leadingKind(slots.leading),
		meta: slots.meta !== undefined || slots.steps !== undefined || marks,
		chip: slots.chip !== undefined,
		marks,
		entry: slots.entry !== undefined,
		act: slots.act !== undefined,
		trailing: slots.trailing !== undefined,
		more: slots.more !== undefined,
	};
}

// The depths a waiting tree's rows stand at, in order (a root, a level in,
// then two levels in): the rails the waiting rows draw, so the text of each
// starts about where a loaded tree's rows do; the data's own depths are
// unknown while it waits.
const WAITING_DEPTHS = [0, 1, 2, 2] as const;

// The depth of the `index`th waiting row of a tree.
export function waitingDepth(index: number): number {
	return WAITING_DEPTHS[index % WAITING_DEPTHS.length] ?? 0;
}

// One row of a tree as the list draws it: its item at a depth (the roots at
// 0), whether it has children to fold, and whether they are drawn.
export interface TreeRow<T> {
	item: T;
	key: string;
	depth: number;
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
		for (const item of level) {
			const key = slots.key(item);
			const below = slots.children(item) ?? [];
			const open = !folded.includes(key);
			rows.push({ item, key, depth, branch: below.length > 0, open });
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

// The slots a waiting FileRow draws beyond its glyph, path and counts, known
// before any item: the change mark's lane before the glyph, a chip's bar
// between the path and the counts.
export interface FileShape {
	change: boolean;
	chip: boolean;
}

// The waiting file row's shape from the slots a `file` map declares, read by
// key: no slot function runs.
export function fileShape(slots: {
	change?: unknown;
	chip?: unknown;
}): FileShape {
	return { change: slots.change !== undefined, chip: slots.chip !== undefined };
}

// What stands at the end of a waiting definition row: nothing, the act's
// square (an icon act or the copy act), a link's chevron square, or, in a
// waiting Group's setting row, the switch's hit box.
export type DefinitionEnd = "none" | "act" | "chevron" | "switch";

// The slots a waiting DefinitionRow draws beyond its label bar, known before
// any item: the change mark's lane, a meta line under the label (a
// description, or a locked row's reason; the value bar moves to it), and
// what stands at the row's end.
export interface DefinitionShape {
	change: boolean;
	description: boolean;
	end: DefinitionEnd;
}

// The waiting definition row's shape from the slots a `definition` map
// declares, read by key: no slot function runs. `copyable` is one value for
// the list, so it keeps the act's square on every row.
export function definitionShape(slots: {
	change?: unknown;
	description?: unknown;
	locked?: unknown;
	copyable?: boolean;
	act?: unknown;
	href?: unknown;
	onOpen?: unknown;
}): DefinitionShape {
	let end: DefinitionEnd = "none";
	if (slots.act !== undefined || slots.copyable === true) end = "act";
	else if (slots.href !== undefined || slots.onOpen !== undefined)
		end = "chevron";
	return {
		change: slots.change !== undefined,
		description: slots.description !== undefined || slots.locked !== undefined,
		end,
	};
}

// The line a waiting figure or bar draws under it, known before any data: the
// slot declared, `counts` (a link's target box, the taller) over `meta` (one
// meta line), or none.
export type WaitLine = "none" | "meta" | "counts";

// The waiting line from the slots declared, read by key: no slot function
// runs.
export function waitLine(slots: {
	meta?: unknown;
	counts?: unknown;
}): WaitLine {
	if (slots.counts !== undefined) return "counts";
	return slots.meta !== undefined ? "meta" : "none";
}

// The slots a waiting Meter draws, known before any item: the label, share
// and bar always, the line under the bar when the `meter` map declares `meta`
// or `counts`.
export interface MeterShape {
	line: WaitLine;
}

// The waiting meter's shape from the slots a `meter` map declares.
export function meterShape(slots: {
	meta?: unknown;
	counts?: unknown;
}): MeterShape {
	return { line: waitLine(slots) };
}

// The bars a waiting Comparison's fact draws, known before any item: one
// value bar per declared column, a chips bar when its `row` map declares
// chips, and a status bar when it declares `status`.
export interface FactShape {
	values: number;
	chips: boolean;
	status: boolean;
}

// The waiting fact's shape from the declared columns and the `row` map's
// slots, read by key: no slot function runs.
export function factShape(
	columns: readonly string[],
	slots: { chips?: unknown; status?: unknown },
): FactShape {
	return {
		values: columns.length,
		chips: slots.chips !== undefined,
		status: slots.status !== undefined,
	};
}

// The count a Section shows: its own `count` when it has one (a total its
// lists do not hold), else its lists' total once every list has answered (a
// list still waiting, failed or missing gives none), else none; an empty collection
// shows none, its empty state saying so.
export function sectionCount(
	own: number | undefined,
	lists: readonly (number | undefined)[],
): number | undefined {
	if (own !== undefined) return own === 0 ? undefined : own;
	if (lists.length === 0) return undefined;
	let total = 0;
	for (const value of lists) {
		if (value === undefined) return undefined;
		total += value;
	}
	return total === 0 ? undefined : total;
}

// What a Section reads off its body in render, by the depth rule: the
// collections standing as its direct children, inside a direct Group, or as
// a direct QueryBoundary's props. Nothing deeper registers or is read.
export interface SectionParts {
	// Each List or Table: it waits, and it counts and is a body of rows unless
	// `definition` is set (its `definition` map is given). A List of facts is
	// no collection a viewer counts: it waits alone, like a chart.
	lists: readonly (Pick<ListInput, "query" | "items" | "loading"> & {
		definition?: boolean;
	})[];
	// Each other waiter: a QueryBoundary's queries, a BarChart's or a
	// Comparison's own items, whether they wait.
	waits: readonly boolean[];
	// Each Group, a body of rows with or without a List of its own.
	groups: number;
	// Each FormField.
	fields: number;
}

export interface SectionState {
	// The head is busy: the Section loads or any part of its body waits.
	busy: boolean;
	// The head has a count to show or to wait as.
	counted: boolean;
	// The count shown (`sectionCount`).
	count: number | undefined;
	// How many skeleton fields stand in for the body.
	fields: number;
}

// A loading body of fields waits as one skeleton per field, or as three
// when it holds none (content other than fields).
const FALLBACK_FIELDS = 3;

// The Section's head and loading body, decided from its own props and the
// parts its body holds: busy while it loads or a part waits; its own count,
// else the total of its lists that are no `definition` list, once each
// answers; and, while it loads with no body of rows (which waits as its own
// skeleton rows), one skeleton field per field, or three.
export function sectionState(
	parts: SectionParts,
	own: { count?: number; loading?: boolean },
): SectionState {
	const loading = own.loading === true;
	const inputOf = (list: SectionParts["lists"][number]): ListInput => ({
		query: list.query,
		items: list.items,
		loading: list.loading,
		sectionLoading: loading,
		inSection: true,
		hasEmpty: false,
	});
	const counting = parts.lists.filter((list) => !list.definition);
	const rows = counting.length + parts.groups;
	return {
		busy:
			loading ||
			parts.lists.some((list) => listWaits(inputOf(list))) ||
			parts.waits.some(Boolean),
		counted: own.count !== undefined || counting.length > 0,
		count: sectionCount(
			own.count,
			counting.map((list) => listCount(inputOf(list))),
		),
		fields: !loading || rows > 0 ? 0 : parts.fields || FALLBACK_FIELDS,
	};
}

// The slots a waiting OptionList's check rows draw, known before any option:
// a description bar under each label, and a group label's bar over the rows.
export interface OptionShape {
	description: boolean;
	group: boolean;
}

// A query's waiting rows from the slots its `option` map declares, read by
// key: no slot function runs.
export function optionShape(slots: {
	description?: unknown;
	group?: unknown;
}): OptionShape {
	return {
		description: slots.description !== undefined,
		group: slots.group !== undefined,
	};
}

// A static set's waiting rows from the options it holds: grouped ones draw a
// group label's bar, a described one a description bar under every label.
export function optionsShape(
	options: readonly Option<string>[] | readonly OptionGroup<string>[],
): OptionShape {
	const groups = isGrouped(options) ? options : [{ options }];
	return {
		description: groups.some((group) =>
			group.options.some((option) => option.description !== undefined),
		),
		group: isGrouped(options),
	};
}

function isGrouped(
	options: readonly Option<string>[] | readonly OptionGroup<string>[],
): options is readonly OptionGroup<string>[] {
	const first = options[0];
	return first !== undefined && "options" in first;
}

// One function per check row slot, each called with a loaded item; `group`
// is the label the option stands under.
export interface OptionSlots<T, V extends string> {
	value: (item: T) => V;
	label: (item: T) => string;
	description?: (item: T) => string | undefined;
	recommended?: (item: T) => boolean | undefined;
	group?: (item: T) => string;
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
		const description = slots.description?.(item);
		if (description !== undefined) option.description = description;
		if (slots.recommended?.(item)) option.recommended = true;
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

// An OptionList's one choice: radio rows, read aloud as a radiogroup.
export interface OneChoice<V extends string> {
	// The chosen option's value; null before one is chosen.
	value: V | null;
	// Hears the option chosen.
	onChange: (value: V) => void;
}

// An OptionList's several choices: check rows, each toggling the set.
export interface SetChoice<V extends string> {
	// The chosen options' values.
	value: readonly V[];
	// Hears the whole chosen set after a toggle.
	onChange: (value: V[]) => void;
}

// An OptionList's choice in either form.
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

// A pending Thread's turns, in order: each author is the item's, unknown
// before the data, so the wait is a fixed exchange (another's reply, yours,
// another's reply).
export const WAITING_MESSAGES = [
	{ key: 0, author: "other" },
	{ key: 1, author: "you" },
	{ key: 2, author: "other" },
] as const;

// One table row as both of its forms draw it: its own slots and each
// column's cell by key, read from its item once.
export interface TableRecord {
	id: string;
	href: Route | undefined;
	locked: readonly string[] | undefined;
	warning: string | undefined;
	change: ChangeKind | undefined;
	blocked: string | undefined;
	moved: string | undefined;
	cells: Readonly<Record<string, TableCell>>;
}

// The Table's rows: each item through the row map, every column's `cell` and
// the reasons its choice gives.
export function tableRecords<T>(
	items: readonly T[],
	columns: readonly TableColumn<T>[],
	row: TableRowSlots<T>,
	choose?: TableChoice<T>,
): TableRecord[] {
	return items.map((item) => ({
		id: row.id(item),
		href: row.href?.(item),
		locked: row.locked?.(item),
		warning: row.warning?.(item),
		change: row.change?.(item),
		blocked: choose?.blocked?.(item),
		moved: choose?.moved?.(item),
		cells: Object.fromEntries(
			columns.map((column) => [column.key, column.cell(item)]),
		),
	}));
}

// The edit a cell takes: its column's, in a table that edits, never the
// leading column's, nor a column locked whole, nor a column its row locks.
export function cellEdit(
	column: TableColumn,
	leading: boolean,
	edits: boolean,
	row: TableRecord,
): TableColumn["edit"] {
	if (!edits || leading || column.locked !== undefined) return undefined;
	if (row.locked?.includes(column.key)) return undefined;
	return column.edit;
}

// A cell its row locks that its column would edit: it draws the lock (a
// locked column draws it in its head alone).
export function cellLocked(
	column: TableColumn,
	leading: boolean,
	edits: boolean,
	row: TableRecord,
): boolean {
	if (!edits || leading || column.locked !== undefined) return false;
	return column.edit !== undefined && row.locked?.includes(column.key) === true;
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

// The reason a row's tick stands as it does, drawn under its leading cell: why
// it cannot be ticked, else why a rule moved it.
export function chooseReason(row: TableRecord): string | undefined {
	return row.blocked ?? row.moved;
}

// A touch row's meta parts from a table's values, in the order the line yields
// them: the lead part, which truncates last, then the other values. The lead
// is the change value (what a change table is read for) with the reason a rule
// moved the row's tick after it, joined by a middle dot as the platforms'
// `joinParts` does, so the reason is the tail of the one span that yields last
// and the change value stays whole ahead of it.
export function touchMeta(
	values: readonly { changed: boolean; part: string }[],
	moved: string | undefined,
): string[] {
	const lead = [
		...values.filter(({ changed }) => changed).map(({ part }) => part),
		...(moved === undefined ? [] : [moved]),
	];
	return [
		...(lead.length ? [lead.join(" · ")] : []),
		...values.filter(({ changed }) => !changed).map(({ part }) => part),
	];
}

// How a table's sort stands: the column and the way round it turns.
export interface Sort {
	key: string;
	direction: "descending" | "ascending";
}

// The label a column's picked value stands under, as its option.
function labelOf(column: TableColumn, value: string): string | undefined {
	if (column.edit?.control !== "picker") return undefined;
	return column.edit.options
		.flatMap((entry) => ("options" in entry ? entry.options : [entry]))
		.find((option) => option.value === value)?.label;
}

// What a cell reads as: a picked value its option's label, a status its word,
// an age its distance from now (`age`, the platform's own words for it).
export function shown(
	column: TableColumn,
	cell: TableCell | undefined,
	age: (moment: string) => string,
): string {
	if (cell === null || cell === undefined || typeof cell === "boolean")
		return "";
	if (isChangeCell(cell)) return cell.after ?? "";
	if (typeof cell === "object") return cell.label ?? "";
	if (column.kind === "age") return age(String(cell));
	return labelOf(column, String(cell)) ?? String(cell);
}

// What a cell sorts by: a number or a moment as itself, anything else as the
// text it reads as; an empty cell as "".
export function order(
	column: TableColumn,
	cell: TableCell | undefined,
): number | string {
	if (cell === null || cell === undefined) return "";
	if (typeof cell === "boolean") return cell ? 1 : 0;
	if (typeof cell === "number") return cell;
	if (isChangeCell(cell)) return cell.after ?? "";
	if (typeof cell === "object") return cell.label ?? cell.status;
	if (column.kind === "age") return Date.parse(cell);
	return labelOf(column, cell) ?? cell;
}

// Rows by the sorted column, an empty cell last either way.
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

// A table cell that holds a status (the object with a `status`).
export function isStatusCell(cell: TableCell | undefined): cell is StatusCell {
	return typeof cell === "object" && cell !== null && "status" in cell;
}

export function changeKind(cell: ChangeCell): ChangeCellKind | undefined {
	if (cell.before !== null && cell.after !== null) return "changed";
	if (cell.after !== null) return "added";
	if (cell.before !== null) return "removed";
	return undefined;
}

// A change cell read aloud: "from X to Y", or the word added or removed
// before the one value it holds.
export function changeReading(
	cell: ChangeCell,
	words: Pick<Words, "changedFrom" | "added" | "removed">,
): string {
	switch (changeKind(cell)) {
		case "changed":
			return filled(words.changedFrom, {
				before: cell.before ?? "",
				after: cell.after ?? "",
			});
		case "added":
			return `${words.added} ${cell.after}`;
		case "removed":
			return `${words.removed} ${cell.before}`;
		default:
			return "";
	}
}

// A change cell as a touch row's meta part: "X → Y", or its reading when one
// value stands alone.
export function changeMeta(
	cell: ChangeCell,
	words: Pick<Words, "changedFrom" | "added" | "removed">,
): string {
	return changeKind(cell) === "changed"
		? `${cell.before} → ${cell.after}`
		: changeReading(cell, words);
}

// A change mark's glyph by kind: drawn, and named by the kind's own word.
export const CHANGE_GLYPH: Readonly<Record<ChangeKind, IconName>> = {
	added: "Plus",
	changed: "PencilLine",
	removed: "Minus",
	unchanged: "Equal",
	stale: "History",
};

export type MeterLevel = "under" | "near" | "over";

// The level a share of the max stands at: past the max over, from `near` near
// (`METER_NEAR`, or a meter's own mark), else under. Both platforms read it, so
// one meter draws one level.
export function levelOf(share: number, near: number = METER_NEAR): MeterLevel {
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

// A file row's name, cut: its end (`tail`, never cut) is the extension and the
// NAME_LEAD characters before it (twice that without an extension), but its
// stem keeps its first NAME_LEAD characters, so a short name never loses its
// start. `floor` is the least characters the path shows of the name: the whole
// name when it is short, else its cut form (the lead, an ellipsis, the tail).
// A leading slash (the name as split from its directory) is no character of
// it. Both platforms read it, so one name cuts the same way.
export function pathCut(name: string): {
	stem: string;
	tail: string;
	floor: number;
} {
	const lead = name.startsWith("/") ? 1 : 0;
	const bare = name.length - lead;
	const dot = name.lastIndexOf(".");
	const kept = dot > lead ? name.length - dot + NAME_LEAD : NAME_LEAD * 2;
	const cut = name.length - Math.max(0, Math.min(kept, bare - NAME_LEAD));
	return {
		stem: name.slice(0, cut),
		tail: name.slice(cut),
		floor: lead + Math.min(bare, NAME_LEAD + 1 + kept),
	};
}
