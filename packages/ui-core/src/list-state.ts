// The decisions a collection (a `List`, a `Table`, an `OptionList`) and the
// `Section` around it make before they draw, free of any framework: both
// platforms run this one source, and it is tested without rendering.

import type {
	Option,
	OptionGroup,
	TableCell,
	TableColumn,
	TableRowSlots,
} from "./descriptors.ts";
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
export type LeadingKind = "avatar" | "icon" | "status";

// The slots a waiting ListRow draws, known before any item: its leading mark
// by kind, a meta line (at a chip's height when a chip may stand on it, the
// marks' bar at its end when a status or a chip may), a trailing value, and
// the more act's room, kept empty.
export interface RowShape {
	leading: LeadingKind | null;
	meta: boolean;
	chip: boolean;
	marks: boolean;
	trailing: boolean;
	more: boolean;
}

// A `leading` slot: one of its keys holds the item's mark.
type LeadingKeys = { avatar?: unknown; icon?: unknown; status?: unknown };

// The kind a `leading` slot declares by its one key.
function leadingKind(leading: LeadingKeys | undefined): LeadingKind | null {
	if (leading === undefined) return null;
	if (leading.avatar !== undefined) return "avatar";
	if (leading.icon !== undefined) return "icon";
	return "status";
}

// The waiting row's shape from the slots a `row` map declares, read by key:
// no slot function runs.
export function rowShape(slots: {
	leading?: LeadingKeys;
	meta?: unknown;
	status?: unknown;
	chip?: unknown;
	trailing?: unknown;
	more?: unknown;
}): RowShape {
	return {
		leading: leadingKind(slots.leading),
		meta:
			slots.meta !== undefined ||
			slots.status !== undefined ||
			slots.chip !== undefined,
		chip: slots.chip !== undefined,
		marks: slots.status !== undefined || slots.chip !== undefined,
		trailing: slots.trailing !== undefined,
		more: slots.more !== undefined,
	};
}

// The slots a waiting FileRow draws beyond its glyph, path and counts, known
// before any item: a chip's bar between the path and the counts.
export interface FileShape {
	chip: boolean;
}

// The waiting file row's shape from the slots a `file` map declares, read by
// key: no slot function runs.
export function fileShape(slots: { chip?: unknown }): FileShape {
	return { chip: slots.chip !== undefined };
}

// The slots a waiting Meter draws, known before any item: the label, share
// and bar always, the meta line when the `meter` map declares one.
export interface MeterShape {
	meta: boolean;
}

// The waiting meter's shape from the slots a `meter` map declares, read by
// key: no slot function runs.
export function meterShape(slots: { meta?: unknown }): MeterShape {
	return { meta: slots.meta !== undefined };
}

// The bars a waiting Comparison's fact draws, known before any item: one
// value bar per declared column, and a chips bar when its `row` map declares
// chips.
export interface FactShape {
	values: number;
	chips: boolean;
}

// The waiting fact's shape from the declared columns and the `row` map's
// slots, read by key: no slot function runs.
export function factShape(
	columns: readonly string[],
	slots: { chips?: unknown },
): FactShape {
	return { values: columns.length, chips: slots.chips !== undefined };
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
	// Each List or Table: it waits, it counts, and it is a body of rows.
	lists: readonly Pick<ListInput, "query" | "items" | "loading">[];
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
// else its lists' total once each answers; and, while it loads with no body
// of rows (which waits as its own skeleton rows), one skeleton field per
// field, or three.
export function sectionState(
	parts: SectionParts,
	own: { count?: number; loading?: boolean },
): SectionState {
	const loading = own.loading === true;
	const inputs = parts.lists.map((list) => ({
		...list,
		sectionLoading: loading,
		inSection: true,
		hasEmpty: false,
	}));
	const rows = parts.lists.length + parts.groups;
	return {
		busy:
			loading ||
			inputs.some((input) => listWaits(input)) ||
			parts.waits.some(Boolean),
		counted: own.count !== undefined || parts.lists.length > 0,
		count: sectionCount(own.count, inputs.map(listCount)),
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
	choice.onChange(
		choice.value.includes(option)
			? choice.value.filter((each) => each !== option)
			: [...choice.value, option],
	);
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
	href: string | undefined;
	locked: readonly string[] | undefined;
	cells: Readonly<Record<string, TableCell>>;
}

// The Table's rows: each item through the row map and every column's `cell`.
export function tableRecords<T>(
	items: readonly T[],
	columns: readonly TableColumn<T>[],
	row: TableRowSlots<T>,
): TableRecord[] {
	return items.map((item) => ({
		id: row.id(item),
		href: row.href?.(item),
		locked: row.locked?.(item),
		cells: Object.fromEntries(
			columns.map((column) => [column.key, column.cell(item)]),
		),
	}));
}
