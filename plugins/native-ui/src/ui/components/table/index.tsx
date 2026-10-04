import type {
	CellValue,
	Option,
	StatusCell,
	TableCell,
	TableColumn,
	TableRowSlots,
} from "@fcalell/ui-core/descriptors";
import {
	listCount,
	listState,
	listWaits,
	retryOf,
	type TableRecord,
	tableRecords,
} from "@fcalell/ui-core/list-state";
import { BREAKPOINT_PX } from "@fcalell/ui-core/tokens";
import {
	FIGURES,
	skeleton,
	TABLE_CELL,
	TABLE_EMPTY,
	TABLE_FRAME,
	TABLE_FROZEN,
	type TableRowState,
	tableFrozenCell,
	tableHead,
	tableHeadLabel,
	tableRow,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useState } from "react";
import {
	Pressable,
	Text as RNText,
	ScrollView,
	useWindowDimensions,
	View,
} from "react-native";
import { age } from "../../lib/age";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { CellField, LabelTarget } from "../../lib/field";
import { Ink } from "../../lib/ink";
import { LoadingContext } from "../../lib/loading";
import { navigate } from "../../lib/navigate";
import {
	SectionContext,
	useSectionCount,
	useSectionRows,
	useSectionWait,
} from "../../lib/section";
import { useWords } from "../../lib/words";
import { Checkbox } from "../checkbox";
import { Chip } from "../chip";
import { EmptyStateBase } from "../empty-state/base";
import { Missing } from "../empty-state/missing";
import { Icon } from "../icon";
import { Input } from "../input";
import { List, type RowSlots } from "../list";
import { PickerBase } from "../picker/base";
import type { QueryLike } from "../query-boundary";
import { StatusBase } from "../status/base";

const ROOT = "grow";
// The frozen leading column stands outside the sideways scroll, on the
// surface, so the cells scroll beneath its hairline: React Native has no
// sticky cell, and the two halves of a row share its height because every
// cell holds one line at the row's height.
const FRAME = "flex-row";
const FROZEN_COLUMN = "shrink-0 w-measure-short";
const SCROLLS = "grow";
const ROW_LINE = "flex-row";
// On touch every column stands at one width.
const COLUMN = "w-measure-short";
const SORT = "flex-row items-center w-full min-w-0";
const HEAD = "flex-row items-center min-w-0";
const LABEL = "shrink";
const GLYPH = "shrink-0";
const CELL = "flex-row items-center min-w-0";
const CELL_END = "justify-end";
const VALUE = "shrink";
const TICK = "shrink-0";
// A Chip hugs its top edge in a row, so it stands centred in a slot of its own.
const CHIP = "shrink min-w-0";
// An edit fills the cell it stands in.
const EDIT = "grow min-w-0";
// The empty slot spans the grid: a framed EmptyState stands across it, an
// unframed one centres in what the page's body leaves.
const EMPTY = "grow";
const SORT_BAR = "flex-row items-center justify-end";

// Five loading rows, each bar at a share of its cell: a number's at a
// quarter, the others by row and by their place among the bars.
const LOADING_BARS = [
	["w-2/3", "w-1/2", "w-1/3", "w-1/2", "w-1/2"],
	["w-1/2", "w-2/3", "w-1/2", "w-1/3", "w-2/3"],
	["w-3/4", "w-1/2", "w-1/3", "w-1/2", "w-1/3"],
	["w-1/2", "w-1/3", "w-1/2", "w-1/3", "w-1/2"],
	["w-2/3", "w-1/2", "w-1/3", "w-1/2", "w-2/3"],
] as const;
const NUMBER_BAR = "w-1/4";

type Direction = "descending" | "ascending";
interface Sort {
	key: string;
	direction: Direction;
}

// Where a table's records come from: a query, with what failed to load over
// the retry act, or items, `loading` while they are on their way.
type TableSource<T> =
	| {
			query: QueryLike<readonly T[]>;
			sentence: string;
			items?: never;
			loading?: never;
	  }
	| {
			items: readonly T[];
			loading?: boolean;
			query?: never;
			sentence?: never;
	  };

