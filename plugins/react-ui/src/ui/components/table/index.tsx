import { Field } from "@base-ui/react/field";
import { placeholderData, readKey } from "@fcalell/plugin-api/read";
import {
	type Datum,
	isRead,
	pagesOf,
	type Read,
	sameQuery,
	useWindow,
	windowOf,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	CellValue,
	ChangeKind,
	ChoiceSlots,
	RowItem,
	StatusMark,
	TableCell,
	TableChoice,
	TableColumn,
	TablePick,
	TableRowSlots,
} from "@fcalell/ui-core/descriptors";
import {
	alongRows,
	type Chooser,
	type Cursor,
	cellEdit,
	cellLocked,
	changeKind,
	changeMeta,
	chipOf,
	chooseReason,
	figureWidth,
	gridFloor,
	hideable,
	idsChooser,
	isChangeCell,
	isEnd,
	isPick,
	isStatusCell,
	moveCursor,
	nextSort,
	pageRows,
	pickChooser,
	rangeIds,
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
	TABLE,
	TABLE_CELL,
	TABLE_CHANGE,
	TABLE_FROZEN,
	TABLE_NAME,
	tableChangeValue,
	tableFrozenCell,
	tableHead,
	tableHeadLabel,
	tableRow,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { pagesCovering } from "@fcalell/ui-core/window";
import {
	type FocusEvent,
	type KeyboardEvent,
	type MouseEvent,
	memo,
	type ReactNode,
	use,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import type { Act } from "../../lib/act.ts";
import { age } from "../../lib/age.ts";
import { useClock } from "../../lib/clock.ts";
import type { Closed } from "../../lib/closed.ts";
import { useColumns } from "../../lib/columns.ts";
import type { CellFit } from "../../lib/field.ts";
import { FootBar, PageTitle } from "../../lib/frame.ts";
import { MoreRow } from "../../lib/more.tsx";
import { follow, navigate } from "../../lib/navigate.ts";
import { Painted } from "../../lib/paint.tsx";
import {
	FrameBody,
	FrameLine,
	stillOf,
	useCollection,
} from "../../lib/read.tsx";
import { sameBy } from "../../lib/same-by.ts";
import { Turn } from "../../lib/turn.tsx";
import { Scroller, Window } from "../../lib/window.tsx";
import { useWords } from "../../lib/words.tsx";
import { ActionBarBase } from "../action-bar/base.tsx";
import { ChipBase } from "../chip/base.tsx";
import { Icon } from "../icon/index.tsx";
import { HeldInput } from "../input/base.tsx";
import { HeldPicker } from "../picker/base.tsx";
import { LockMark } from "../row/lock.tsx";
import { WarningMark } from "../row/marks.tsx";
import { SheetCard } from "../section/card.tsx";
import { Rows } from "../section/rows.tsx";
import { StatusBase } from "../status/base.tsx";
import { ChangeMark } from "../status/change.tsx";
import { HeldCheckbox } from "../switch/checkbox.tsx";
import { ColumnsMenu } from "./columns.tsx";

// The table fills what its column leaves. From `tablet` of its own width the
// grid stands; below it the rows are a list under the sort's pick. Only the live form mounts,
// chosen from the table's own width (`useWide`).
const ROOT = "flex flex-col grow";
const FORM = "flex flex-col grow";
// The grid is its own stacking context, so its frozen column stands over its
// cells alone, never over a sheet.
const FRAME = "flex flex-col isolate";
// The card's edge closes the last row: it draws no hairline of its own.
const BODY_ROWS = "[&>tr:last-child]:border-b-0";
// On every pointer the grid stands at least as wide as its columns' floors
// (`gridFloor`) and scrolls sideways under its frozen leading column when the
// page is narrower. A cell focused under that column scrolls clear of it: the
// scroller's padding at its start is the frozen width (the leading column's
// short measure, and the tick column's square before it).
const SCROLLS = "overflow-x-auto scroll-ps-(--container-measure-short)";
const SCROLLS_TICKED =
	"overflow-x-auto scroll-ps-[calc(var(--container-measure-short)+var(--spacing-target))]";
// The selection bar docked in the Pane's foot stands at the table's own width,
// at the start of the foot, so it keeps the page's grid whether the Pane is
// `wide` or holds the reading width.
const BAR_PLACE = "self-start max-w-full";
const GRID = "w-full table-fixed";
const HEAD_CELL = "p-0 font-normal";
const START = "text-start";
const END = "text-end";
// The frozen columns stand over the cells that scroll beneath them: the tick
// column first, the leading column after it (at the tick column's width when
// the table chooses rows).
const FROZEN = "sticky z-1";
const FROZEN_AT = "left-0";
const FROZEN_AFTER_TICK = "left-row";
// The tick column is a square the row's height, its tick centred. A row that
// carries a reason grows to the two-line row, in every cell of it.
const TICK_WIDTH = "w-target";
const TICK_BOX = "flex items-center justify-center py-gap";
// A row is a floor its line box and gaps grow past (never a set height): the
// row token, the two-line token for a row that carries a reason, and the
// control height under the header (its sort act is a control).
const FLOOR = "min-h-row";
const TALL = "min-h-row-2";
const HEAD_FLOOR = "min-h-control";
// The leading cell's name over the reason a row's tick stands as it does.
const REASON_STACK = "flex flex-col min-w-0";
const SORT =
	"group/sort flex items-center w-full min-w-0 hover:bg-wash-hover active:bg-wash-press focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
const HEAD = "flex items-center gap-gap min-w-0";
const LABEL = "truncate";
const GLYPH_SORTED = "flex shrink-0 text-ink-body";
// An unsorted column shows the both-ways arrow under the pointer and the
// keyboard.
const GLYPH_HINT =
	"hidden shrink-0 text-ink-meta group-hover/sort:flex group-focus-visible/sort:flex";
// The cell cursor rings inward; the grid holds one cell at tabindex 0.
const BODY_CELL =
	"p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
const CELL = "flex items-center gap-gap min-w-0";
const CELL_END = "justify-end";
const VALUE = "truncate";
const WRAP = "break-words hyphens-auto";
const NOOP = () => {};
const CHANGE = "flex items-center min-w-0";
// The leading cell's change mark and the name (with the reason under it) side
// by side, the mark centred on the name's own line.
const CHANGE_LEAD = "flex items-start min-w-0";
const MARK_LINE = "flex shrink-0 items-center h-line-body";
// A row that opens washes under the pointer and the press, the open record a
// step darker under the pointer; its frozen cell repeats the wash over its
// own surface.
const ROW = "group/row";
const ROW_PRESS = "hover:bg-wash-hover active:bg-wash-press";
const ROW_CHOSEN_PRESS = "hover:bg-wash-selected-hover active:bg-wash-press";
const FROZEN_PRESS =
	"group-hover/row:bg-wash-hover group-active/row:bg-wash-press";
const FROZEN_CHOSEN_PRESS =
	"group-hover/row:bg-wash-selected-hover group-active/row:bg-wash-press";
// The row the cell cursor stands in washes like the pointer's row while the
// keyboard holds the focus, so the active row reads along its whole width.
const ROW_ACTIVE = "has-[:focus-visible]:bg-wash-hover";
const ROW_CHOSEN_ACTIVE = "has-[:focus-visible]:bg-wash-selected-hover";
const FROZEN_ACTIVE = "group-has-[:focus-visible]/row:bg-wash-hover";
const FROZEN_CHOSEN_ACTIVE =
	"group-has-[:focus-visible]/row:bg-wash-selected-hover";
// The columns menu stands at the end of a bar over the grid.
const COLUMNS_BAR = "flex items-center justify-end";
const SORT_BAR = "flex items-center justify-end";

// A column's width: its measure, its share, or what the others leave (never
// less than the short measure, by the grid's floor).
const WIDTH: Record<NonNullable<TableColumn["width"]>, string> = {
	"measure-short": "w-measure-short",
	"1/4": "w-1/4",
};

interface TableBase<T, Q> extends Closed {
	/** The items the rows draw: constants, or a selection, which paints `PAINT_ROWS` rows until its read lands. A selection is the table's own frame: it holds its read and draws the failed, missing and empty forms in its own box whatever stands above it. A window read (`orpc.x.list.window(input)`) under a scroller sizes the grid to its total and loads the pages the view covers; a paginated read whose procedure declares `sort` is sorted by the server through the header. */
	items: Datum<readonly T[]> | Read<readonly T[], Q>;
	/** The columns in order, the first the row's name, each reading its cell from the item. */
	columns: readonly TableColumn<T>[];
	/** The row's own slots, each read from the item: `editable` (false: its cells draw the plain value, no mark, no act, for a row that is simply not editable in place) and `locked` (the columns held read only, each drawing the lock, the hold of an open change set). */
	row: TableRowSlots<T>;
	/** The table's accessible name (a short phrase), for a page that holds more than one table; without it the page's title names the grid. */
	label?: string;
	/** The open record's id, washed as selected. */
	selected?: string;
}

/** The rows the viewer ticks, and the acts that apply to them. */
type Chooses<T, Q> =
	| { choose?: undefined; select?: never }
	| {
			/** The rows the viewer ticks: a tick column leads the grid (its head tick over the rows that can be ticked) and, below `tablet`, each row's leading is its tick. `chosen` is the ticked ids and `onChange` hears the set a tick makes, which the consumer applies its rule to and hands back through `chosen`; `blocked` and `moved` give a row's reason under its leading cell. Over a paginated read (`pages` or `window`), `{ picked, onPick, … }` holds a `Picked` instead: the head tick chooses the read's query, every row it matches loaded or not, and a tick then unticks a row (`except`); a mutation takes `picked` whole (`selector()` of plugin-api). A filter that changes the query ends a pick of the old one. */
			choose: TableChoice<T> | TablePick<T, Q>;
			/** The acts that apply to the rows ticked, in reading order with the filled one last: the table draws them in a selection bar docked at the foot of the `Pane` it stands in (a table with `select` stands in one), "N of M chosen" at its start (`choose.noun` names the rows, "N of M promotable chosen"), M the rows that can be ticked (a window read's total; a pick over a cursor read counts the rows loaded), over a deselect-all act and, below `tablet` of the page, a select-all act; `choose.onChange` (`onPick`) hears the set both make. An act's `blocked` is the consumer's, read off its own `chosen` (a publish with nothing chosen). The bar stands whatever the ticks, and gives way to a docked `sheet`. */
			select?: { acts: readonly Act[] };
	  };

interface Reads {
	/** Opens a record: a press on its row, Enter on its leading cell. */
	onOpen?: (id: string) => void;
	onEdit?: never;
}

interface Edits {
	onOpen: (id: string) => void;
	/** Hears one committed edit of a cell whose column edits; a phone edits through the record `onOpen` shows. Return the save's promise and the cell's control holds the viewer's value while it pends; a refusal puts it back, with its reason. */
	onEdit?: (id: string, key: string, value: CellValue) => unknown;
}

/** Records in columns, from items. */
export type TableProps<T = unknown, Q = unknown> = TableBase<T, Q> &
	Chooses<T, Q> &
	(Reads | Edits);

// What a cell reads as, an age in this platform's words.
function shown(column: TableColumn, cell: TableCell | undefined): string {
	return shownWith(column, cell, age);
}

// Focus inside an open edit: an Input's value.
const inEdit = (target: HTMLElement) => target instanceof HTMLInputElement;

function editOf(
	columns: readonly TableColumn[],
	at: number,
	edits: boolean,
	row: TableRecord,
) {
	const column = columns[at];
	return column ? cellEdit(column, at === 0, edits, row) : undefined;
}

// The Table's tree differs by the width of the column it stands in (the grid or
// the list), so it reads that width here and a CSS container query never mounts
// both forms. Placed on the Table's root, it finds its box in the layout phase,
// where the DOM already stands, and the state it sets re-renders before paint:
// the first frame draws the live form. The width is read off the root's own box
// each render and re-read when it resizes.
const none = () => {};

// The ref for the Table's root, whether that root is at least `tablet` wide and
// its width, which the selection bar docked in the Pane's foot stands at; both
// `undefined` until the root is placed.
function useWide(): [
	(node: HTMLElement | null) => void,
	boolean | undefined,
	number | undefined,
] {
	const [root, setRoot] = useState<HTMLElement | null>();
	const place = useCallback((node: HTMLElement | null) => {
		if (node) setRoot(node);
	}, []);
	const subscribe = useCallback(
		(notify: () => void) => {
			if (!root) return none;
			const watch = new ResizeObserver(notify);
			watch.observe(root);
			return () => watch.disconnect();
		},
		[root],
	);
	const width = useSyncExternalStore(
		subscribe,
		() => (root ? root.getBoundingClientRect().width : 0),
		() => 0,
	);
	if (root === undefined) return [place, undefined, undefined];
	return [place, width >= BREAKPOINT_PX.tablet, width];
}

/** From `tablet` of its own width a grid: a header of sortable acts (the table sorts in its own state: newest or largest first, then turned over, then off) over one row per record, its leading cell the record's name (its row's change mark, when it has one, ahead of it and its warning after it); a `chip` column draws each cell on the column's `family`, or on its own where the cell returns `{ label, family }`; its columns never squeeze below the short measure (the grid stands at least `gridFloor` wide) and, when its column is narrower, the grid scrolls sideways on every pointer under its frozen leading column. Its keyboard is a cell cursor (one Tab stop, the arrows, Home and End; Enter opens the row from its leading cell or edits an editable cell, Escape leaves an edit); a press on a row opens it, a press on an editable value edits it in place, typed in an `Input`. Below `tablet` of its own width one `Row` per record (its leading cell the title, its change the row's mark, its age trailing, its status, warning and chip the marks, the other values its meta line) under the sort's pick. Over a paginated read whose procedure declares `sort` the header sorts through the read's input (the server orders the whole query, and a column the procedure does not name does not sort); over a window read under a scroller the grid is as long as the read's total, mounts the rows in view and loads the pages they stand in wherever the scrollbar lands (rows not loaded yet stand painted), and a changed query keeps the previous rows drawn until its first page lands; over a cursor read that scrolls (`VIRTUAL_FROM` rows) the next page loads as the end nears. While the `items` selection's read waits, `PAINT_ROWS` rows stand in the columns the table declares (the slots are run over the placeholder), the header constant over them, each cell painted by its column's kind and the rows inert, busy only while the read waits (a read not asked for yet stands painted and still); the list below `tablet` paints the same records as its rows. The table is a frame of its items: it draws the failed form with Retry, the missing form and the empty form in its own box, and the stale and paused line above its rows while it holds its read, whatever stands above it. With `choose` it ticks rows, and with `select` the acts that apply to them stand in a selection bar docked at its Pane's foot, at the table's own width and start, so it stands on the page's grid. Below `tablet` of its own width the rows stand on a hairline sheet like any list's, the sort's pick bare above it. */
export function Table<T, Q = unknown>(props: TableProps<T, Q>) {
	const { selected, onOpen, onEdit, choose, select } = props;
	const [place, wide, width] = useWide();
	const dock = use(FootBar);
	const scroll = use(Scroller);
	if (select && !dock) {
		throw new Error("Table: `select` docks its bar in a Pane's foot");
	}
	const [picked, setSort] = useState<Sort>();
	// The columns the viewer has shown (the consumer's `hidden` under what the
	// viewer chose, kept per table); a sort on a column that is hidden is off.
	const {
		shown: visible,
		choice,
		toggle,
	} = useColumns(props.columns, props.label);
	const sort =
		picked && visible.some((column) => column.key === picked.key)
			? picked
			: undefined;
	// A read whose procedure declares `sort` is ordered by the server: the
	// header's sort goes into the read's input, and a column it does not name
	// does not sort. A window read orders by the server or not at all, since
	// the rows loaded are not the rows there are.
	const sorting = isRead(props.items) ? props.items.sorting : undefined;
	const items$ = useMemo<Datum<readonly T[]>>(
		() =>
			sorting && sort
				? (sorting.by({
						column: sort.key,
						direction: sort.direction === "ascending" ? "asc" : "desc",
					}) as Datum<readonly T[]>)
				: (props.items as Datum<readonly T[]>),
		[props.items, sorting, sort],
	);
	const windowRead = windowOf(items$);
	const columns = useMemo(() => {
		const keep = sorting?.columns ?? (windowRead ? [] : undefined);
		return keep
			? visible.map((column) =>
					column.sortable && !keep.includes(column.key)
						? ({ ...column, sortable: false } as TableColumn<T>)
						: column,
				)
			: visible;
	}, [visible, sorting, windowRead]);
	const { drawn, frame } = useCollection(items$);
	// A window read under a scroller, in the grid: the rows stand at their
	// places in a scroller sized to the total, and the pages the view covers load.
	const view = useWindow(windowRead);
	const virtual = windowRead !== undefined && scroll !== null && wide === true;
	// Painted, `PAINT_ROWS` records over the placeholder, in the order the
	// data would arrive. A window keeps the previous query's rows drawn until
	// the new query's first page lands.
	const painted = virtual ? view === undefined : drawn.painted;
	const loaded: readonly T[] = painted
		? Array.from({ length: PAINT_ROWS }, () => drawn.value as T)
		: (drawn.value as readonly T[]);
	const made = painted
		? tableRecords(loaded, columns, props.row, props.choose, true)
		: virtual && view
			? placed(
					view.rows as readonly T[],
					view.total,
					columns,
					props.row,
					props.choose,
				)
			: tableRecords(loaded, columns, props.row, props.choose);
	const records: readonly (TableRecord | undefined)[] =
		painted || virtual || sorting
			? made
			: sorted(made as TableRecord[], columns, sort);
	const standing = records.filter(
		(one): one is TableRecord => one !== undefined,
	);
	const more = painted ? undefined : pagesOf(items$);
	const query = more?.query as Q | undefined;
	const total = view && windowRead ? view.total : undefined;
	const chooser: Chooser | undefined = !choose
		? undefined
		: isPick(choose)
			? pickChooser(standing, choose.picked, choose.onPick, { query, total })
			: idsChooser(standing, choose.chosen, choose.onChange);
	// The selection bar stands in the Pane's foot, handed up each render as the
	// rows and the ticks change. The rows a tick reaches count against the
	// chosen, and the bar's select-all hands the consumer every one of them to
	// apply its rule to.
	useLayoutEffect(() => {
		if (!select || !choose || !chooser) return undefined;
		dock?.(
			<div className={BAR_PLACE} style={{ width: width || undefined }}>
				<ActionBarBase
					acts={[...select.acts]}
					chosen={{
						count: chooser.count,
						of: painted ? 0 : chooser.of,
						noun: choose.noun,
						onAll: chooser.onAll,
					}}
				/>
			</div>,
		);
		return () => dock?.(undefined);
	});
	// A pick of a query ends when the read answers another (a filter): its
	// rows are not the ones shown. A changed read also scrolls back to the top.
	const key = readKey(items$);
	const last = useRef(key);
	useEffect(() => {
		if (
			choose &&
			isPick(choose) &&
			"query" in choose.picked &&
			!sameQuery(choose.picked.query, query)
		) {
			choose.onPick({ ids: [] });
		}
	});
	useLayoutEffect(() => {
		if (last.current === key) return;
		last.current = key;
		scroll?.holder.current?.scrollTo({ top: 0 });
	}, [key, scroll]);
	// The pages of the rows mounted load, whichever place the scrollbar lands.
	const onRange = useCallback(
		(indices: readonly number[]) => {
			if (!view) return;
			view
				.ensure(pagesCovering(indices, view.size, view.total))
				.catch(() => {});
		},
		[view],
	);
	const blank = more
		? tableRecords(
				[placeholderData() as T],
				columns,
				props.row,
				props.choose,
				true,
			)[0]
		: undefined;
	// The form is unknown until the root is placed in its page; placing it
	// re-renders before paint.
	let form: ReactNode = null;
	if (wide) {
		form = (
			<Grid
				columns={columns}
				rows={records}
				sort={sort}
				onSort={(key) => setSort((current) => nextSort(current, key))}
				selected={selected}
				chooser={chooser}
				onOpen={onOpen}
				onEdit={onEdit}
				painted={painted}
				busy={frame.holds && frame.form === "waiting"}
				more={virtual ? undefined : more}
				onRange={virtual ? onRange : undefined}
				label={props.label}
			/>
		);
	} else if (wide === false) {
		const list = (
			<Phone
				columns={columns}
				rows={standing}
				sort={sort}
				onSort={setSort}
				selected={selected}
				onOpen={onOpen}
				chooser={chooser}
				painted={painted}
				more={more}
				blank={blank}
				warns={props.row.warning !== undefined}
				links={props.row.href !== undefined}
				changes={props.row.change !== undefined}
			/>
		);
		form = props.label ? (
			// biome-ignore lint/a11y/useSemanticElements: a fieldset groups a form's controls; this names a list of rows
			<div className={FORM} role="group" aria-label={props.label}>
				{list}
			</div>
		) : (
			<div className={FORM}>{list}</div>
		);
	}
	return (
		<div ref={place} data-still={stillOf(frame)} className={ROOT}>
			<FrameBody frame={frame}>
				<FrameLine frame={frame} />
				{wide && hideable(props.columns) ? (
					<div className={COLUMNS_BAR}>
						<ColumnsMenu
							columns={props.columns}
							choice={choice}
							onToggle={toggle}
						/>
					</div>
				) : null}
				{form}
			</FrameBody>
		</div>
	);
}

// The records of a window's loaded rows at their places, `total` long with a
// hole where a page is not loaded.
function placed<T>(
	rows: readonly T[],
	total: number,
	columns: readonly TableColumn<T>[],
	row: TableRowSlots<T>,
	choose: ChoiceSlots<T> | undefined,
): (TableRecord | undefined)[] {
	const at: number[] = [];
	const items: T[] = [];
	rows.forEach((item, index) => {
		at.push(index);
		items.push(item);
	});
	const records = new Array<TableRecord | undefined>(total);
	tableRecords(items, columns, row, choose).forEach((record, k) => {
		records[at[k] as number] = record;
	});
	return records;
}

// What a row and its cells call back into the grid: one object for the grid's
// life, reading the grid's latest render, so a memoised row or cell never
// re-renders for a new callback.
interface GridActions {
	start: (row: string, column: number) => void;
	done: () => void;
	edit: (row: TableRecord, column: TableColumn, value: CellValue) => unknown;
	click: (event: MouseEvent, row: TableRecord) => void;
	home: (row: string, column: number) => HTMLElement | undefined;
	tick: (row: TableRecord, on: boolean) => void;
}

type Editing = "started" | "entered";

// A row re-renders only when its record, its selection, its tick or the
// cursor's place in it changes. The cursor's columns count the tick column
// first when the table chooses rows (`choosing`).
const Row = memo(function Row(props: {
	row: TableRecord;
	index: number;
	columns: readonly TableColumn[];
	chosen: boolean;
	choosing: boolean;
	ticked: boolean;
	opens: boolean;
	edits: boolean;
	// The cursor's column in this row, else -1, and its edit.
	cursor: number;
	editing: Editing | undefined;
	actions: GridActions;
}) {
	const { row, index, columns, chosen, choosing, opens, actions } = props;
	const lead = columns[0];
	const name = lead ? shown(lead, row.cells[lead.key]) : "";
	const shift = choosing ? 1 : 0;
	const reason = chooseReason(row);
	return (
		<tr
			aria-rowindex={index + 2}
			aria-selected={chosen || undefined}
			onClick={(event) => actions.click(event, row)}
			className={cn(
				tableRow({ state: chosen ? "selected" : "rest" }),
				ROW,
				opens && (chosen ? ROW_CHOSEN_PRESS : ROW_PRESS),
				chosen ? ROW_CHOSEN_ACTIVE : ROW_ACTIVE,
			)}
		>
			{choosing ? (
				<TickCell
					row={row}
					name={name}
					ticked={props.ticked}
					tall={reason !== undefined}
					chosen={chosen}
					opens={opens}
					here={props.cursor === 0}
					actions={actions}
				/>
			) : null}
			{columns.map((column, place) => (
				<Cell
					key={column.key}
					row={row}
					column={column}
					place={place + shift}
					leading={place === 0}
					cell={row.cells[column.key]}
					control={editOf(columns, place, props.edits, row)}
					locked={cellLocked(column, place === 0, props.edits, row)}
					frozen={place === 0}
					shifted={choosing}
					reason={reason}
					chosen={chosen}
					opens={opens}
					here={props.cursor === place + shift}
					editing={props.cursor === place + shift ? props.editing : undefined}
					actions={actions}
				/>
			))}
		</tr>
	);
}, sameBy("row"));

// A row's tick cell: a Checkbox named by the leading cell's name, disabled
// while the row is blocked. Frozen
// first, the leading column freezing after it.
function TickCell(props: {
	row: TableRecord;
	name: string;
	ticked: boolean;
	tall: boolean;
	chosen: boolean;
	opens: boolean;
	here: boolean;
	actions: GridActions;
}) {
	const { row, actions } = props;
	const box = cn(
		TICK_BOX,
		props.tall ? TALL : FLOOR,
		tableFrozenCell({ state: props.chosen ? "selected" : "rest" }),
		props.opens && (props.chosen ? FROZEN_CHOSEN_PRESS : FROZEN_PRESS),
		props.chosen ? FROZEN_CHOSEN_ACTIVE : FROZEN_ACTIVE,
	);
	return (
		<td
			data-row={row.id}
			data-column={0}
			data-choose=""
			tabIndex={props.here ? 0 : -1}
			className={cn(BODY_CELL, TABLE_FROZEN, FROZEN, FROZEN_AT)}
		>
			{/* biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox inside is the control */}
			<label className={box}>
				<Field.Root disabled={row.blocked !== undefined}>
					<HeldCheckbox
						cell
						target={{}}
						checked={props.ticked}
						onChange={(on) => actions.tick(row, on)}
						label={props.name}
					/>
				</Field.Root>
			</label>
		</td>
	);
}

// A cell holds the pointer's hover itself, so a pointer crossing the grid
// re-renders only the cells it leaves and enters: an editable cell under the
// pointer shows its control.
const Cell = memo(function Cell(props: {
	row: TableRecord;
	column: TableColumn;
	// The cursor's column, counting the tick column first when there is one.
	place: number;
	leading: boolean;
	cell: TableCell | undefined;
	control: TableColumn["edit"];
	// Its row locks a value its column edits: a lock ends the cell.
	locked: boolean;
	frozen: boolean;
	// A tick column stands before it.
	shifted: boolean;
	// The leading cell's reason under the name.
	reason: string | undefined;
	chosen: boolean;
	opens: boolean;
	here: boolean;
	editing: Editing | undefined;
	actions: GridActions;
}) {
	const { row, column, place, cell, control, actions } = props;
	const [hovered, setHovered] = useState(false);
	// A started edit's control mounts afresh over the one the pointer showed,
	// so it mounts focused or open.
	const starts = props.editing === "started";
	const live =
		control !== undefined && (props.editing !== undefined || hovered);
	const field: CellFit = {
		label: column.label,
		starts,
		done: actions.done,
		home: () => actions.home(row.id, place),
	};
	const box = cn(
		TABLE_CELL,
		CELL,
		isEnd(column) && CELL_END,
		props.leading && props.reason !== undefined ? TALL : FLOOR,
		props.frozen &&
			tableFrozenCell({ state: props.chosen ? "selected" : "rest" }),
		props.frozen &&
			props.opens &&
			(props.chosen ? FROZEN_CHOSEN_PRESS : FROZEN_PRESS),
		props.frozen && (props.chosen ? FROZEN_CHOSEN_ACTIVE : FROZEN_ACTIVE),
	);
	return (
		<td
			data-row={row.id}
			data-column={place}
			data-edit={control}
			tabIndex={props.here ? 0 : -1}
			onPointerEnter={control ? () => setHovered(true) : undefined}
			onPointerLeave={control ? () => setHovered(false) : undefined}
			className={cn(
				BODY_CELL,
				props.frozen &&
					cn(
						TABLE_FROZEN,
						FROZEN,
						props.shifted ? FROZEN_AFTER_TICK : FROZEN_AT,
					),
			)}
		>
			{live ? (
				<CellEdit
					key={starts ? "started" : "shown"}
					column={column}
					cell={cell}
					field={field}
					onEdit={(value) => actions.edit(row, column, value)}
				/>
			) : (
				<div className={box}>
					<CellValueView
						column={column}
						cell={cell}
						leading={props.leading}
						href={row.href}
						warning={row.warning}
						change={row.change}
						reason={props.reason}
					/>
					{props.locked ? <LockMark /> : null}
				</div>
			)}
		</td>
	);
});

function Grid(props: {
	columns: readonly TableColumn[];
	// `undefined` where a window's page is not loaded: its row is painted.
	rows: readonly (TableRecord | undefined)[];
	sort: Sort | undefined;
	onSort: (key: string) => void;
	selected: string | undefined;
	chooser: Chooser | undefined;
	// Hears the indices of the rows mounted: a window loads their pages.
	onRange: ((indices: readonly number[]) => void) | undefined;
	onOpen: ((id: string) => void) | undefined;
	onEdit: ((id: string, key: string, value: CellValue) => unknown) | undefined;
	painted: boolean;
	// The read waits: a read not asked for yet stands painted and still, not busy.
	busy: boolean;
	more: Read<unknown> | undefined;
	label: string | undefined;
}) {
	const { columns, rows, sort, painted, chooser } = props;
	const words = useWords();
	// A tick column leads the cursor's columns: the leading cell is its
	// column `shift`.
	const shift = chooser ? 1 : 0;
	const title = use(PageTitle);
	const scroll = use(Scroller);
	const frame = useRef<HTMLDivElement>(null);
	const body = useRef<HTMLTableSectionElement>(null);
	const [cursor, setCursor] = useState<Cursor>({ row: 0, column: 0 });
	// The cursor's cell in its edit: `started` from the keyboard or a tap, its
	// control mounted afresh (focused, or a pick open), or `entered` when focus
	// reached a control the pointer already showed.
	const [editing, setEditing] = useState<"started" | "entered">();
	const start = (id: string, column: number) => {
		setCursor({ row: indexOf(id), column });
		setEditing("started");
	};
	const at: Cursor = {
		row: Math.min(cursor.row, Math.max(rows.length - 1, 0)),
		column: Math.min(cursor.column, Math.max(columns.length - 1 + shift, 0)),
	};
	const edits = props.onEdit !== undefined;

	// A cell carries its row's id, not its place: a row landing above it
	// would render every row below it with a new place.
	const cellAt = (id: string, column: number) =>
		frame.current?.querySelector<HTMLElement>(
			`td[data-row="${CSS.escape(id)}"][data-column="${column}"]`,
		);
	const places = useMemo(() => {
		const map = new Map<string, number>();
		rows.forEach((each, place) => {
			if (each) map.set(each.id, place);
		});
		return map;
	}, [rows]);
	const indexOf = (id: string | undefined) => places.get(id ?? "") ?? -1;
	// The cursor moves first and its cell takes focus once the row stands: a row
	// the window had not mounted is kept by the cursor, drawn by this render.
	const [wanted, setWanted] = useState<Cursor>();
	const focusCell = (row: number, column: number) => {
		setCursor({ row, column });
		setWanted({ row, column });
	};
	// The cell scrolls clear of the frozen columns it would stand under, by the
	// scroller's padding at its start; a frozen cell stands in place, so it
	// scrolls nothing.
	// A row of a window not loaded yet takes the focus once its page lands.
	const wantedId = wanted ? rows[wanted.row]?.id : undefined;
	// biome-ignore lint/correctness/useExhaustiveDependencies: only a new `wanted` (or its row arriving) is a move to focus
	useLayoutEffect(() => {
		if (!wanted) return;
		const cell = cellAt(rows[wanted.row]?.id ?? "", wanted.column);
		if (!cell) return;
		if (wanted.column <= shift) {
			cell.focus();
			return;
		}
		cell.focus({ preventScroll: true });
		cell.scrollIntoView({ block: "nearest", inline: "nearest" });
	}, [wanted, wantedId]);
	// A pick's list gone ends the edit; it hands focus back to its cell.
	const done = () => setEditing(undefined);
	const open = (row: TableRecord) => {
		if (props.onOpen) props.onOpen(row.id);
		else if (row.href !== undefined) navigate(row.href);
	};
	const edit = (row: TableRecord, column: TableColumn, value: CellValue) =>
		props.onEdit?.(row.id, column.key, value);
	// The rows a Shift-arrow run ticks, from where it began to where it stands;
	// any other move, tick or press ends the run.
	const run = useRef<{ from: number; to: number }>(undefined);
	const tick = (row: TableRecord, on: boolean) => {
		run.current = undefined;
		chooser?.tick(row.id, on);
	};
	// A Shift-arrow takes the ticks along with the cursor: the rows between the
	// run's start and the cursor are ticked (the loaded ones that can be) and
	// the rows it leaves behind by turning back are unticked.
	const extend = (from: number, to: number) => {
		const was = run.current ?? { from, to: from };
		const now = { from: was.from, to };
		const on = rangeIds(rows, now.from, now.to);
		const off = rangeIds(rows, was.from, was.to).filter(
			(id) => !on.includes(id),
		);
		chooser?.tickSet(on, off);
		run.current = now;
	};
	// PageUp and PageDown move by the rows in view less one. The view's height
	// over a row's is read here because CSS cannot say how many rows a scroller
	// holds.
	const pageOf = (cell: HTMLElement) =>
		pageRows(
			scroll?.holder.current?.clientHeight ?? window.innerHeight,
			cell.closest("tr")?.getBoundingClientRect().height ?? 0,
		);

	const onFocus = (event: FocusEvent) => {
		const target = event.target as HTMLElement;
		const cell = target.closest<HTMLElement>("td[data-row]");
		if (!cell || !frame.current?.contains(cell)) return;
		const row = indexOf(cell.dataset.row);
		if (row < 0) return;
		const column = Number(cell.dataset.column);
		const same = row === at.row && column === at.column;
		// A focus on the cursor's own cell sets nothing.
		if (!same) setCursor({ row, column });
		// The started edit's control taking focus keeps it started.
		setEditing((now) =>
			inEdit(target) ? (same && now) || "entered" : undefined,
		);
	};
	// Leaving a typed edit for anywhere outside its cell ends it.
	const onBlur = (event: FocusEvent) => {
		const target = event.target as HTMLElement;
		const cell = target.closest("td[data-row]");
		if (!(target instanceof HTMLInputElement) || !cell) return;
		if (!cell.contains(event.relatedTarget as Node | null))
			setEditing(undefined);
	};
	const onKeyDown = (event: KeyboardEvent) => {
		const target = event.target as HTMLElement;
		const cell = target.closest<HTMLElement>("td[data-row]");
		if (!cell) return;
		const row = indexOf(cell.dataset.row);
		const column = Number(cell.dataset.column);
		const record = rows[row];
		// The tick column has no field.
		const place = column - shift;
		const field = columns[place];
		if (!record || (!field && column >= shift)) return;
		if (inEdit(target)) {
			// An open edit: Enter has committed and Escape put the value back and
			// ended the moment, so the field leaving for its cell commits nothing
			// more.
			if (
				(event.key === "Enter" || event.key === "Escape") &&
				target instanceof HTMLInputElement
			) {
				event.preventDefault();
				setEditing(undefined);
				cell.focus();
			}
			return;
		}
		const to = moveCursor(event.key, { row, column }, event.ctrlKey, {
			rows: rows.length,
			columns: columns.length + shift,
			page: pageOf(cell),
		});
		// The leading link answers Enter and Space itself; the
		// arrows move the cursor from them as from their cell.
		if (target !== cell && !to) return;
		if (to) {
			event.preventDefault();
			if (chooser && event.shiftKey && alongRows(event.key)) {
				extend(row, to.row);
			} else {
				run.current = undefined;
			}
			focusCell(to.row, to.column);
			return;
		}
		if (event.ctrlKey || event.metaKey || event.altKey) return;
		const enter = event.key === "Enter";
		const space = event.key === " ";
		const x = event.key.toLowerCase() === "x";
		const toggle = () => {
			if (record.blocked === undefined) {
				tick(record, !chooser?.ticked(record.id));
			}
		};
		// The tick column's cell ticks on Enter, Space and `x`.
		if (!field) {
			if (!enter && !space && !x) return;
			event.preventDefault();
			toggle();
			return;
		}
		const edit = editOf(columns, place, edits, record);
		if (edit && (enter || space)) {
			event.preventDefault();
			start(record.id, column);
			return;
		}
		// Space and `x` tick the row of a table that chooses. Without `choose`
		// Space is not the grid's: it goes on to the shell's player.
		if (chooser && (x || space)) {
			event.preventDefault();
			toggle();
			return;
		}
		if (!enter) return;
		event.preventDefault();
		const link = place === 0 ? cell.querySelector("a") : null;
		if (link) link.click();
		else open(record);
	};
	// A press on a row opens it, unless it lands on an editable cell (which it
	// starts editing, its box and a cell already editing answering the press
	// themselves), the tick cell or the leading cell's link.
	const onClick = (event: MouseEvent, row: TableRecord) => {
		run.current = undefined;
		const target = event.target as HTMLElement;
		// A pick in a cell's popup reaches the row through React's tree alone.
		if (!event.currentTarget.contains(target)) return;
		const editable = target.closest<HTMLElement>("td[data-edit]");
		if (editable) {
			const column = Number(editable.dataset.column);
			const live =
				editing !== undefined &&
				at.row === indexOf(row.id) &&
				at.column === column;
			if (!live) start(row.id, column);
			return;
		}
		if (target.closest("td[data-choose], a")) return;
		if (props.onOpen || row.href !== undefined) open(row);
	};

	const opens = props.onOpen !== undefined;
	const latest = useRef({
		start,
		done,
		edit,
		click: onClick,
		home: cellAt,
		tick,
	});
	latest.current = { start, done, edit, click: onClick, home: cellAt, tick };
	const [actions] = useState<GridActions>(() => ({
		start: (row, column) => latest.current.start(row, column),
		done: () => latest.current.done(),
		edit: (row, column, value) => latest.current.edit(row, column, value),
		click: (event, row) => latest.current.click(event, row),
		home: (row, column) => latest.current.home(row, column) ?? undefined,
		tick: (row, on) => latest.current.tick(row, on),
	}));
	// The head tick reaches the rows that can be ticked; with none it is off.
	const reach = tickable(rows.filter((one) => one !== undefined)).length > 0;

	// A row's key: its id, else its place (a painted row, or a window's row not
	// loaded; `~` keeps it from an id).
	const keyAt = (index: number) =>
		painted ? index : (rows[index]?.id ?? `~${index}`);
	// Built by index, so a long grid builds only the rows its Window mounts.
	const rowAt = (index: number) => {
		const row = rows[index];
		return painted || !row ? (
			<PaintedRow
				key={keyAt(index)}
				index={index}
				columns={columns}
				choosing={chooser !== undefined}
			/>
		) : (
			<Row
				key={row.id}
				row={row}
				index={index}
				columns={columns}
				chosen={row.id === props.selected}
				choosing={chooser !== undefined}
				ticked={chooser?.ticked(row.id) ?? false}
				opens={opens || row.href !== undefined}
				edits={edits}
				cursor={index === at.row ? at.column : -1}
				editing={index === at.row ? editing : undefined}
				actions={actions}
			/>
		);
	};

	return (
		<div className={FORM}>
			<div
				ref={frame}
				className={cn(CARD, FRAME, chooser ? SCROLLS_TICKED : SCROLLS)}
			>
				<table
					// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a table whose keyboard is a cell cursor is the WAI-ARIA grid
					role="grid"
					aria-label={props.label}
					aria-labelledby={props.label ? undefined : title}
					aria-busy={props.busy || undefined}
					aria-rowcount={rows.length + 1}
					onFocus={onFocus}
					onBlur={onBlur}
					onKeyDown={onKeyDown}
					style={{ minWidth: gridFloor(columns, chooser !== undefined) }}
					className={cn(TABLE, GRID)}
				>
					<Cols columns={columns} choosing={chooser !== undefined} />
					<thead>
						<tr aria-rowindex={1} className={tableRow({ state: "rest" })}>
							{chooser ? (
								<th
									scope="col"
									className={cn(HEAD_CELL, cn(TABLE_FROZEN, FROZEN, FROZEN_AT))}
								>
									<div
										className={cn(
											TICK_BOX,
											HEAD_FLOOR,
											tableFrozenCell({ state: "rest" }),
										)}
									>
										<Field.Root disabled={!reach}>
											<HeldCheckbox
												checked={chooser.head}
												onChange={() => chooser.toggleAll()}
												label={words.chooseAll}
											/>
										</Field.Root>
									</div>
								</th>
							) : null}
							{columns.map((column, place) => (
								<HeadCell
									key={column.key}
									column={column}
									sort={sort}
									frozen={place === 0}
									shifted={chooser !== undefined}
									onSort={() => props.onSort(column.key)}
								/>
							))}
						</tr>
					</thead>
					<tbody ref={body} className={BODY_ROWS}>
						<Window
							box={body}
							keep={at.row}
							spacer="tr"
							count={rows.length}
							keyOf={keyAt}
							row={rowAt}
							onRange={props.onRange}
						/>
					</tbody>
				</table>
			</div>
			{props.more ? (
				<MoreRow
					read={props.more}
					empty={rows.length === 0}
					paint={() => (
						<MorePage columns={columns} choosing={chooser !== undefined} />
					)}
				/>
			) : null}
		</div>
	);
}

// The grid's columns, at the widths its cells keep.
function Cols(props: { columns: readonly TableColumn[]; choosing: boolean }) {
	return (
		<colgroup>
			{props.choosing ? <col className={TICK_WIDTH} /> : null}
			{props.columns.map((column) => (
				<col
					key={column.key}
					className={column.width ? WIDTH[column.width] : undefined}
					style={{ width: figureWidth(column) }}
				/>
			))}
		</colgroup>
	);
}

// The next page while it loads: `PAINT_ROWS` painted rows at the grid's
// columns, in a grid of their own under the loaded one.
function MorePage(props: {
	columns: readonly TableColumn[];
	choosing: boolean;
}) {
	return (
		<div
			aria-hidden
			className={cn(CARD, FRAME, props.choosing ? SCROLLS_TICKED : SCROLLS)}
		>
			<table
				style={{ minWidth: gridFloor(props.columns, props.choosing) }}
				className={cn(TABLE, GRID)}
			>
				<Cols columns={props.columns} choosing={props.choosing} />
				<tbody className={BODY_ROWS}>
					{Array.from({ length: PAINT_ROWS }, (_, index) => (
						<PaintedRow
							// biome-ignore lint/suspicious/noArrayIndexKey: the painted rows are fixed stand-ins
							key={index}
							index={index}
							columns={props.columns}
							choosing={props.choosing}
						/>
					))}
				</tbody>
			</table>
		</div>
	);
}

function HeadCell(props: {
	column: TableColumn;
	sort: Sort | undefined;
	frozen: boolean;
	// A tick column stands before it.
	shifted: boolean;
	onSort: () => void;
}) {
	const { column, sort, frozen } = props;
	const end = isEnd(column);
	const direction = sort?.key === column.key ? sort.direction : undefined;
	const label = (
		<span
			className={cn(
				tableHeadLabel({ sort: direction ? "sorted" : "none" }),
				LABEL,
			)}
		>
			{column.label}
		</span>
	);
	const glyph = direction ? (
		<span className={GLYPH_SORTED}>
			<Turn
				name="ArrowDown"
				fit="meta"
				turned={direction === "ascending"}
				by="half"
			/>
		</span>
	) : (
		<span className={GLYPH_HINT}>
			<Icon name="ArrowUpDown" fit="meta" />
		</span>
	);
	const lock = column.locked ? <LockMark /> : null;
	const content = (
		<>
			{end ? glyph : null}
			{label}
			{lock}
			{end ? null : glyph}
		</>
	);
	const edge = frozen && tableFrozenCell({ state: "rest" });
	return (
		<th
			scope="col"
			aria-sort={column.sortable ? (direction ?? "none") : undefined}
			className={cn(
				HEAD_CELL,
				end ? END : START,
				frozen &&
					cn(
						TABLE_FROZEN,
						FROZEN,
						props.shifted ? FROZEN_AFTER_TICK : FROZEN_AT,
					),
			)}
		>
			{column.sortable ? (
				<button
					type="button"
					onClick={props.onSort}
					className={cn(
						tableHead({ state: "rest" }),
						HEAD_FLOOR,
						edge,
						SORT,
						end && CELL_END,
					)}
				>
					{content}
				</button>
			) : (
				<div
					className={cn(TABLE_CELL, HEAD_FLOOR, edge, HEAD, end && CELL_END)}
				>
					<span className={cn(tableHeadLabel({ sort: "none" }), LABEL)}>
						{column.label}
					</span>
					{lock}
				</div>
			)}
		</th>
	);
}

// An age cell's words, read off the shared clock: the cell draws again only
// when they change.
function Age(props: { moment: string }) {
	return useClock((now) => age(props.moment, now));
}

// A cell at rest: the leading cell the record's name (its link when it has
// one) with its change mark ahead of it and its warning after it, and its
// tick's reason under that line, the others by their column's kind.
function CellValueView(props: {
	column: TableColumn;
	cell: TableCell | undefined;
	leading: boolean;
	href: string | undefined;
	warning: string | undefined;
	change: ChangeKind | undefined;
	reason: string | undefined;
}) {
	const { column, cell, leading } = props;
	if (cell === null || cell === undefined) return null;
	if (leading) {
		const strong = cn(
			text({ role: "body" }),
			textStrong({ role: "body" }),
			VALUE,
		);
		const name =
			props.href !== undefined ? (
				<a href={props.href} onClick={follow} tabIndex={-1} className={strong}>
					{shown(column, cell)}
				</a>
			) : (
				<span className={strong}>{shown(column, cell)}</span>
			);
		const line =
			props.warning === undefined ? (
				name
			) : (
				<span className={cn(TABLE_NAME, CHANGE)}>
					{name}
					<WarningMark label={props.warning} />
				</span>
			);
		const stack =
			props.reason === undefined ? (
				line
			) : (
				<span className={REASON_STACK}>
					{line}
					<span className={cn(text({ role: "meta" }), VALUE)}>
						{props.reason}
					</span>
				</span>
			);
		// The change mark stands on the name's line and the reason under the
		// name, both starting where the name does.
		if (props.change === undefined) return stack;
		return (
			<span className={cn(TABLE_NAME, CHANGE_LEAD)}>
				<span className={MARK_LINE}>
					<ChangeMark kind={props.change} />
				</span>
				{stack}
			</span>
		);
	}
	switch (column.kind) {
		case "status": {
			const status = cell as StatusMark;
			return <StatusBase tone={status.tone} label={status.label} compact />;
		}
		case "change": {
			if (!isChangeCell(cell)) return null;
			const kind = changeKind(cell);
			if (kind === undefined) return null;
			return (
				<span className={cn(CHANGE, TABLE_CHANGE)}>
					{cell.before !== null && (
						<span
							className={cn(
								tableChangeValue({
									kind: kind === "removed" ? "removed" : "before",
								}),
								FIGURES,
								VALUE,
							)}
						>
							{cell.before}
						</span>
					)}
					{kind === "changed" && <Icon name="ArrowRight" fit="meta" />}
					{cell.after !== null && (
						<span
							className={cn(
								tableChangeValue({
									kind: kind === "added" ? "added" : "after",
								}),
								FIGURES,
								VALUE,
							)}
						>
							{cell.after}
						</span>
					)}
				</span>
			);
		}
		case "chip": {
			const chip = chipOf(column, cell);
			return chip ? (
				<ChipBase family={chip.family} label={chip.label} compact />
			) : null;
		}
		case "source":
			return (
				<span
					className={cn(text({ role: "code" }), column.wrap ? WRAP : VALUE)}
				>
					{shown(column, cell)}
				</span>
			);
		case "number":
			return (
				<span className={cn(text({ role: "body" }), FIGURES, VALUE)}>
					{shown(column, cell)}
				</span>
			);
		case "age":
			return (
				<span className={cn(text({ role: "meta" }), FIGURES, VALUE)}>
					<Age moment={String(cell)} />
				</span>
			);
		default:
			return (
				<span
					className={cn(text({ role: "body" }), column.wrap ? WRAP : VALUE)}
				>
					{shown(column, cell)}
				</span>
			);
	}
}

// A cell's edit in place: the Input of its column's kind. The cell sets its
// fit, its name and its tab stop.
function CellEdit(props: {
	column: TableColumn;
	cell: TableCell | undefined;
	field: CellFit;
	onEdit: (value: CellValue) => unknown;
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
// filler, a status as its painted mark, a chip as a box, the rest as the text a column holds.
function PaintedCell(props: {
	column: TableColumn;
	leading: boolean;
	index: number;
}) {
	const { column, index } = props;
	if (props.leading)
		return (
			<span
				className={cn(
					text({ role: "body" }),
					textStrong({ role: "body" }),
					VALUE,
				)}
			>
				<Painted role="name" at={index} />
			</span>
		);
	switch (column.kind) {
		case "status":
			return <StatusBase painted />;
		case "chip":
			return <ChipBase family={column.family} label="" painted compact />;
		case "source":
			return (
				<span className={cn(text({ role: "code" }), VALUE)}>
					<Painted role="id" at={index} />
				</span>
			);
		case "number":
		case "age":
			return (
				<span
					className={cn(
						text({ role: column.kind === "age" ? "meta" : "body" }),
						FIGURES,
						VALUE,
					)}
				>
					<Painted role="figure" at={index} />
				</span>
			);
		default:
			return (
				<span className={cn(text({ role: "body" }), VALUE)}>
					<Painted role="phrase" at={index + 1} />
				</span>
			);
	}
}

// A painted row: the loaded row's cells at their boxes, each painted by its
// column's kind, the row inert.
function PaintedRow(props: {
	index: number;
	columns: readonly TableColumn[];
	choosing: boolean;
}) {
	return (
		<tr inert className={tableRow({ state: "rest" })}>
			{props.choosing ? (
				<td className={cn(BODY_CELL, cn(TABLE_FROZEN, FROZEN, FROZEN_AT))}>
					<div
						className={cn(TICK_BOX, FLOOR, tableFrozenCell({ state: "rest" }))}
					>
						<HeldCheckbox checked={false} onChange={NOOP} label="" painted />
					</div>
				</td>
			) : null}
			{props.columns.map((column, place) => {
				const frozen = place === 0;
				return (
					<td
						key={column.key}
						className={cn(
							BODY_CELL,
							frozen &&
								cn(
									TABLE_FROZEN,
									FROZEN,
									props.choosing ? FROZEN_AFTER_TICK : FROZEN_AT,
								),
						)}
					>
						<div
							className={cn(
								TABLE_CELL,
								FLOOR,
								CELL,
								isEnd(column) && CELL_END,
								frozen && tableFrozenCell({ state: "rest" }),
							)}
						>
							<PaintedCell
								column={column}
								leading={place === 0}
								index={props.index + place}
							/>
						</div>
					</td>
				);
			})}
		</tr>
	);
}

// Below `tablet`: the sort's pick over one Row per record.
function Phone(props: {
	columns: readonly TableColumn[];
	rows: readonly TableRecord[];
	sort: Sort | undefined;
	onSort: (sort: Sort) => void;
	selected: string | undefined;
	onOpen: ((id: string) => void) | undefined;
	chooser: Chooser | undefined;
	painted: boolean;
	more: Read<unknown> | undefined;
	// A record over the placeholder, the next page's painted rows.
	blank: TableRecord | undefined;
	warns: boolean;
	links: boolean;
	changes: boolean;
}) {
	const words = useWords();
	const { columns, sort, chooser } = props;
	// The sheet the rows stand on and window in.
	const box = useRef<HTMLDivElement>(null);
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
		<div className={SORT_BAR}>
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
		</div>
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
			// A tick draws a blocked reason itself (`Row`'s `check.blocked`);
			// the reason of a moved tick leads the row's meta.
			leading: chooser
				? {
						check: {
							checked: chooser.ticked(record.id),
							onChange: (on) => chooser.tick(record.id, on),
							blocked: record.blocked,
						},
					}
				: undefined,
			meta:
				meta.length || chooser
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
			selected: record.id === props.selected,
			// A row with `href` goes there; the others open through `onOpen`.
			onOpen: onOpen ? () => onOpen(record.id) : undefined,
		};
	};
	return (
		<>
			{pick}
			<SheetCard box={box}>
				<Rows
					drawn={
						painted
							? { painted: true, phase: "waiting", value: placeholderData() }
							: {
									painted: false,
									value: props.rows.map((one) => rowOf(one, false)),
								}
					}
					box={box}
					paint={
						painted && props.rows[0] ? rowOf(props.rows[0], true) : undefined
					}
				/>
				{props.more && props.blank ? (
					<MoreRow
						read={props.more}
						empty={props.rows.length === 0}
						inset
						paint={() => (
							<Rows
								drawn={{
									painted: true,
									phase: "waiting",
									value: placeholderData(),
								}}
								tail
								paint={props.blank ? rowOf(props.blank, true) : undefined}
							/>
						)}
					/>
				) : null}
			</SheetCard>
		</>
	);
}
