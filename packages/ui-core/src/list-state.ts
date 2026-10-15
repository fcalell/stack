// The decisions a collection (a `List`, a `Table`, an `OptionList`) and the
// Meter, StepCount and Stages states make before they draw, free of any
// framework: both platforms run this one source, and it is tested without
// rendering.

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
import { painting } from "./paint.ts";
import { METER_NEAR, type Words } from "./tokens.ts";

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
	description?: (item: T) => string | undefined;
	recommended?: (item: T) => boolean | undefined;
	blocked?: (item: T) => string | undefined;
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

// An OptionList's one choice: radio rows in a radiogroup.
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
// the reasons its choice gives. Over the painted items (the placeholder) a
// slot that throws paints as the item itself, never throws the page.
export function tableRecords<T>(
	items: readonly T[],
	columns: readonly TableColumn<T>[],
	row: TableRowSlots<T>,
	choose?: TableChoice<T>,
	painted = false,
): TableRecord[] {
	const slot = <R>(fn: (item: T) => R, item: T): R =>
		painted ? (painting(fn, item) as R) : fn(item);
	return items.map((item) => ({
		id: slot(row.id, item),
		href: row.href && slot(row.href, item),
		locked: row.locked && slot(row.locked, item),
		warning: row.warning && slot(row.warning, item),
		change: row.change && slot(row.change, item),
		blocked: choose?.blocked && slot(choose.blocked, item),
		moved: choose?.moved && slot(choose.moved, item),
		cells: Object.fromEntries(
			columns.map((column) => [column.key, slot(column.cell, item)]),
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
	if (!edits || leading || column.locked) return undefined;
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
	if (!edits || leading || column.locked) return false;
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