// The columns each read their cell from the item, and `row` the row's own
// slots.
interface TableBase<T> extends Closed {
	columns: readonly TableColumn<T>[];
	row: TableRowSlots<T>;
	selected?: string;
	empty?: ReactNode;
}

interface Reads {
	onOpen?: (id: string) => void;
	onEdit?: never;
}

interface Edits {
	onOpen: (id: string) => void;
	// One committed edit of a cell whose column edits; below `tablet` the
	// record `onOpen` shows edits it.
	onEdit?: (id: string, key: string, value: CellValue) => void;
}

export type TableProps<T = unknown> = TableBase<T> &
	TableSource<T> &
	(Reads | Edits);

function optionsOf(column: TableColumn): readonly Option<string | null>[] {
	if (column.edit?.control !== "picker") return [];
	return column.edit.options.flatMap((entry) =>
		"options" in entry ? entry.options : [entry],
	);
}

// What a cell reads as: a picked value its option's label, a status its word,
// an age its distance from now.
function shown(column: TableColumn, cell: TableCell | undefined): string {
	if (cell === null || cell === undefined || typeof cell === "boolean")
		return "";
	if (typeof cell === "object") return cell.label ?? "";
	if (column.kind === "age") return age(String(cell));
	const option = optionsOf(column).find((o) => o.value === cell);
	return option?.label ?? String(cell);
}

function order(
	column: TableColumn,
	cell: TableCell | undefined,
): number | string {
	if (cell === null || cell === undefined) return "";
	if (typeof cell === "boolean") return cell ? 1 : 0;
	if (typeof cell === "number") return cell;
	if (typeof cell === "object") return cell.label ?? cell.status;
	if (column.kind === "age") return Date.parse(cell);
	return shown(column, cell);
}

// Rows by the sorted column, an empty cell last either way.
function sorted(
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

// A header pressed again turns its sort over, then off; another column sorts
// newest or largest first.
function next(sort: Sort | undefined, key: string): Sort | undefined {
	if (sort?.key !== key) return { key, direction: "descending" };
	return sort.direction === "descending"
		? { key, direction: "ascending" }
		: undefined;
}

const isEnd = (column: TableColumn) =>
	(column.align ?? (column.kind === "number" ? "end" : "start")) === "end";

// From `tablet` of the window a grid: a header of sort acts over one row per
// record, every column at the short measure, scrolling sideways under its
// frozen leading column; a press on a row opens it, a press on an editable
// value edits it in place (typed in an `Input`, picked in a `Picker`'s
// sheet, ticked in a `Checkbox`). Below `tablet` one `ListRow` per record
// under the sort's pick. The table sorts in its own state: newest or largest
// first, then turned over, then off. It draws its four states: while its
// query is pending, `loading` is set or a loading Section around it waits,
// the header over skeleton rows (below `tablet` the list's waiting rows; a
// Section around busy, its count waiting); a query that answers not found
// the rest EmptyState saying it no longer exists with Back, never Retry, and
// a failed query the failed EmptyState with `sentence` and Retry, each under
// the header on the grid and alone below `tablet`; no row `empty`; then one row per item, which a
// Section around counts.
export function Table<T>(props: TableProps<T>) {
	const { columns, selected, onOpen, onEdit, empty } = props;
	const words = useWords();
	const [sort, setSort] = useState<Sort>();
	const { width } = useWindowDimensions();
	const base = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: useContext(LoadingContext),
		inSection: false,
		hasEmpty: empty !== undefined,
	};
	const input = { ...base, inSection: useSectionWait(listWaits(base)) };
	useSectionCount(listCount(input));
	useSectionRows();
	const state = listState(input);
	const waiting = state === "pending";
	const items = (props.query ? props.query.data : props.items) ?? [];
	const records = waiting
		? []
		: sorted(tableRecords(items, columns, props.row), columns, sort);
	let slot: ReactNode = null;
	if (state === "missing") slot = <Missing />;
	else if (state === "failed" && props.query)
		slot = (
			<EmptyStateBase
				tone="failed"
				sentence={props.sentence}
				act={{ label: words.retry, onAct: retryOf(props.query) }}
			/>
		);
	else if (state === "empty") slot = empty;
	if (width < BREAKPOINT_PX.tablet)
		return (
			<View className={ROOT}>
				{slot ?? (
					// The Table reports to the Section around it once; its List is
					// its own part, not a list of the Section.
					<SectionContext.Provider value={undefined}>
						<Phone
							columns={columns}
							rows={records}
							sort={sort}
							onSort={setSort}
							onOpen={onOpen}
							loading={waiting}
						/>
					</SectionContext.Provider>
				)}
			</View>
		);
	return (
		<View className={ROOT}>
			<Grid
				columns={columns}
				rows={records}
				sort={sort}
				onSort={(key) => setSort((current) => next(current, key))}
				selected={selected}
				onOpen={onOpen}
				onEdit={onEdit}
				loading={waiting}
			/>
			{slot === null ? null : (
				<View className={cn(TABLE_EMPTY, EMPTY)}>{slot}</View>
			)}
		</View>
	);
}

