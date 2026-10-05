import type {
	CellValue,
	StatusCell,
	TableCell,
	TableChoice,
	TableColumn,
	TableRowSlots,
} from "@fcalell/ui-core/descriptors";
import {
	cellEdit,
	cellLocked,
	changeKind,
	changeMeta,
	changeReading,
	chooseAllToggled,
	chooseHead,
	chooseReason,
	chooseRow,
	isChangeCell,
	isStatusCell,
	listState,
	retryOf,
	type Sort,
	shown as shownWith,
	sorted,
	type TableRecord,
	tableRecords,
	tickable,
	touchMeta,
} from "@fcalell/ui-core/list-state";
import { BREAKPOINT_PX } from "@fcalell/ui-core/tokens";
import {
	FIGURES,
	rowWarningContentTone,
	skeleton,
	TABLE_CELL,
	TABLE_CHANGE,
	TABLE_EMPTY,
	TABLE_FRAME,
	TABLE_FROZEN,
	TABLE_NAME,
	type TableRowState,
	tableChangeValue,
	tableFrozenCell,
	tableHead,
	tableHeadLabel,
	tableRow,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import {
	memo,
	type ReactNode,
	useContext,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import {
	Pressable,
	Text as RNText,
	ScrollView,
	useWindowDimensions,
	View,
} from "react-native";
import { age } from "../../lib/age";
import { useClock } from "../../lib/clock";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { CellField, FieldDisabled, LabelTarget } from "../../lib/field";
import { Ink } from "../../lib/ink";
import { LoadingContext } from "../../lib/loading";
import { navigate } from "../../lib/navigate";
import { SectionContext } from "../../lib/section";
import { useWords } from "../../lib/words";
import { Checkbox } from "../checkbox";
import { Chip } from "../chip";
import { EmptyStateBase } from "../empty-state/base";
import { Missing } from "../empty-state/missing";
import { Icon } from "../icon";
import { Input } from "../input";
import { List, type RowSlots } from "../list";
import { LockMark } from "../list-row/lock";
import { PickerBase } from "../picker/base";
import type { QueryLike } from "../query-boundary";
import { StatusBase } from "../status/base";
import { ChangeMark } from "../status/change";

const ROOT = "grow";
// The frozen leading column stands outside the sideways scroll, on the
// surface, so the cells scroll beneath its hairline: React Native has no
// sticky cell, and the two halves of a row share its height because every
// cell holds one line at the row's height.
const FRAME = "flex-row";
// It is as wide as its tick column (when the table chooses rows) and the
// leading column's width.
const FROZEN_COLUMN = "shrink-0";
const SCROLLS = "grow";
const ROW_LINE = "flex-row";
// On touch every column stands at one width.
const COLUMN = "w-measure-short";
// The tick column is a square the row's height, its tick centred. A row that
// carries a reason grows to the two-line row, in every cell of it.
const TICK_BOX = "w-row min-h-row items-center justify-center";
const TALL = "min-h-row-2";
// The leading cell's name over the reason a row's tick stands as it does.
const REASON_STACK = "shrink min-w-0";
// A sortable header washes under the press through the Pressable's own
// pressed state.
const SORT = "flex-row items-center w-full min-w-0 active:bg-wash-press";
const HEAD = "flex-row items-center gap-inside min-w-0";
const LABEL = "shrink";
const GLYPH = "shrink-0";
const CELL = "flex-row items-center gap-inside min-w-0";
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
	// The rows the viewer ticks: a tick column leads the grid (its head tick
	// over the rows that can be ticked) and, below `tablet`, each row's leading
	// is its tick. `chosen` is the ticked ids and `onChange` hears the set a
	// tick makes, which the consumer applies its rule to and hands back through
	// `chosen`; `blocked` and `moved` give a row's reason under its leading
	// cell.
	choose?: TableChoice<T>;
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

// What a cell reads as, an age in this platform's words.
function shown(column: TableColumn, cell: TableCell | undefined): string {
	return shownWith(column, cell, age);
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
	const input = { ...base, inSection: useContext(SectionContext) };
	const state = listState(input);
	const waiting = state === "pending";
	const items = (props.query ? props.query.data : props.items) ?? [];
	const records = waiting
		? []
		: sorted(
				tableRecords(items, columns, props.row, props.choose),
				columns,
				sort,
			);
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
					<SectionContext.Provider value={false}>
						<Phone
							columns={columns}
							rows={records}
							sort={sort}
							onSort={setSort}
							onOpen={onOpen}
							choose={props.choose}
							loading={waiting}
							warns={props.row.warning !== undefined}
							changes={props.row.change !== undefined}
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
				choose={props.choose}
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

// What a row calls back into the grid: one object for the grid's life,
// reading the grid's latest render, so a memoised row never re-renders for a
// new callback.
interface GridActions {
	open: (row: TableRecord) => void;
	start: (row: string, key: string) => void;
	done: () => void;
	edit: (row: string, key: string, value: CellValue) => void;
	tick: (row: string, on: boolean) => void;
}

// The pressed row's id. A row's two halves (its frozen leading cell and the
// cells that scroll) wash together, so they read one store, each row only
// whether it is the pressed one: a touch re-renders the row it lands on.
interface PressStore {
	get: () => string | undefined;
	set: (id: string | undefined) => void;
	subscribe: (listener: () => void) => () => void;
}

function pressStore(): PressStore {
	let pressed: string | undefined;
	const listeners = new Set<() => void>();
	return {
		get: () => pressed,
		set: (id) => {
			pressed = id;
			for (const listener of listeners) listener();
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

// What a row's half draws as: pressed, the open record, or at rest.
function useRowState(
	store: PressStore,
	id: string,
	chosen: boolean,
): TableRowState {
	const pressed = useSyncExternalStore(
		store.subscribe,
		() => store.get() === id,
	);
	if (pressed) return "pressed";
	return chosen ? "selected" : "rest";
}

// A row that opens takes the press; one that does not is inert.
function pressOf(
	row: TableRecord,
	opens: boolean,
	store: PressStore,
	actions: GridActions,
) {
	return opens
		? {
				onPress: () => actions.open(row),
				onPressIn: () => store.set(row.id),
				onPressOut: () => store.set(undefined),
			}
		: { disabled: true };
}

// The frozen half of a row: its tick when the table chooses rows, then its
// leading cell, the record's name with its change mark ahead of it, its
// warning glyph after it and its tick's reason under it.
const LeadRow = memo(function LeadRow(props: {
	row: TableRecord;
	lead: TableColumn;
	name: string;
	chosen: boolean;
	choosing: boolean;
	ticked: boolean;
	opens: boolean;
	link: boolean;
	store: PressStore;
	actions: GridActions;
}) {
	const { row, lead, name, chosen, opens, store, actions } = props;
	const words = useWords();
	const state = useRowState(store, row.id, chosen);
	let role: "link" | "button" | undefined;
	if (opens) role = props.link ? "link" : "button";
	const reason = chooseReason(row);
	const named = reason === undefined ? name : `${name}. ${reason}`;
	const spoken =
		row.warning === undefined
			? named
			: `${named}. ${words.warning}. ${row.warning}`;
	const gap =
		(row.warning !== undefined || row.change !== undefined) && TABLE_NAME;
	const line = (
		<>
			{row.change ? <ChangeMark kind={row.change} /> : null}
			<RNText
				numberOfLines={1}
				className={cn(
					text({ role: "body" }),
					textStrong({ role: "body" }),
					VALUE,
				)}
			>
				{name}
			</RNText>
			{row.warning === undefined ? null : (
				// The frozen column is a short measure wide: the glyph alone, the
				// sentence read with the row's name.
				<View className={GLYPH}>
					<Ink.Provider value={rowWarningContentTone()}>
						<Icon name="TriangleAlert" fit="meta" />
					</Ink.Provider>
				</View>
			)}
		</>
	);
	return (
		<View className={cn(tableRow({ state: "rest" }), TABLE_FROZEN, ROW_LINE)}>
			{props.choosing ? (
				<View
					className={cn(
						TICK_BOX,
						reason !== undefined && TALL,
						tableFrozenCell({ state }),
					)}
				>
					<FieldDisabled.Provider value={row.blocked !== undefined}>
						<Checkbox
							checked={props.ticked}
							onChange={(on) => actions.tick(row.id, on)}
							label={name}
						/>
					</FieldDisabled.Provider>
				</View>
			) : null}
			<Pressable
				accessibilityRole={role}
				accessibilityLabel={
					row.change === undefined ? spoken : `${words[row.change]}. ${spoken}`
				}
				accessibilityState={{ selected: chosen }}
				{...pressOf(row, opens, store, actions)}
				className={COLUMN}
			>
				<View
					className={cn(
						TABLE_CELL,
						CELL,
						isEnd(lead) && CELL_END,
						reason !== undefined && TALL,
						reason === undefined && gap,
						tableFrozenCell({ state }),
					)}
				>
					{reason === undefined ? (
						line
					) : (
						<View className={REASON_STACK}>
							<View className={cn(CELL, gap)}>{line}</View>
							<RNText
								numberOfLines={1}
								className={cn(text({ role: "meta" }), VALUE)}
							>
								{reason}
							</RNText>
						</View>
					)}
				</View>
			</Pressable>
		</View>
	);
});

// The half of a row that scrolls: the cells past the leading one.
const RestRow = memo(function RestRow(props: {
	row: TableRecord;
	columns: readonly TableColumn[];
	name: string;
	chosen: boolean;
	opens: boolean;
	edits: boolean;
	// The key of the column this row edits, if any.
	editing: string | undefined;
	// Its leading cell carries a reason, so every cell stands at the two-line row.
	tall: boolean;
	store: PressStore;
	actions: GridActions;
}) {
	const { row, columns, name, chosen, opens, store, actions } = props;
	const state = useRowState(store, row.id, chosen);
	return (
		<Pressable
			accessible={false}
			{...pressOf(row, opens, store, actions)}
			className={cn(tableRow({ state }), ROW_LINE)}
		>
			{columns.map((column) => (
				<View key={column.key} className={COLUMN}>
					<Cell
						row={row}
						column={column}
						name={name}
						edits={props.edits}
						editing={props.editing === column.key}
						tall={props.tall}
						actions={actions}
					/>
				</View>
			))}
		</Pressable>
	);
});

// A cell past the leading one, by whether and how its column edits (the
// leading column never edits, nor a column locked whole, nor a column its row
// locks); a value its row locks that its column edits ends in a lock.
function Cell(props: {
	row: TableRecord;
	column: TableColumn;
	name: string;
	edits: boolean;
	editing: boolean;
	tall: boolean;
	actions: GridActions;
}) {
	const { row, column, actions } = props;
	const value = row.cells[column.key];
	const control = cellEdit(column, false, props.edits, row)?.control;
	const label = `${column.label}, ${props.name}`;
	const box = cn(
		TABLE_CELL,
		CELL,
		isEnd(column) && CELL_END,
		props.tall && TALL,
	);
	const edit = (next: CellValue) => actions.edit(row.id, column.key, next);
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
	if (control && props.editing)
		return (
			<View className={box}>
				<View className={EDIT}>
					<CellField.Provider value={{ label, done: actions.done }}>
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
				onPress={() => actions.start(row.id, column.key)}
				className={box}
			>
				<CellValueView column={column} cell={value} />
			</Pressable>
		);
	return (
		<View className={box}>
			<CellValueView column={column} cell={value} />
			{cellLocked(column, false, props.edits, row) ? <LockMark /> : null}
		</View>
	);
}

function Grid(props: {
	columns: readonly TableColumn[];
	rows: readonly TableRecord[];
	sort: Sort | undefined;
	onSort: (key: string) => void;
	selected: string | undefined;
	choose: Pick<TableChoice<never>, "chosen" | "onChange"> | undefined;
	onOpen: ((id: string) => void) | undefined;
	onEdit: ((id: string, key: string, value: CellValue) => void) | undefined;
	loading: boolean | undefined;
}) {
	const { columns, rows, sort, choose } = props;
	const words = useWords();
	const ticked = useMemo(() => new Set(choose?.chosen), [choose?.chosen]);
	// The head tick reaches the rows that can be ticked; with none it is off.
	const reach = tickable(rows).length > 0;
	const lead = columns[0];
	const rest = useMemo(() => columns.slice(1), [columns]);
	const [store] = useState(pressStore);
	const [editing, setEditing] = useState<Editing>();
	const edits = props.onEdit !== undefined;
	const opens = (row: TableRecord) =>
		props.onOpen !== undefined || row.href !== undefined;
	const name = (row: TableRecord) =>
		lead ? shown(lead, row.cells[lead.key]) : row.id;
	const latest = useRef(props);
	latest.current = props;
	const [actions] = useState<GridActions>(() => ({
		open: (row) => {
			const { onOpen } = latest.current;
			if (onOpen) onOpen(row.id);
			else if (row.href !== undefined) navigate(row.href);
		},
		start: (row, key) => setEditing({ row, key }),
		done: () => setEditing(undefined),
		edit: (row, key, value) => latest.current.onEdit?.(row, key, value),
		tick: (row, on) => {
			const { choose: now } = latest.current;
			now?.onChange(chooseRow(now.chosen, row, on));
		},
	}));

	return (
		<View
			accessibilityState={{ busy: props.loading === true }}
			className={cn(TABLE_FRAME, FRAME)}
		>
			{lead ? (
				<View className={FROZEN_COLUMN}>
					<View
						className={cn(tableRow({ state: "rest" }), TABLE_FROZEN, ROW_LINE)}
					>
						{choose ? (
							<View
								className={cn(TICK_BOX, tableFrozenCell({ state: "rest" }))}
							>
								<FieldDisabled.Provider value={!reach}>
									<Checkbox
										checked={chooseHead(rows, choose.chosen)}
										onChange={() =>
											choose.onChange(chooseAllToggled(rows, choose.chosen))
										}
										label={words.chooseAll}
									/>
								</FieldDisabled.Provider>
							</View>
						) : null}
						<View className={COLUMN}>
							<HeadCell
								column={lead}
								sort={sort}
								frozen
								onSort={() => props.onSort(lead.key)}
							/>
						</View>
					</View>
					{props.loading
						? LOADING_BARS.map((bars, index) => (
								<View
									key={bars.join(" ") + String(index)}
									className={cn(
										tableRow({ state: "rest" }),
										TABLE_FROZEN,
										ROW_LINE,
									)}
								>
									{choose ? (
										<View
											className={cn(
												TICK_BOX,
												tableFrozenCell({ state: "rest" }),
											)}
										>
											<View className={skeleton({ kind: "check" })} />
										</View>
									) : null}
									<View
										className={cn(
											COLUMN,
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
								<LeadRow
									key={row.id}
									row={row}
									lead={lead}
									name={name(row)}
									chosen={row.id === props.selected}
									choosing={choose !== undefined}
									ticked={ticked.has(row.id)}
									opens={opens(row)}
									link={props.onOpen === undefined}
									store={store}
									actions={actions}
								/>
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
								<RestRow
									key={row.id}
									row={row}
									columns={rest}
									name={name(row)}
									chosen={row.id === props.selected}
									opens={opens(row)}
									edits={edits}
									editing={editing?.row === row.id ? editing.key : undefined}
									tall={chooseReason(row) !== undefined}
									store={store}
									actions={actions}
								/>
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
	const lock =
		column.locked === undefined ? null : <LockMark reason={column.locked} />;
	if (!column.sortable)
		return (
			<View className={cn(TABLE_CELL, edge, HEAD, end && CELL_END)}>
				{label}
				{lock}
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
			className={cn(tableHead({ state: "rest" }), edge, SORT, end && CELL_END)}
		>
			{end ? glyph : null}
			{label}
			{lock}
			{end ? null : glyph}
		</Pressable>
	);
}

// An age cell's words, read off the shared clock: the cell draws again only
// when they change.
function Age(props: { moment: string }) {
	return useClock((now) => age(props.moment, now));
}

// A cell at rest past the leading one, by its column's kind.
function CellValueView(props: {
	column: TableColumn;
	cell: TableCell | undefined;
}) {
	const { column, cell } = props;
	const words = useWords();
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
		case "change": {
			if (!isChangeCell(cell)) return null;
			const kind = changeKind(cell);
			if (kind === undefined) return null;
			// The words read it whole; the glyph and values only draw it.
			return (
				<View
					accessible
					accessibilityLabel={changeReading(cell, words)}
					className={cn(CELL, TABLE_CHANGE)}
				>
					{cell.before !== null && (
						<RNText
							numberOfLines={1}
							className={cn(
								tableChangeValue({
									kind: kind === "removed" ? "removed" : "before",
								}),
								FIGURES,
								VALUE,
							)}
						>
							{cell.before}
						</RNText>
					)}
					{kind === "changed" && (
						<Ink.Provider value="ink-meta">
							<Icon name="ArrowRight" fit="meta" />
						</Ink.Provider>
					)}
					{cell.after !== null && (
						<RNText
							numberOfLines={1}
							className={cn(
								tableChangeValue({
									kind: kind === "added" ? "added" : "after",
								}),
								FIGURES,
								VALUE,
							)}
						>
							{cell.after}
						</RNText>
					)}
				</View>
			);
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
					<Age moment={String(cell)} />
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
	choose: Pick<TableChoice<never>, "chosen" | "onChange"> | undefined;
	loading: boolean | undefined;
	warns: boolean;
	changes: boolean;
}) {
	const words = useWords();
	const { columns, sort, choose } = props;
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
	// The rows' ages from the shared clock, one line each: the list draws
	// again only when one of their words changes.
	const ages = useClock(
		(now) =>
			props.rows
				.map((record) => {
					const when = cell(record, ageColumn);
					return typeof when === "string" ? age(when, now) : "";
				})
				.join("\n"),
		ageColumn ? undefined : 0,
	).split("\n");
	const ageOf = new Map(props.rows.map((record, at) => [record.id, ages[at]]));
	// A slot is declared only when a column fills it, so the waiting rows
	// stand in the slots the loaded ones draw.
	const row: RowSlots<TableRecord> = {
		key: (record) => record.id,
		title: (record) =>
			leading ? shown(leading, cell(record, leading)) : record.id,
		// A tick draws a blocked reason itself (`ListRow`'s `check.blocked`);
		// the reason of a moved tick leads the row's meta.
		leading: choose
			? {
					check: (record) => ({
						checked: choose.chosen.includes(record.id),
						onChange: (on) =>
							choose.onChange(chooseRow(choose.chosen, record.id, on)),
						blocked: record.blocked,
					}),
				}
			: undefined,
		meta:
			meta.length || choose
				? (record) => {
						const parts = meta
							.map((column) => {
								const at = cell(record, column);
								const changed = isChangeCell(at);
								if (column.kind === "check")
									return { changed, part: at === true ? column.label : "" };
								if (changed) return { changed, part: changeMeta(at, words) };
								if (column.kind === "number" && at !== null && at !== undefined)
									return { changed, part: `${column.label} ${at}` };
								return { changed, part: shown(column, at) };
							})
							.filter(({ part }) => part !== "");
						// The tick draws a blocked reason itself; with none, the rule's
						// move is the reason.
						const moved =
							record.blocked === undefined ? chooseReason(record) : undefined;
						const lines = touchMeta(parts, moved);
						return lines.length ? lines : undefined;
					}
				: undefined,
		trailing: ageColumn
			? (record) => {
					const words = ageOf.get(record.id);
					return words ? { age: words } : undefined;
				}
			: undefined,
		status: status
			? (record) => {
					const state = cell(record, status);
					return isStatusCell(state)
						? {
								state: state.status,
								label: state.label ?? words[state.status],
							}
						: undefined;
				}
			: undefined,
		change: props.changes ? (record) => record.change : undefined,
		warning: props.warns ? (record) => record.warning : undefined,
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
