import { placeholderData } from "@fcalell/plugin-api/read";
import {
	type Datum,
	pagesOf,
	type Read,
} from "@fcalell/plugin-api/tanstack-query";
import type {
	CellValue,
	StatusMark,
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
	chipOf,
	chooseAllToggled,
	chooseHead,
	chooseReason,
	chooseRow,
	isChangeCell,
	isEnd,
	isStatusCell,
	nextSort,
	type Sort,
	shown as shownWith,
	sorted,
	type TableRecord,
	tableRecords,
	tickable,
	touchMeta,
} from "@fcalell/ui-core/list-state";
import { PAINT_ROWS, painting } from "@fcalell/ui-core/paint";
import { BREAKPOINT_PX } from "@fcalell/ui-core/tokens";
import {
	CARD,
	FIGURES,
	rowWarningContentTone,
	TABLE_CELL,
	TABLE_CHANGE,
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
import { memo, useMemo, useRef, useState, useSyncExternalStore } from "react";
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
import { type CellFit, FieldDisabled } from "../../lib/field";
import { Ink } from "../../lib/ink";
import { MoreRow } from "../../lib/more";
import { navigate, useWarm } from "../../lib/navigate";
import { clipWhen, inertProps, Painted, PaintText } from "../../lib/paint";
import { FrameBody, FrameLine, useCollection } from "../../lib/read";
import { sameBy } from "../../lib/same-by";
import { Turn } from "../../lib/turn";
import { useWords } from "../../lib/words";
import { Chip } from "../chip";
import { ChipBase } from "../chip/base";
import { Icon } from "../icon";
import { HeldInput } from "../input/base";
import { HeldPicker } from "../picker/base";
import { LockMark } from "../row/lock";
import type { RowItem } from "../section";
import { Rows } from "../section/rows";
import { StatusBase } from "../status/base";
import { ChangeMark } from "../status/change";
import { HeldCheckbox } from "../switch/checkbox";

const ROOT = "grow";
// The painted next page of the phone's list stands a rows gap under the loaded
// one's box.
const MORE_PAGE = "pt-gap";
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
const TICK_BOX = "w-target py-gap items-center justify-center";
const TALL = "py-gap";
// The leading cell's name over the reason a row's tick stands as it does.
const REASON_STACK = "shrink min-w-0";
// A sortable header washes under the press through the Pressable's own
// pressed state.
const SORT = "flex-row items-center w-full min-w-0 active:bg-wash-press";
const HEAD = "flex-row items-center gap-gap min-w-0";
const LABEL = "shrink";
const GLYPH = "shrink-0";
const CELL = "flex-row items-center gap-gap min-w-0";
const CELL_END = "justify-end";
const VALUE = "shrink";
const NOOP = () => {};
// A Chip hugs its top edge in a row, so it stands centred in a slot of its own.
const CHIP = "shrink min-w-0";
// An edit fills the cell it stands in.
const EDIT = "grow min-w-0";
const SORT_BAR = "flex-row items-center justify-end";

// The columns each read their cell from the item, and `row` the row's own
// slots.
interface TableBase<T> extends Closed {
	/** The items the rows draw: constants, or a selection, which paints `PAINT_ROWS` rows until its read lands. A selection stands in a frame (a Pane, Section, Sheet or Form given the read), which draws the table's failed, missing and empty forms. */
	items: Datum<readonly T[]>;
	columns: readonly TableColumn<T>[];
	row: TableRowSlots<T>;
	/** The table's accessible name (a short phrase), for a page that holds more than one table. */
	label?: string;
	selected?: string;
}

// The rows the viewer ticks.
type Chooses<T> =
	| { choose?: undefined }
	| {
			// The rows the viewer ticks: a tick column leads the grid (its head tick
			// over the rows that can be ticked) and, below `tablet`, each row's
			// leading is its tick. `chosen` is the ticked ids and `onChange` hears the
			// set a tick makes, which the consumer applies its rule to and hands back
			// through `chosen`; `blocked` and `moved` give a row's reason under its
			// leading cell. The acts that apply to the rows ticked are the Pane's
			// `foot`, an `ActionBar` with `chosen` the consumer gives it.
			choose: TableChoice<T>;
	  };

interface Reads {
	onOpen?: (id: string) => void;
	onEdit?: never;
}

interface Edits {
	onOpen: (id: string) => void;
	// One committed edit of a cell whose column edits; below `tablet` the
	// record `onOpen` shows edits it. A promise it returns holds the viewer's
	// value in the cell's control while it pends; a refusal puts it back.
	onEdit?: (id: string, key: string, value: CellValue) => unknown;
}

export type TableProps<T = unknown> = TableBase<T> &
	Chooses<T> &
	(Reads | Edits);

// What a cell reads as, an age in this platform's words.
function shown(column: TableColumn, cell: TableCell | undefined): string {
	return shownWith(column, cell, age);
}

// From `tablet` of the window a grid: a header of sort acts over one row per
// record, every column at the short measure, scrolling sideways under its
// frozen leading column; a press on a row opens it, a press on an editable
// value edits it in place (typed in an `Input`). Below `tablet` one `RowItem` per record
// under the sort's pick. The table sorts in its own state: newest or largest
// first, then turned over, then off. While the `items` selection's read
// waits, `PAINT_ROWS` rows stand in the columns the table declares (the slots
// are run over the placeholder), the header constant over them, each cell
// painted by its column's kind and the rows inert; below `tablet` the list
// paints the same records as its rows. The table is a frame of its
// items: it draws the failed form with Retry, the missing form and the empty
// form in its own box, and the stale and paused line above its rows while it
// holds its read, whatever stands above it.
export function Table<T>(props: TableProps<T>) {
	const { columns, selected, onOpen, onEdit } = props;
	const [sort, setSort] = useState<Sort>();
	const { width } = useWindowDimensions();
	const { drawn, frame } = useCollection(props.items);
	const { painted } = drawn;
	// Painted, `PAINT_ROWS` records over the placeholder, in the order the
	// data would arrive.
	const items: readonly T[] = painted
		? Array.from({ length: PAINT_ROWS }, () => drawn.value as T)
		: drawn.value;
	const made = tableRecords(items, columns, props.row, props.choose, painted);
	const records = painted ? made : sorted(made, columns, sort);
	const more = painted ? undefined : pagesOf(props.items);
	const blank = more
		? tableRecords(
				[placeholderData() as T],
				columns,
				props.row,
				props.choose,
				true,
			)[0]
		: undefined;
	if (width < BREAKPOINT_PX.tablet)
		return (
			<View className={ROOT} accessibilityLabel={props.label}>
				<FrameBody frame={frame} fit="frame">
					<FrameLine frame={frame} />
					<Phone
						columns={columns}
						rows={records}
						sort={sort}
						onSort={setSort}
						selected={selected}
						onOpen={onOpen}
						choose={props.choose}
						painted={painted}
						more={more}
						blank={blank}
						warns={props.row.warning !== undefined}
						links={props.row.href !== undefined}
						changes={props.row.change !== undefined}
					/>
				</FrameBody>
			</View>
		);
	return (
		<View className={ROOT} accessibilityLabel={props.label}>
			<FrameBody frame={frame} fit="frame">
				<FrameLine frame={frame} />
				<Grid
					columns={columns}
					rows={records}
					sort={sort}
					onSort={(key) => setSort((current) => nextSort(current, key))}
					selected={selected}
					choose={props.choose}
					onOpen={onOpen}
					onEdit={onEdit}
					painted={painted}
					more={more}
				/>
			</FrameBody>
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
	near: (row: TableRecord) => void;
	start: (row: string, key: string) => void;
	done: () => void;
	edit: (row: string, key: string, value: CellValue) => unknown;
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
				onPressIn: () => {
					store.set(row.id);
					actions.near(row);
				},
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
	// The table edits, so a row that locks the leading column ends it in a lock.
	edits: boolean;
	store: PressStore;
	actions: GridActions;
}) {
	const { row, lead, name, chosen, opens, store, actions } = props;
	const state = useRowState(store, row.id, chosen);
	let role: "link" | "button" | undefined;
	if (opens) role = props.link ? "link" : "button";
	const reason = chooseReason(row);
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
				// The frozen column is a short measure wide: the glyph alone.
				<View className={GLYPH}>
					<Ink.Provider value={rowWarningContentTone()}>
						<Icon name="TriangleAlert" fit="meta" />
					</Ink.Provider>
				</View>
			)}
			{cellLocked(lead, true, props.edits, row) ? <LockMark /> : null}
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
						<HeldCheckbox
							checked={props.ticked}
							onChange={(on) => actions.tick(row.id, on)}
							label={name}
						/>
					</FieldDisabled.Provider>
				</View>
			) : null}
			<Pressable
				accessibilityRole={role}
				accessibilityLabel={name}
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
}, sameBy("row"));