interface Editing {
	row: string;
	key: string;
}

function Grid(props: {
	columns: readonly TableColumn[];
	rows: readonly TableRecord[];
	sort: Sort | undefined;
	onSort: (key: string) => void;
	selected: string | undefined;
	onOpen: ((id: string) => void) | undefined;
	onEdit: ((id: string, key: string, value: CellValue) => void) | undefined;
	loading: boolean | undefined;
}) {
	const { columns, rows, sort } = props;
	const [lead, ...rest] = columns;
	const [pressed, setPressed] = useState<string>();
	const [editing, setEditing] = useState<Editing>();
	const done = () => setEditing(undefined);
	const edits = props.onEdit !== undefined;
	const opens = (row: TableRecord) =>
		props.onOpen !== undefined || row.href !== undefined;
	const open = (row: TableRecord) => {
		if (props.onOpen) props.onOpen(row.id);
		else if (row.href !== undefined) navigate(row.href);
	};
	const state = (row: TableRecord): TableRowState =>
		pressed === row.id
			? "pressed"
			: row.id === props.selected
				? "selected"
				: "rest";
	const press = (row: TableRecord) =>
		opens(row)
			? {
					onPress: () => open(row),
					onPressIn: () => setPressed(row.id),
					onPressOut: () => setPressed(undefined),
				}
			: { disabled: true };
	const name = (row: TableRecord) =>
		lead ? shown(lead, row.cells[lead.key]) : row.id;

	// A cell past the leading one, by whether and how its column edits (the
	// leading column never edits, nor a column its row locks).
	const cell = (row: TableRecord, column: TableColumn) => {
		const value = row.cells[column.key];
		const control =
			edits && !row.locked?.includes(column.key)
				? column.edit?.control
				: undefined;
		const label = `${column.label}, ${name(row)}`;
		const box = cn(TABLE_CELL, CELL, isEnd(column) && CELL_END);
		const edit = (next: CellValue) => props.onEdit?.(row.id, column.key, next);
		if (control === "checkbox")
			return (
				<Pressable
					accessibilityRole="checkbox"
					accessibilityLabel={label}
					accessibilityState={{ checked: value === true }}
					onPress={() => edit(value !== true)}
					className={box}
				>
					<LabelTarget.Provider value>
						<Checkbox checked={value === true} onChange={edit} label={label} />
					</LabelTarget.Provider>
				</Pressable>
			);
		if (control && editing?.row === row.id && editing.key === column.key)
			return (
				<View className={box}>
					<View className={EDIT}>
						<CellField.Provider value={{ label, done }}>
							<CellEdit column={column} cell={value} onEdit={edit} />
						</CellField.Provider>
					</View>
				</View>
			);
		if (control)
			return (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={label}
					accessibilityValue={{ text: shown(column, value) }}
					onPress={() => setEditing({ row: row.id, key: column.key })}
					className={box}
				>
					<CellValueView column={column} cell={value} />
				</Pressable>
			);
		return (
			<View className={box}>
				<CellValueView column={column} cell={value} />
			</View>
		);
	};

	return (
		<View
			accessibilityState={{ busy: props.loading === true }}
			className={cn(TABLE_FRAME, FRAME)}
		>
			{lead ? (
				<View className={FROZEN_COLUMN}>
					<View className={cn(tableRow({ state: "rest" }), TABLE_FROZEN)}>
						<HeadCell
							column={lead}
							sort={sort}
							frozen
							onSort={() => props.onSort(lead.key)}
						/>
					</View>
					{props.loading
						? LOADING_BARS.map((bars, index) => (
								<View
									key={bars.join(" ") + String(index)}
									className={cn(tableRow({ state: "rest" }), TABLE_FROZEN)}
								>
									<View
										className={cn(
											TABLE_CELL,
											CELL,
											isEnd(lead) && CELL_END,
											tableFrozenCell({ state: "rest" }),
										)}
									>
										{waits(columns, bars, index % 2 === 1)[0]}
									</View>
								</View>
							))
						: rows.map((row) => (
								<Pressable
									key={row.id}
									accessibilityRole={
										!opens(row)
											? undefined
											: props.onOpen === undefined
												? "link"
												: "button"
									}
									accessibilityLabel={name(row)}
									accessibilityState={{ selected: row.id === props.selected }}
									{...press(row)}
									className={cn(tableRow({ state: "rest" }), TABLE_FROZEN)}
								>
									<View
										className={cn(
											TABLE_CELL,
											CELL,
											isEnd(lead) && CELL_END,
											tableFrozenCell({ state: state(row) }),
										)}
									>
										<RNText
											numberOfLines={1}
											className={cn(
												text({ role: "body" }),
												textStrong({ role: "body" }),
												VALUE,
											)}
										>
											{name(row)}
										</RNText>
									</View>
								</Pressable>
							))}
				</View>
			) : null}
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				className={SCROLLS}
			>
				<View>
					<View className={cn(tableRow({ state: "rest" }), ROW_LINE)}>
						{rest.map((column) => (
							<View key={column.key} className={COLUMN}>
								<HeadCell
									column={column}
									sort={sort}
									frozen={false}
									onSort={() => props.onSort(column.key)}
								/>
							</View>
						))}
					</View>
					{props.loading
						? LOADING_BARS.map((bars, index) => (
								<View
									key={bars.join(" ") + String(index)}
									className={cn(tableRow({ state: "rest" }), ROW_LINE)}
								>
									{waits(columns, bars, index % 2 === 1)
										.slice(1)
										.map((wait, place) => {
											const column = rest[place];
											return column ? (
												<View
													key={column.key}
													className={cn(
														COLUMN,
														TABLE_CELL,
														CELL,
														isEnd(column) && CELL_END,
													)}
												>
													{wait}
												</View>
											) : null;
										})}
								</View>
							))
						: rows.map((row) => (
								<Pressable
									key={row.id}
									accessible={false}
									{...press(row)}
									className={cn(tableRow({ state: state(row) }), ROW_LINE)}
								>
									{rest.map((column) => (
										<View key={column.key} className={COLUMN}>
											{cell(row, column)}
										</View>
									))}
								</Pressable>
							))}
				</View>
			</ScrollView>
		</View>
	);
}

function HeadCell(props: {
	column: TableColumn;
	sort: Sort | undefined;
	frozen: boolean;
	onSort: () => void;
}) {
	const { column, sort, frozen } = props;
	const words = useWords();
	const [pressed, setPressed] = useState(false);
	const end = isEnd(column);
	const direction = sort?.key === column.key ? sort.direction : undefined;
	const edge = frozen && tableFrozenCell({ state: "rest" });
	const label = (
		<RNText
			numberOfLines={1}
			className={cn(
				tableHeadLabel({ sort: direction ? "sorted" : "none" }),
				LABEL,
			)}
		>
			{column.label}
		</RNText>
	);
	if (!column.sortable)
		return (
			<View className={cn(TABLE_CELL, edge, HEAD, end && CELL_END)}>
				{label}
			</View>
		);
	// A sorted column's arrow takes the label's ink; an unsorted column shows
	// no hint, which the web keeps for the pointer and the keyboard.
	const glyph = direction ? (
		<View className={GLYPH}>
			<Ink.Provider value="ink-body">
				<Icon
					name={direction === "descending" ? "ArrowDown" : "ArrowUp"}
					fit="meta"
				/>
			</Ink.Provider>
		</View>
	) : null;
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={column.label}
			accessibilityValue={{ text: direction ? words[direction] : undefined }}
			onPress={props.onSort}
			onPressIn={() => setPressed(true)}
			onPressOut={() => setPressed(false)}
			className={cn(
				tableHead({ state: pressed ? "pressed" : "rest" }),
				edge,
				SORT,
				end && CELL_END,
			)}
		>
			{end ? glyph : null}
			{label}
			{end ? null : glyph}
		</Pressable>
	);
}