// The half of a row that scrolls: the cells past the leading one.
const RestRow = memo(function RestRow(props: {
	row: TableRecord;
	columns: readonly TableColumn[];
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
	const { row, columns, chosen, opens, store, actions } = props;
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
						edits={props.edits}
						editing={props.editing === column.key}
						tall={props.tall}
						actions={actions}
					/>
				</View>
			))}
		</Pressable>
	);
}, sameBy("row"));

// A cell past the leading one, by whether and how its column edits (the
// leading column never edits, nor a column locked whole, nor a column its row
// locks); a value its row locks that its column edits ends in a lock.
function Cell(props: {
	row: TableRecord;
	column: TableColumn;
	edits: boolean;
	editing: boolean;
	tall: boolean;
	actions: GridActions;
}) {
	const { row, column, actions } = props;
	const value = row.cells[column.key];
	const control = cellEdit(column, false, props.edits, row);
	const box = cn(
		TABLE_CELL,
		CELL,
		isEnd(column) && CELL_END,
		props.tall && TALL,
	);
	const edit = (next: CellValue) => actions.edit(row.id, column.key, next);
	if (control && props.editing)
		return (
			<View className={box}>
				<View className={EDIT}>
					<CellEdit
						column={column}
						cell={value}
						field={{ label: column.label, done: actions.done }}
						onEdit={edit}
					/>
				</View>
			</View>
		);
	if (control)
		return (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={column.label}
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
	painted: boolean;
	more: Read<unknown> | undefined;
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
	const warm = useWarm();
	const [actions] = useState<GridActions>(() => ({
		open: (row) => {
			const { onOpen } = latest.current;
			if (onOpen) onOpen(row.id);
			else if (row.href !== undefined) navigate(row.href);
		},
		near: (row) => {
			if (latest.current.onOpen === undefined && row.href !== undefined)
				warm(row.href);
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
		<>
			<View
				accessibilityState={{ busy: props.painted }}
				className={cn(CARD, FRAME)}
			>
				{lead ? (
					<View className={FROZEN_COLUMN}>
						<View
							className={cn(
								tableRow({ state: "rest" }),
								TABLE_FROZEN,
								ROW_LINE,
							)}
						>
							{choose ? (
								<View
									className={cn(TICK_BOX, tableFrozenCell({ state: "rest" }))}
								>
									<FieldDisabled.Provider value={!reach}>
										<HeldCheckbox
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
						{props.painted
							? rows.map((_, index) => (
									<PaintedLeadRow
										// biome-ignore lint/suspicious/noArrayIndexKey: the painted rows are fixed stand-ins
										key={index}
										lead={lead}
										choosing={choose !== undefined}
										index={index}
									/>
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
										edits={edits}
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
						{props.painted
							? rows.map((_, index) => (
									<PaintedRestRow
										// biome-ignore lint/suspicious/noArrayIndexKey: the painted rows are fixed stand-ins
										key={index}
										columns={rest}
										index={index}
									/>
								))
							: rows.map((row) => (
									<RestRow
										key={row.id}
										row={row}
										columns={rest}
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
			{props.more ? (
				<MoreRow
					read={props.more}
					empty={rows.length === 0}
					paint={() => (
						<MorePage lead={lead} rest={rest} choosing={choose !== undefined} />
					)}
				/>
			) : null}
		</>
	);
}

// A painted row's frozen half: the tick and the leading cell, painted.
function PaintedLeadRow(props: {
	lead: TableColumn;
	choosing: boolean;
	index: number;
}) {
	const { lead, index } = props;
	return (
		<View
			{...inertProps(true)}
			className={cn(tableRow({ state: "rest" }), TABLE_FROZEN, ROW_LINE)}
		>
			{props.choosing ? (
				<View className={cn(TICK_BOX, tableFrozenCell({ state: "rest" }))}>
					<HeldCheckbox checked={false} onChange={NOOP} label="" painted />
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
				<PaintedCell column={lead} leading index={index} />
			</View>
		</View>
	);
}

// A painted row's scrolling half: the other columns' cells, painted.
function PaintedRestRow(props: {
	columns: readonly TableColumn[];
	index: number;
}) {
	return (
		<View
			{...inertProps(true)}
			className={cn(tableRow({ state: "rest" }), ROW_LINE)}
		>
			{props.columns.map((column, place) => (
				<View
					key={column.key}
					className={cn(COLUMN, TABLE_CELL, CELL, isEnd(column) && CELL_END)}
				>
					<PaintedCell
						column={column}
						leading={false}
						index={props.index + place + 1}
					/>
				</View>
			))}
		</View>
	);
}

// The next page while it loads: `PAINT_ROWS` painted rows at the grid's
// columns, in a grid of their own under the loaded one, with no head.
function MorePage(props: {
	lead: TableColumn | undefined;
	rest: readonly TableColumn[];
	choosing: boolean;
}) {
	const { lead, rest } = props;
	const at = Array.from({ length: PAINT_ROWS }, (_, index) => index);
	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			className={cn(CARD, FRAME)}
		>
			{lead ? (
				<View className={FROZEN_COLUMN}>
					{at.map((index) => (
						<PaintedLeadRow
							key={index}
							lead={lead}
							choosing={props.choosing}
							index={index}
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
					{at.map((index) => (
						<PaintedRestRow key={index} columns={rest} index={index} />
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
	const lock = column.locked ? <LockMark /> : null;
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
				<Turn
					name="ArrowDown"
					fit="meta"
					turned={direction === "ascending"}
					by="half"
				/>
			</Ink.Provider>
		</View>
	) : null;
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={column.label}
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
	if (cell === null || cell === undefined) return null;
	switch (column.kind) {
		case "status": {
			const status = cell as StatusMark;
			return <StatusBase tone={status.tone} label={status.label} />;
		}
		case "change": {
			if (!isChangeCell(cell)) return null;
			const kind = changeKind(cell);
			if (kind === undefined) return null;
			return (
				<View className={cn(CELL, TABLE_CHANGE)}>
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
		case "chip": {
			const chip = chipOf(column, cell);
			return chip ? (
				<View className={CHIP}>
					<Chip family={chip.family} label={chip.label} />
				</View>
			) : null;
		}
		case "source":
			return (
				<RNText
					numberOfLines={column.wrap ? undefined : 1}
					className={cn(text({ role: "code" }), VALUE)}
				>
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
				<RNText
					numberOfLines={column.wrap ? undefined : 1}
					className={cn(text({ role: "body" }), VALUE)}
				>
					{shown(column, cell)}
				</RNText>
			);
	}
}

// A cell's edit in place: the Input of its column's kind. The cell sets its
// fit and its name and focuses it.
function CellEdit(props: {
	column: TableColumn;
	cell: TableCell | undefined;
	field: CellFit;
	onEdit: (value: CellValue) => void;
}) {
	const { column, cell } = props;
	const [draft, setDraft] = useState(
		cell === null || cell === undefined ? "" : String(cell),
	);
	const number = column.kind === "number";
	return (
		<HeldInput
			cell={props.field}
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

// A painted cell by its column's kind: a number, an age or an id as a figure's
// filler, a status as its painted mark, a chip as a
// box, the rest as the text a column holds.
function PaintedCell(props: {
	column: TableColumn;
	leading: boolean;
	index: number;
}) {
	const { column, index } = props;
	if (props.leading)
		return (
			<PaintText
				fills="name"
				painted
				numberOfLines={1}
				{...clipWhen(true)}
				className={cn(
					text({ role: "body" }),
					textStrong({ role: "body" }),
					VALUE,
				)}
			>
				<Painted role="name" at={index} />
			</PaintText>
		);
	switch (column.kind) {
		case "status":
			return <StatusBase painted />;
		case "chip":
			return (
				<View className={CHIP}>
					<ChipBase family={column.family} label="" painted />
				</View>
			);
		case "source":
			return (
				<PaintText
					fills="id"
					painted
					numberOfLines={1}
					{...clipWhen(true)}
					className={cn(text({ role: "code" }), VALUE)}
				>
					<Painted role="id" at={index} />
				</PaintText>
			);
		case "number":
		case "age":
			return (
				<PaintText
					fills="figure"
					painted
					numberOfLines={1}
					{...clipWhen(true)}
					className={cn(
						text({ role: column.kind === "age" ? "meta" : "body" }),
						FIGURES,
						VALUE,
					)}
				>
					<Painted role="figure" at={index} />
				</PaintText>
			);
		default:
			return (
				<PaintText
					fills="phrase"
					painted
					numberOfLines={1}
					{...clipWhen(true)}
					className={cn(text({ role: "body" }), VALUE)}
				>
					<Painted role="phrase" at={index + 1} />
				</PaintText>
			);
	}
}

// Below `tablet`: the sort's pick over one row per record.
function Phone(props: {
	columns: readonly TableColumn[];
	rows: readonly TableRecord[];
	sort: Sort | undefined;
	onSort: (sort: Sort) => void;
	selected: string | undefined;
	onOpen: ((id: string) => void) | undefined;
	choose: Pick<TableChoice<never>, "chosen" | "onChange"> | undefined;
	painted: boolean;
	more: Read<unknown> | undefined;
	// A record over the placeholder, the next page's painted rows.
	blank: TableRecord | undefined;
	warns: boolean;
	links: boolean;
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
			<HeldPicker<string>
				label={words.sort}
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
	const { onOpen, painted } = props;
	// A field is given only when a column fills it, so the painted rows stand
	// in the shape the loaded ones draw; a mark whose cell the placeholder does
	// not shape (a status, a chip, an age) is given by its column instead.
	const rowOf = (record: TableRecord, painted: boolean): RowItem => {
		const slot = <R,>(fn: (one: TableRecord) => R): R =>
			painted ? (painting(fn, record) as R) : fn(record);
		return {
			key: record.id,
			title: slot((one) =>
				leading ? shown(leading, cell(one, leading)) : one.id,
			),
			// A tick draws a blocked reason itself (the row's `check.blocked`);
			// the reason of a moved tick leads the row's meta.
			leading: choose
				? {
						check: {
							checked: choose.chosen.includes(record.id),
							onChange: (on) =>
								choose.onChange(chooseRow(choose.chosen, record.id, on)),
							blocked: record.blocked,
						},
					}
				: undefined,
			meta:
				meta.length || choose
					? slot((one) => {
							const parts = meta
								.map((column) => {
									const at = cell(one, column);
									const changed = isChangeCell(at);
									if (changed) return { changed, part: changeMeta(at, words) };
									if (
										column.kind === "number" &&
										at !== null &&
										at !== undefined
									)
										return { changed, part: `${column.label} ${at}` };
									return { changed, part: shown(column, at) };
								})
								.filter(({ part }) => part !== "");
							// The tick draws a blocked reason itself; with none, the rule's
							// move is the reason.
							const moved =
								one.blocked === undefined ? chooseReason(one) : undefined;
							const lines = touchMeta(parts, moved);
							return lines.length ? lines : undefined;
						})
					: undefined,
			// The row words its age moment and keeps it current itself.
			trailing: ageColumn
				? slot((one) => {
						if (painted) return { age: "" };
						const when = cell(one, ageColumn);
						return typeof when === "string" ? { age: when } : undefined;
					})
				: undefined,
			status: status
				? slot((one) => {
						if (painted) return { tone: "done" as const, label: "" };
						const state = cell(one, status);
						return isStatusCell(state)
							? {
									tone: state.tone,
									label: state.label ?? words[state.tone],
								}
							: undefined;
					})
				: undefined,
			change: props.changes ? record.change : undefined,
			warning: props.warns ? record.warning : undefined,
			chip:
				chip?.kind === "chip"
					? slot((one) => {
							if (painted) return { family: chip.family, label: "" };
							return chipOf(chip, cell(one, chip));
						})
					: undefined,
			href: props.links ? record.href : undefined,
			// The open record is current; the others, at their `href`.
			selected: record.id === props.selected || undefined,
			// A row with `href` goes there; the others open through `onOpen`.
			onOpen: onOpen ? () => onOpen(record.id) : undefined,
		};
	};
	return (
		<>
			{pick}
			<Rows
				drawn={
					painted
						? { painted: true, phase: "waiting", value: placeholderData() }
						: {
								painted: false,
								value: props.rows.map((one) => rowOf(one, false)),
							}
				}
				paint={
					painted && props.rows[0] ? rowOf(props.rows[0], true) : undefined
				}
			/>
			{props.more && props.blank ? (
				<MoreRow
					read={props.more}
					empty={props.rows.length === 0}
					paint={() => (
						<View className={MORE_PAGE}>
							<Rows
								drawn={{
									painted: true,
									phase: "waiting",
									value: placeholderData(),
								}}
								paint={props.blank ? rowOf(props.blank, true) : undefined}
							/>
						</View>
					)}
				/>
			) : null}
		</>
	);
}