// A cell at rest past the leading one, by its column's kind.
function CellValueView(props: {
	column: TableColumn;
	cell: TableCell | undefined;
}) {
	const { column, cell } = props;
	if (cell === null || cell === undefined) return null;
	switch (column.kind) {
		case "check":
			// A ticked read-only check says its column's label.
			return cell === true ? (
				<View
					accessible
					accessibilityRole="image"
					accessibilityLabel={column.label}
					className={TICK}
				>
					<Ink.Provider value="ink-body">
						<Icon name="Check" fit="body" />
					</Ink.Provider>
				</View>
			) : null;
		case "status": {
			const status = cell as StatusCell;
			return <StatusBase state={status.status} label={status.label} />;
		}
		case "chip":
			return (
				<View className={CHIP}>
					<Chip family={column.family} label={shown(column, cell)} />
				</View>
			);
		case "source":
			return (
				<RNText numberOfLines={1} className={cn(text({ role: "code" }), VALUE)}>
					{shown(column, cell)}
				</RNText>
			);
		case "number":
			return (
				<RNText
					numberOfLines={1}
					className={cn(text({ role: "body" }), FIGURES, VALUE)}
				>
					{shown(column, cell)}
				</RNText>
			);
		case "age":
			return (
				<RNText
					numberOfLines={1}
					className={cn(text({ role: "meta" }), FIGURES, VALUE)}
				>
					{shown(column, cell)}
				</RNText>
			);
		default:
			return (
				<RNText numberOfLines={1} className={cn(text({ role: "body" }), VALUE)}>
					{shown(column, cell)}
				</RNText>
			);
	}
}

// A cell's edit in place: the Input of its column's kind, or its Picker. The
// cell context sets its fit and its name, focuses it or opens its sheet.
function CellEdit(props: {
	column: TableColumn;
	cell: TableCell | undefined;
	onEdit: (value: CellValue) => void;
}) {
	const { column, cell } = props;
	const [draft, setDraft] = useState(
		cell === null || cell === undefined ? "" : String(cell),
	);
	if (column.edit?.control === "picker")
		return (
			<PickerBase<string | null>
				label={column.label}
				options={column.edit.options}
				value={typeof cell === "string" || cell === null ? cell : undefined}
				onChange={props.onEdit}
				chip={column.kind === "chip" ? column.family : undefined}
			/>
		);
	const number = column.kind === "number";
	return (
		<Input
			kind={number ? "number" : column.kind === "source" ? "source" : "text"}
			value={draft}
			onChange={setDraft}
			onCommit={(value) =>
				props.onEdit(
					number ? (value.trim() === "" ? null : Number(value)) : value,
				)
			}
		/>
	);
}

// A loading row's waits, one per column: a check's box, a number's quarter
// bar, a status's dot and word, the other bars by their place among the bars.
function waits(
	columns: readonly TableColumn[],
	bars: readonly string[],
	odd: boolean,
): ReactNode[] {
	let bar = 0;
	return columns.map((column) => {
		if (column.kind === "check")
			return <View key={column.key} className={skeleton({ kind: "check" })} />;
		if (column.kind === "number")
			return (
				<View
					key={column.key}
					className={cn(skeleton({ kind: "line" }), NUMBER_BAR)}
				/>
			);
		if (column.kind === "status")
			return <StatusBase key={column.key} waiting={odd ? "third" : "half"} />;
		const width = bars[bar++ % bars.length];
		return (
			<View
				key={column.key}
				className={cn(skeleton({ kind: "line" }), width)}
			/>
		);
	});
}

// Below `tablet`: the sort's pick over one ListRow per record.
function Phone(props: {
	columns: readonly TableColumn[];
	rows: readonly TableRecord[];
	sort: Sort | undefined;
	onSort: (sort: Sort) => void;
	onOpen: ((id: string) => void) | undefined;
	loading: boolean | undefined;
}) {
	const words = useWords();
	const { columns, sort } = props;
	const [leading, ...rest] = columns;
	const status = rest.find((column) => column.kind === "status");
	const chip = rest.find((column) => column.kind === "chip");
	const ageColumn = rest.find((column) => column.kind === "age");
	const meta = rest.filter(
		(column) => column !== status && column !== chip && column !== ageColumn,
	);
	const sortable = columns.filter((column) => column.sortable);
	const sortedBy = sortable.find((column) => column.key === sort?.key);
	const arrow = sort?.direction === "ascending" ? "ArrowUp" : "ArrowDown";
	const pick = sortable.length ? (
		<View className={SORT_BAR}>
			<PickerBase<string>
				label={words.sort}
				name={
					sortedBy && sort
						? `${words.sort}, ${sortedBy.label}, ${words[sort.direction]}`
						: undefined
				}
				options={sortable.map((column) => ({
					value: column.key,
					label: column.label,
					icon: column === sortedBy ? arrow : undefined,
				}))}
				value={sortedBy?.key}
				onChange={(key) =>
					props.onSort(
						sort?.key === key && sort.direction === "descending"
							? { key, direction: "ascending" }
							: { key, direction: "descending" },
					)
				}
				fit="row"
			/>
		</View>
	) : null;
	const cell = (record: TableRecord, column: TableColumn | undefined) =>
		column ? record.cells[column.key] : undefined;
	const { onOpen } = props;
	// A slot is declared only when a column fills it, so the waiting rows
	// stand in the slots the loaded ones draw.
	const row: RowSlots<TableRecord> = {
		key: (record) => record.id,
		title: (record) =>
			leading ? shown(leading, cell(record, leading)) : record.id,
		meta: meta.length
			? (record) => {
					const parts = meta
						.map((column) => {
							const at = cell(record, column);
							if (column.kind === "check")
								return at === true ? column.label : "";
							if (column.kind === "number" && at !== null && at !== undefined)
								return `${column.label} ${at}`;
							return shown(column, at);
						})
						.filter((part) => part !== "");
					return parts.length ? parts : undefined;
				}
			: undefined,
		trailing: ageColumn
			? (record) => {
					const when = cell(record, ageColumn);
					return typeof when === "string" ? { age: age(when) } : undefined;
				}
			: undefined,
		status: status
			? (record) => {
					const state = cell(record, status);
					// A status cell is the one object a cell holds.
					return typeof state === "object" && state !== null
						? {
								state: state.status,
								label: state.label ?? words[state.status],
							}
						: undefined;
				}
			: undefined,
		chip:
			chip?.kind === "chip"
				? (record) => {
						const value = cell(record, chip);
						return typeof value === "string"
							? { family: chip.family, label: shown(chip, value) }
							: undefined;
					}
				: undefined,
		href: (record) => record.href,
		// A row with `href` goes there; the others open through `onOpen`.
		onOpen: onOpen ? (record) => onOpen(record.id) : undefined,
	};
	return (
		<>
			{pick}
			<List items={props.rows} loading={props.loading} row={row} />
		</>
	);
}
