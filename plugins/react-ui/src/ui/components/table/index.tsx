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
	Dragged,
	DragSource,
	Fact,
	IconLinkAct,
	Reorder,
	StatusMark,
	TableCell,
	TableChoice,
	TableColumn,
	TablePick,
	TableRowSlots,
} from "@fcalell/ui-core/descriptors";
import { stepOf } from "@fcalell/ui-core/drag";
import { formatterFor } from "@fcalell/ui-core/format";
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
	columnAsked,
	columnWidth,
	firstDirection,
	gridFloor,
	hideable,
	idsChooser,
	isChangeCell,
	isEnd,
	isPick,
	isStatusCell,
	isTouchSplit,
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
	touchFacts,
	touchNamed,
	turnedOver,
} from "@fcalell/ui-core/list-state";
import { PAINT_ROWS, painting } from "@fcalell/ui-core/paint";
import {
	CARD,
	FIGURES,
	ROW_ACTS,
	ROW_CURRENT_BAR,
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
	type CSSProperties,
	type FocusEvent,
	type KeyboardEvent,
	type MouseEvent,
	memo,
	type PointerEvent,
	type ReactNode,
	use,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { IconAct, MenuEntry } from "../../lib/act.ts";
import { age, ageWidest } from "../../lib/age.ts";
import { useClock } from "../../lib/clock.ts";
import type { Closed } from "../../lib/closed.ts";
import { useColumns } from "../../lib/columns.ts";
import { draggedLabel, press, useDrop, useOffers } from "../../lib/drag.ts";
import type { Empty } from "../../lib/empty.tsx";
import type { CellFit } from "../../lib/field.ts";
import { PageTitle } from "../../lib/frame.ts";
import { useTouch } from "../../lib/media.ts";
import { MoreRow } from "../../lib/more.tsx";
import { follow, navigate } from "../../lib/navigate.ts";
import { Painted } from "../../lib/paint.tsx";
import {
	FrameBody,
	FrameLine,
	stillOf,
	useCollection,
} from "../../lib/read.tsx";
import {
	type Edge,
	edgeOf,
	type Movable,
	movesOf,
	stepKey,
	useMovable,
} from "../../lib/reorder.ts";
import { sameBy } from "../../lib/same-by.ts";
import { Turn } from "../../lib/turn.tsx";
import { Scroller, Window } from "../../lib/window.tsx";
import { useWords } from "../../lib/words.tsx";
import { IconActFace } from "../button/face.tsx";
import { ChipBase } from "../chip/base.tsx";
import { Icon } from "../icon/index.tsx";
import { HeldInput } from "../input/base.tsx";
import { MenuBase } from "../menu/base.tsx";
import { HeldPicker } from "../picker/base.tsx";
import { LockMark } from "../row/lock.tsx";
import { WarningMark } from "../row/marks.tsx";
import { SheetCard } from "../section/card.tsx";
import type { RowItem } from "../section/index.tsx";
import { Rows } from "../section/rows.tsx";
import { StatusBase } from "../status/base.tsx";
import { ChangeMark } from "../status/change.tsx";
import { HeldCheckbox } from "../switch/checkbox.tsx";
import { ColumnsMenu } from "./columns.tsx";

// The table fills what its column leaves. Where the density is desktop the grid
// stands; on touch the rows are a list under the sort's pick. Only the live form
// mounts, chosen by the density (`useTouch`).
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
const GRID = "w-full table-fixed";
const HEAD_CELL = "p-0 font-normal";
const START = "text-start";
const END = "text-end";
// The frozen columns stand over the cells that scroll beneath them: the tick
// column first, the leading column after it (at the tick column's width when
// the table chooses rows), the acts column at the end.
const FROZEN = "sticky z-1";
const FROZEN_AT = "left-0";
const FROZEN_AFTER_TICK = "left-target";
const FROZEN_END = "right-0";
// A cell focused under the acts column scrolls clear of it by the scroller's
// padding at its end: its icons (`--acts`).
const SCROLLS_END = "scroll-pe-[calc(var(--spacing-target)*var(--acts))]";
// An icon of the acts column takes a target of its own, so the icons of rows
// that have one and rows that have none stand in the same places. Its icon
// rises from the meta ink to the body ink while its row is hovered or holds
// focus.
const ACT_SLOT =
	"flex shrink-0 items-center justify-center w-target group-hover/row:*:text-ink-body group-focus-within/row:*:text-ink-body";
// The icons overflow the line's box centred, so a row with acts keeps the
// height of one without.
const ACTS_LINE = "flex items-center h-line-body";
// The tick column is a square the row's height, its tick centred. A row that
// carries a reason grows to the two-line row, in every cell of it.
const TICK_WIDTH = "w-target";
const TICK_BOX = "flex items-center justify-center";
// A row is a floor its line box and gaps grow past (never a set height): the
// row token, the two-line token for a row that carries a reason, and the
// control height under the header (its sort act is a control).
const FLOOR = "min-h-row";
const TALL = "min-h-[calc(var(--spacing-row)+var(--leading-meta))]";
const HEAD_FLOOR = "min-h-control";
// The leading cell's name over the reason a row's tick stands as it does.
const REASON_STACK = "flex flex-col min-w-0";
const SORT =
	"group/sort flex items-center w-full min-w-0 hover:bg-wash-hover active:bg-wash-press focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
const HEAD = "flex items-center gap-gap min-w-0";
// A header wraps between its words to a second line before it cuts, a word
// longer than its column breaking inside itself rather than standing cut; its
// column floor takes its longest word into account (`columnFloor`).
const LABEL = "min-w-0 line-clamp-2 wrap-break-word";
const GLYPH_SORTED = "flex shrink-0 text-ink-body";
// An unsorted column shows the both-ways arrow under the pointer and the
// keyboard.
const GLYPH_HINT =
	"invisible flex shrink-0 text-ink-meta group-hover/sort:visible group-focus-visible/sort:visible";
// The cell cursor rings inward; the grid holds one cell at tabindex 0. Every
// body cell sets tabular figures, so a column's digits line up whatever it holds.
const BODY_CELL = cn(
	FIGURES,
	"p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
);
const CELL = "flex items-center gap-gap min-w-0";
const CELL_END = "justify-end";
const VALUE = "truncate";
const WRAP = "break-words hyphens-auto";
const NOOP = () => {};
const CHANGE = "flex items-center min-w-0";
// A change in a column that wraps: its before and its after share the cell's width
// beside the arrow and wrap at their words, the arrow one item centred on the cell.
const CHANGE_WRAP = cn("min-w-0", WRAP);
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
// The bar over the grid: the read's total, formatted, in the meta ink at its start
// (a windowed read says how many rows it holds, the grid's scroll being the
// only other sign), the columns menu at its end.
const COLUMNS_BAR = "flex items-center justify-end";
const COUNT = "me-auto tabular-nums";
const TOTAL = formatterFor("number");
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
	/** The columns in order, the first the row's name, each reading its cell from the item. A header is never cut while it can wrap: it wraps between its words to a second line, and a column takes the room of its header's longest word where the short measure cannot hold it. A `chip` column with no `width` takes the room of its widest chip where the short measure cannot hold it, so a chip is never cut while a free text column has room. */
	columns: readonly TableColumn<T>[];
	/** The row's own slots, each read from the item: `editable` (false: its cells draw the plain value, no mark, no act, for a row that is simply not editable in place) and `locked` (the columns held read only, each drawing the lock, the hold of an open change set); `act` (the row's one icon act at its end, with its wiring) and `more` (its other acts), which draw an acts column at the grid's end and the keys on the active row (Shift+Enter runs the act, Enter too where the row opens nothing, the Context Menu key opens the menu); and `drop` (the row takes a drag, like a Shell place). */
	row: RowSlots<T, Q>;
	/** The rows can be dragged (a press that moves; a finger after a hold) onto a `drop`: a Shell place with one, or a row of another collection. A ticked row drags every row ticked, over a pick of the query too, an unticked one itself; what it carries is `{ kind, picked }`. Each drop that accepts the kind is also an entry in the rows' more menu, so a drag is never the pointer's alone. */
	drag?: DragSource;
	/** What the table says in its own box when its `items` selection answers none: the `sentence` and the act that makes the first row (an act that runs, or a `{ label, href }` that goes to a route), the form a `Section`'s `empty` draws. A constant from the parent: a screen with a filter on gives the sentence for it, so the table knows nothing of filters. Without it the generic sentence stands, with no act. */
	empty?: Empty;
	/** The rows can be moved within the grid while it is unsorted: the pointer lands a row at the line between two others (the page scrolls near its edges), Alt with Up, Down, Home or End moves the active row, and the more menu holds Move up, down, to top and to bottom. `onMove` hears the id and where it lands (`index`, and the ids it stands `after` and `before`); the grid shows the move at once and the order the read answers replaces it. */
	reorder?: Reorder;
	/** The table's accessible name (a short phrase), for a page that holds more than one table; without it the page's title names the grid. */
	label?: string;
	/** The open record's id, washed as selected. */
	selected?: string;
	/** The id of the current row, the one a list stands at beside the open record (what is playing, the step a run is at): the current bar at its start, as the open row of a list carries it, and `aria-current` for assistive tech. On touch the row is current in a list row's way, the bar and the wash. */
	current?: string;
}

/** The rows the viewer ticks. */
type Chooses<T, Q> =
	| { choose?: undefined }
	| {
			/** The rows the viewer ticks: a tick column leads the grid (its head tick over the rows that can be ticked) and, on touch, each row's leading is its tick. `chosen` is the ticked ids and `onChange` hears the set a tick makes, which the consumer applies its rule to and hands back through `chosen`; `blocked` and `moved` give a row's reason under its leading cell. Over a paginated read (`pages` or `window`), `{ picked, onPick, … }` holds a `Picked` instead: the head tick chooses the read's query, every row it matches loaded or not, and a tick then unticks a row (`except`); a mutation takes `picked` whole (`selector()` of plugin-api). A filter that changes the query ends a pick of the old one. The acts that apply to the rows ticked are the Pane's `foot`, an `ActionBar` with `chosen` (the count: the ticked and the rows that can be ticked, M, and a select-all that hears the set both make) the consumer gives it. */
			choose: TableChoice<T> | TablePick<T, Q>;
	  };

interface Reads {
	/** Opens a record: a press on its row, Enter on its leading cell. */
	onOpen?: (id: string) => void;
	onEdit?: never;
}

interface Edits {
	/** Opens a record: a press on its row, Enter on its leading cell. A Table whose columns edit takes it, since a phone edits through the record it shows. */
	onOpen: (id: string) => void;
	/** Hears one committed edit of a cell whose column edits; a phone edits through the record `onOpen` shows. Return the save's promise and the cell's control holds the viewer's value while it pends; a refusal puts it back, with its reason. */
	onEdit?: (id: string, key: string, value: CellValue) => unknown;
}

/** The Table's row slots: ui-core's, whose `act` and `more` the platform widens with the `sheet` an act may open. */
export type RowSlots<T, Q = unknown> = Omit<
	TableRowSlots<T, Q>,
	"act" | "more"
> & {
	act?: (item: T) => IconAct | IconLinkAct | undefined;
	more?: (item: T) => readonly MenuEntry[] | undefined;
};

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

/** Where the density is desktop a grid: a header of sortable acts (the table sorts in its own state: newest or largest first, then turned over, then off) over one row per record, its leading cell the record's name (its row's change mark, when it has one, ahead of it and its warning after it); a `chip` column draws each cell on the column's `family`, or on its own where the cell returns `{ label, family }`; its columns never squeeze below the short measure (the grid stands at least `gridFloor` wide) and, when its column is narrower, the grid scrolls sideways on every pointer under its frozen leading column. Its keyboard is a cell cursor (one Tab stop, the arrows, Home and End; Enter opens the row from its leading cell or edits an editable cell, Escape leaves an edit); a press on a row opens it, a press on an editable value edits it in place, typed in an `Input`. On touch one `Row` per record (its leading cell the title, its change the row's mark, its first age trailing and a further one a fact that says its column, "Seen: 1 day ago", each status column a status badge with its tone mark, the first leading, a table with several saying their column, "Staging: Passing", as does any words value of a kind that stands in more than one column, "Observed: usd"; warning and chip the marks, the other values its facts, a value longer than a fact holds (the short measure, its label with it) said whole in the row's line instead) under the sort's pick. Over a paginated read whose procedure declares `sort` the header sorts through the read's input (the server orders the whole query, and a column the procedure does not name does not sort); over a window read under a scroller the grid is as long as the read's total, mounts the rows in view and loads the pages they stand in wherever the scrollbar lands (rows not loaded yet stand painted), and a changed query keeps the previous rows drawn until its first page lands; over a cursor read that scrolls (`VIRTUAL_FROM` rows) the next page loads as the end nears. While the `items` selection's read waits, `PAINT_ROWS` rows stand in the columns the table declares (the slots are run over the placeholder), the header constant over them, each cell painted by its column's kind and the rows inert, busy only while the read waits (a read not asked for yet stands painted and still); the touch list paints the same records as its rows. The table is a frame of its items: it draws the failed form with Retry, the missing form and the empty form (its `empty`, else the generic sentence) in its own box, and the stale and paused line above its rows while it holds its read, whatever stands above it. With `choose` it ticks rows; the acts that apply to them are the Pane's `foot`, a selection bar the consumer gives (an `ActionBar` with `chosen`). On touch the rows stand on a hairline sheet like any list's, the sort's pick bare above it. */
export function Table<T, Q = unknown>(props: TableProps<T, Q>) {
	const { selected, current, onOpen, onEdit, choose } = props;
	const rootBox = useRef<HTMLDivElement | null>(null);
	const wide = !useTouch();
	const scroll = use(Scroller);
	const [picked, setSort] = useState<Sort>();
	// The columns the viewer has shown (the consumer's `hidden` under what the
	// viewer chose, kept per table); a sort on a column that is hidden is off.
	const {
		shown: visible,
		choice,
		toggle,
		reset,
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
	// The widening of `act` and `more` by the sheet an act may open is the
	// platform's; the records are ui-core's.
	const slots = props.row as unknown as TableRowSlots<T, Q>;
	const { drawn, frame } = useCollection(items$);
	// A window read under a scroller, in the grid: the rows stand at their
	// places in a scroller sized to the total, and the pages the view covers load.
	const view = useWindow(windowRead);
	const virtual = windowRead !== undefined && scroll !== null && wide;
	// Painted, `PAINT_ROWS` records over the placeholder, in the order the
	// data would arrive. A window keeps the previous query's rows drawn until
	// the new query's first page lands.
	const painted = virtual ? view === undefined : drawn.painted;
	const loaded: readonly T[] = painted
		? Array.from({ length: PAINT_ROWS }, () => drawn.value as T)
		: (drawn.value as readonly T[]);
	const made = painted
		? tableRecords(loaded, columns, slots, props.choose, true)
		: virtual && view
			? placed(
					view.rows as readonly T[],
					view.total,
					columns,
					slots,
					props.choose,
				)
			: tableRecords(loaded, columns, slots, props.choose);
	const arranged: readonly (TableRecord | undefined)[] =
		painted || virtual || sorting
			? made
			: sorted(made as TableRecord[], columns, sort);
	// The rows the viewer has moved stand where they moved them to, until the
	// data answers another order; a grid sorted by a column has no order of its own to move.
	const { rows: records, movable } = useMovable({
		reorder: props.reorder,
		on: !painted && sort === undefined,
		source: virtual ? view?.rows : drawn.value,
		rows: arranged,
		idOf: recordId,
		box: rootBox,
	});
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
				slots,
				props.choose,
				true,
			)[0]
		: undefined;
	// The acts column stands when the rows have an act or a menu: their own
	// `more`, the drops that accept what they drag, the moves of a table that reorders.
	const offered = useOffers(props.drag?.kind, OFFER).length > 0;
	const menu = props.row.more !== undefined || movable !== undefined || offered;
	let form: ReactNode;
	if (wide) {
		form = (
			<Grid
				columns={columns}
				rows={records}
				sort={sort}
				onSort={(column) => setSort((current) => nextSort(current, column))}
				selected={selected}
				chooser={chooser}
				current={current}
				onOpen={onOpen}
				onEdit={onEdit}
				painted={painted}
				busy={frame.holds && frame.form === "waiting"}
				more={virtual ? undefined : more}
				onRange={virtual ? onRange : undefined}
				label={props.label}
				drag={props.drag}
				movable={movable}
				hasAct={props.row.act !== undefined}
				menu={menu}
			/>
		);
	} else {
		const list = (
			<Phone
				columns={columns}
				rows={standing}
				sort={sort}
				onSort={setSort}
				selected={selected}
				onOpen={onOpen}
				chooser={chooser}
				current={current}
				painted={painted}
				more={more}
				blank={blank}
				drag={props.drag}
				movable={movable}
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
		<div ref={rootBox} data-still={stillOf(frame)} className={ROOT}>
			<FrameBody frame={frame} empty={props.empty}>
				<FrameLine frame={frame} />
				{wide && (hideable(props.columns) || total !== undefined) ? (
					<div className={COLUMNS_BAR}>
						{total === undefined ? null : (
							<span className={cn(text({ role: "meta" }), COUNT)}>
								{TOTAL.format(total)}
							</span>
						)}
						{hideable(props.columns) ? (
							<ColumnsMenu
								columns={props.columns}
								choice={choice}
								onToggle={toggle}
								onReset={reset}
							/>
						) : null}
					</div>
				) : null}
				{form}
			</FrameBody>
		</div>
	);
}

// Only whether a drop accepts the kind is asked of it, so no row is read.
const OFFER = (): Dragged => ({ kind: "", picked: { ids: [] } });

const recordId = (record: TableRecord | undefined) => record?.id;

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
	// What a drag of the row carries now: the pick when the row is in it.
	dragged: (id: string) => Dragged;
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
	current: boolean;
	ticked: boolean;
	opens: boolean;
	edits: boolean;
	// The cursor's column in this row, else -1, and its edit.
	cursor: number;
	editing: Editing | undefined;
	// The acts column: whether the table's rows have an act, a menu.
	hasAct: boolean;
	menu: boolean;
	// What the row drags (the kind), and the order it moves in with its place.
	kind: string | undefined;
	movable: Movable | undefined;
	edge: Edge | undefined;
	actions: GridActions;
}) {
	const { row, index, columns, choosing, opens, actions } = props;
	// A drag over a row that takes it, and a ticked row, wash it as the open record is, in the neutral wash.
	const { mark, over } = useDrop(row.drop, row.href);
	const chosen = props.chosen || over || props.ticked;
	const lead = columns[0];
	const name = lead ? shown(lead, row.cells[lead.key]) : "";
	const shift = choosing ? 1 : 0;
	const reason = chooseReason(row);
	return (
		<tr
			aria-rowindex={index + 2}
			aria-selected={props.chosen || props.ticked || undefined}
			aria-current={props.current ? "true" : undefined}
			onClick={(event) => actions.click(event, row)}
			{...mark}
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
					current={props.current}
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
					current={props.current && place === 0 && !choosing}
					reason={reason}
					chosen={chosen}
					opens={opens}
					here={props.cursor === place + shift}
					editing={props.cursor === place + shift ? props.editing : undefined}
					actions={actions}
				/>
			))}
			{props.hasAct || props.menu ? (
				<ActsCell
					row={row}
					name={name}
					place={columns.length + shift}
					here={props.cursor === columns.length + shift}
					chosen={chosen}
					opens={opens}
					hasAct={props.hasAct}
					menu={props.menu}
					kind={props.kind}
					movable={props.movable}
					edge={props.edge}
					actions={actions}
				/>
			) : null}
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
	current: boolean;
	tall: boolean;
	chosen: boolean;
	opens: boolean;
	here: boolean;
	actions: GridActions;
}) {
	const { row, actions } = props;
	const box = cn(TICK_BOX, props.tall ? TALL : FLOOR);
	const cell = cn(
		BODY_CELL,
		TABLE_FROZEN,
		FROZEN,
		FROZEN_AT,
		props.current && ROW_CURRENT_BAR,
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
			className={cell}
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

// A row's acts cell, at the grid's end and frozen there: its icon act, then
// its more menu (its own entries, the drops that take what it drags, the
// moves). One cursor stop like any cell; its icons stand out of the Tab order,
// and the keys on the active row press them (Shift+Enter, the Context Menu key).
function ActsCell(props: {
	row: TableRecord;
	name: string;
	place: number;
	here: boolean;
	chosen: boolean;
	opens: boolean;
	hasAct: boolean;
	menu: boolean;
	kind: string | undefined;
	movable: Movable | undefined;
	edge: Edge | undefined;
	actions: GridActions;
}) {
	const { row, actions } = props;
	const words = useWords();
	const offers = useOffers(props.kind, () => actions.dragged(row.id));
	const moves = props.movable
		? movesOf(words, props.movable, row.id, props.edge)
		: [];
	const items: MenuEntry[] = [...(row.more ?? []), ...offers, ...moves];
	const box = cn(TICK_BOX, FLOOR);
	const cell = cn(
		BODY_CELL,
		TABLE_FROZEN,
		FROZEN,
		FROZEN_END,
		tableFrozenCell({
			state: props.chosen ? "selected" : "rest",
			edge: "start",
		}),
		props.opens && (props.chosen ? FROZEN_CHOSEN_PRESS : FROZEN_PRESS),
		props.chosen ? FROZEN_CHOSEN_ACTIVE : FROZEN_ACTIVE,
	);
	return (
		<td
			data-row={row.id}
			data-column={props.place}
			data-acts=""
			tabIndex={props.here ? 0 : -1}
			className={cell}
		>
			<div className={box}>
				<span className={cn(ACTS_LINE, ROW_ACTS)}>
					{props.hasAct ? (
						<span data-act="" className={ACT_SLOT}>
							{row.act ? (
								<IconActFace
									act={row.act as IconAct | IconLinkAct}
									tabIndex={-1}
								/>
							) : null}
						</span>
					) : null}
					{props.menu ? (
						<span data-more="" className={ACT_SLOT}>
							{items.length ? (
								<MenuBase
									label={`${words.more} ${props.name}`}
									title={props.name}
									items={items}
									tabIndex={-1}
								/>
							) : null}
						</span>
					) : null}
				</span>
			</div>
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
	// The row is current and this cell starts it: the leading cell, when no tick column does.
	current: boolean;
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
	);
	const pinned =
		props.frozen &&
		cn(
			TABLE_FROZEN,
			FROZEN,
			props.shifted ? FROZEN_AFTER_TICK : FROZEN_AT,
			tableFrozenCell({
				state: props.chosen ? "selected" : "rest",
				edge: "end",
			}),
			props.opens && (props.chosen ? FROZEN_CHOSEN_PRESS : FROZEN_PRESS),
			props.chosen ? FROZEN_CHOSEN_ACTIVE : FROZEN_ACTIVE,
		);
	return (
		<td
			data-row={row.id}
			data-column={place}
			data-edit={control}
			tabIndex={props.here ? 0 : -1}
			onPointerEnter={control ? () => setHovered(true) : undefined}
			onPointerLeave={control ? () => setHovered(false) : undefined}
			className={cn(BODY_CELL, props.current && ROW_CURRENT_BAR, pinned)}
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
	onSort: (column: TableColumn) => void;
	selected: string | undefined;
	current: string | undefined;
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
	drag: DragSource | undefined;
	movable: Movable | undefined;
	// The acts column: the rows have an act, a menu.
	hasAct: boolean;
	menu: boolean;
}) {
	const { columns, rows, sort, painted, chooser } = props;
	const words = useWords();
	// A tick column leads the cursor's columns: the leading cell is its
	// column `shift`.
	const shift = chooser ? 1 : 0;
	// The acts column follows the columns: the cursor's last stop.
	const acting = props.hasAct || props.menu;
	const actsAt = shift + columns.length;
	const acts = (props.hasAct ? 1 : 0) + (props.menu ? 1 : 0);
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
		column: Math.min(
			cursor.column,
			Math.max(columns.length - 1 + shift + (acting ? 1 : 0), 0),
		),
	};
	const edits = props.onEdit !== undefined;
	// The characters of each chip column's widest chip among the rows loaded,
	// so the fixed grid gives the column the room its chips take.
	const fits = useMemo(
		() =>
			columns.map((column) => {
				if (column.kind !== "chip") return 0;
				let widest = 0;
				for (const row of rows) {
					const chip = chipOf(column, row?.cells[column.key]);
					if (chip) widest = Math.max(widest, chip.label.length);
				}
				return widest;
			}),
		[columns, rows],
	);

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
		// The tick column has no field, nor has the acts column.
		const place = column - shift;
		const field = columns[place];
		const onActs = acting && column === actsAt;
		if (!record || (!field && column >= shift && !onActs)) return;
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
		// Alt with Up, Down, Home or End moves the row where the pointer would.
		const step = props.movable ? stepKey(event) : undefined;
		if (step && props.movable) {
			event.preventDefault();
			const moved = stepOf(props.movable.ids(), record.id, step);
			if (moved) {
				props.movable.move(record.id, moved);
				focusCell(moved.index, column);
			}
			return;
		}
		// The Context Menu key (or Shift+F10) opens the row's menu.
		if (
			event.key === "ContextMenu" ||
			(event.shiftKey && event.key === "F10")
		) {
			event.preventDefault();
			pressIn(cell, "[data-more] button");
			return;
		}
		const to = moveCursor(event.key, { row, column }, event.ctrlKey, {
			rows: rows.length,
			columns: columns.length + shift + (acting ? 1 : 0),
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
		// The acts cell presses its act, else its menu.
		if (onActs) {
			if (!enter && !space) return;
			event.preventDefault();
			pressIn(
				cell,
				record.act ? "[data-act] :is(button, a)" : "[data-more] button",
			);
			return;
		}
		// Shift+Enter runs the row's act from any cell; Enter does where the
		// row opens nothing (and the cell is not the tick's, which Enter ticks).
		if (
			enter &&
			record.act &&
			(event.shiftKey ||
				(field && props.onOpen === undefined && record.href === undefined))
		) {
			event.preventDefault();
			pressIn(cell, "[data-act] :is(button, a)");
			return;
		}
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
		// Space is not claimed.
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
	// Presses the control a row's acts cell holds: what a key on the row does is
	// what a press on it does, wiring and all.
	const pressIn = (cell: HTMLElement, control: string) =>
		cell.closest("tr")?.querySelector<HTMLElement>(control)?.click();
	// What a drag of a row carries: the pick when it is ticked, else itself.
	const dragged = (id: string): Dragged => ({
		kind: props.drag?.kind ?? "",
		picked: chooser?.ticked(id) ? chooser.pick : { ids: [id] },
	});
	// A press that moves a row drags it, to a drop or within the grid.
	const onPointerDown = (event: PointerEvent) => {
		if (!props.drag && !props.movable) return;
		const cell = (event.target as Element).closest<HTMLElement>("td[data-row]");
		if (!cell || !frame.current?.contains(cell)) return;
		if (cell.hasAttribute("data-choose") || cell.hasAttribute("data-acts"))
			return;
		const id = cell.dataset.row ?? "";
		press(event, () => {
			const record = rows.find((one) => one?.id === id);
			if (!record) return undefined;
			const ticked =
				chooser?.ticked(id) === true && record.blocked === undefined;
			const lead = columns[0];
			const name = lead ? shown(lead, record.cells[lead.key]) : id;
			const count = ticked ? (chooser?.count ?? 1) : 1;
			return {
				drag: props.drag && dragged(id),
				label: draggedLabel(words, name, count),
				reorder:
					props.movable && count <= 1 ? { id, ...props.movable } : undefined,
			};
		});
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
		if (target.closest("td[data-choose], td[data-acts], a")) return;
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
		dragged,
	});
	latest.current = {
		start,
		done,
		edit,
		click: onClick,
		home: cellAt,
		tick,
		dragged,
	};
	const [actions] = useState<GridActions>(() => ({
		dragged: (id) => latest.current.dragged(id),
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
				acts={acting}
			/>
		) : (
			<Row
				key={row.id}
				row={row}
				index={index}
				columns={columns}
				chosen={row.id === props.selected}
				current={row.id === props.current}
				choosing={chooser !== undefined}
				ticked={chooser?.ticked(row.id) ?? false}
				opens={opens || row.href !== undefined}
				edits={edits}
				cursor={index === at.row ? at.column : -1}
				editing={index === at.row ? editing : undefined}
				hasAct={props.hasAct}
				menu={props.menu}
				kind={props.drag?.kind}
				movable={props.movable}
				edge={props.movable ? edgeOf(index, rows.length) : undefined}
				actions={actions}
			/>
		);
	};

	return (
		<div className={FORM}>
			<div
				ref={frame}
				className={cn(
					CARD,
					FRAME,
					chooser ? SCROLLS_TICKED : SCROLLS,
					acting && SCROLLS_END,
				)}
				style={acting ? ({ "--acts": acts } as CSSProperties) : undefined}
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
					onPointerDown={onPointerDown}
					// The leading link is not dragged by the browser: the press drags the row.
					onDragStart={
						props.drag || props.movable
							? (event) => event.preventDefault()
							: undefined
					}
					style={{
						minWidth: gridFloor(
							columns,
							chooser !== undefined,
							acts,
							ageWidest(),
							fits,
						),
					}}
					className={cn(TABLE, GRID)}
				>
					<Cols
						columns={columns}
						choosing={chooser !== undefined}
						acts={acts}
						fits={fits}
					/>
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
									onSort={() => props.onSort(column)}
								/>
							))}
							{acting ? (
								<th
									scope="col"
									className={cn(
										HEAD_CELL,
										cn(TABLE_FROZEN, FROZEN, FROZEN_END),
									)}
								>
									{/* The header names the column in text (axe: a th needs
									    text), visually hidden: the acts' icons say the rest. */}
									<div
										className={cn(
											HEAD_FLOOR,
											tableFrozenCell({ state: "rest", edge: "start" }),
										)}
									>
										<span className="sr-only">{words.actions}</span>
									</div>
								</th>
							) : null}
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
						<MorePage
							columns={columns}
							choosing={chooser !== undefined}
							acts={acts}
							fits={fits}
						/>
					)}
				/>
			) : null}
		</div>
	);
}

// The grid's columns, at the widths its cells keep; the acts column a target
// for each icon it holds.
function Cols(props: {
	columns: readonly TableColumn[];
	choosing: boolean;
	acts: number;
	// The characters of each chip column's widest chip, by column.
	fits?: readonly number[];
}) {
	return (
		<colgroup>
			{props.choosing ? <col className={TICK_WIDTH} /> : null}
			{props.columns.map((column, at) => {
				// A column whose header has a word the short measure cannot hold, or a
				// figure column with no width, stands at its own floor
				// (`columnAsked`), the others at their width.
				const asked = columnAsked(column, ageWidest(), props.fits?.[at]);
				const width = columnWidth(column);
				return (
					<col
						key={column.key}
						className={width && !asked ? WIDTH[width] : undefined}
						style={asked ? { width: asked } : undefined}
					/>
				);
			})}
			{props.acts > 0 ? (
				<col style={{ width: `calc(var(--spacing-target) * ${props.acts})` }} />
			) : null}
		</colgroup>
	);
}

// The next page while it loads: `PAINT_ROWS` painted rows at the grid's
// columns, in a grid of their own under the loaded one.
function MorePage(props: {
	columns: readonly TableColumn[];
	choosing: boolean;
	acts: number;
	fits: readonly number[];
}) {
	return (
		<div
			aria-hidden
			className={cn(CARD, FRAME, props.choosing ? SCROLLS_TICKED : SCROLLS)}
		>
			<table
				style={{
					minWidth: gridFloor(
						props.columns,
						props.choosing,
						props.acts,
						ageWidest(),
						props.fits,
					),
				}}
				className={cn(TABLE, GRID)}
			>
				<Cols
					columns={props.columns}
					choosing={props.choosing}
					acts={props.acts}
					fits={props.fits}
				/>
				<tbody className={BODY_ROWS}>
					{Array.from({ length: PAINT_ROWS }, (_, index) => (
						<PaintedRow
							// biome-ignore lint/suspicious/noArrayIndexKey: the painted rows are fixed stand-ins
							key={index}
							index={index}
							columns={props.columns}
							choosing={props.choosing}
							acts={props.acts > 0}
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
	const edge = frozen && tableFrozenCell({ state: "rest", edge: "end" });
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
			return <StatusBase tone={status.tone} label={status.label} />;
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
								column.wrap ? CHANGE_WRAP : VALUE,
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
								column.wrap ? CHANGE_WRAP : VALUE,
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
			return chip ? <ChipBase family={chip.family} label={chip.label} /> : null;
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
				<span className={cn(text({ role: "body" }), VALUE)}>
					{shown(column, cell)}
				</span>
			);
		case "age":
			return (
				<span className={cn(text({ role: "meta" }), VALUE)}>
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
			return <ChipBase family={column.family} label="" painted />;
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
	// The acts column stands, empty, so the loaded row lands in the same boxes.
	acts: boolean;
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
								frozen && tableFrozenCell({ state: "rest", edge: "end" }),
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
			{props.acts ? (
				<td className={cn(BODY_CELL, TABLE_FROZEN, FROZEN, FROZEN_END)}>
					<div
						className={cn(
							TICK_BOX,
							FLOOR,
							tableFrozenCell({ state: "rest", edge: "start" }),
						)}
					/>
				</td>
			) : null}
		</tr>
	);
}

// On touch: the sort's pick over one Row per record.
function Phone(props: {
	columns: readonly TableColumn[];
	rows: readonly TableRecord[];
	sort: Sort | undefined;
	onSort: (sort: Sort) => void;
	selected: string | undefined;
	current: string | undefined;
	onOpen: ((id: string) => void) | undefined;
	chooser: Chooser | undefined;
	painted: boolean;
	more: Read<unknown> | undefined;
	// A record over the placeholder, the next page's painted rows.
	blank: TableRecord | undefined;
	drag: DragSource | undefined;
	movable: Movable | undefined;
	warns: boolean;
	links: boolean;
	changes: boolean;
}) {
	const words = useWords();
	const { columns, sort, chooser } = props;
	// The sheet the rows stand on and window in.
	const box = useRef<HTMLDivElement>(null);
	const [leading, ...rest] = columns;
	// Every status column is a status badge, its tone mark before its word; the
	// first leads the row's facts. Several say their column ("Staging: Passing"),
	// as the words of any kind that stands more than once do (`touchNamed`).
	const statuses = rest.filter((column) => column.kind === "status");
	const chip = rest.find((column) => column.kind === "chip");
	const ageColumn = rest.find((column) => column.kind === "age");
	const meta = rest.filter(
		(column) =>
			column.kind !== "status" && column !== chip && column !== ageColumn,
	);
	// A column of changes (a value before and after) and a column that wraps (a
	// sentence a cut badge would hide) are the row's line, not facts.
	const sentence = (column: TableColumn) =>
		column.kind === "change" || column.wrap === true;
	const lined = meta.some(sentence);
	const stated = meta.filter((column) => column.wrap !== true);
	// The columns whose values say their label: each of several alike.
	const named = touchNamed(stated);
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
					leading: column === sortedBy ? { icon: arrow } : undefined,
				}))}
				value={sortedBy?.key}
				onChange={(key) => {
					const column = sortable.find((each) => each.key === key);
					if (!column) return;
					props.onSort(
						sort?.key === key
							? { key, direction: turnedOver(sort.direction) }
							: { key, direction: firstDirection(column) },
					);
				}}
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
		// The facts in the order the row leads with them: the statuses, what is
		// wrong, the chip, then the other values.
		const facts: Fact[] = [];
		for (const status of statuses) {
			const state = slot((one) => {
				if (painted) return { tone: "done" as const, label: "" };
				const cellOf = cell(one, status);
				if (!isStatusCell(cellOf)) return undefined;
				const word = cellOf.label ?? words[cellOf.tone];
				return {
					tone: cellOf.tone,
					label: statuses.length > 1 ? `${status.label}: ${word}` : word,
				};
			});
			if (state) facts.push(state);
		}
		if (props.warns && record.warning !== undefined)
			facts.push({ warning: record.warning });
		if (chip?.kind === "chip") {
			const kind = slot((one) => {
				if (painted) return { family: chip.family, label: "" };
				return chipOf(chip, cell(one, chip));
			});
			if (kind) facts.push(kind);
		}
		// The values too long to stand as a fact (`touchFacts`), said whole in the
		// row's line.
		const long: string[] = [];
		if (stated.length || chooser) {
			const split = slot((one) => {
				const parts = stated
					.filter((column) => !isChangeCell(cell(one, column)))
					.map((column) => {
						const at = cell(one, column);
						if (column.kind === "number" && at !== null && at !== undefined)
							return `${column.label} ${at}`;
						const word = isStatusCell(at)
							? (at.label ?? words[at.tone])
							: shown(column, at);
						return named.has(column.key) && word !== ""
							? `${column.label}: ${word}`
							: word;
					})
					.filter((part) => part !== "");
				// The tick draws a blocked reason itself; with none, the rule's
				// move is the reason.
				const moved = one.blocked === undefined ? chooseReason(one) : undefined;
				const split = touchFacts(parts, moved);
				return split.facts.length || split.said.length ? split : undefined;
			});
			// A slot that threw over the filler is one filler fact.
			if (isTouchSplit(split)) {
				facts.push(...split.facts);
				long.push(...split.said);
			} else if (split !== undefined) facts.push("");
		}
		// What changed is a sentence ("Payload None → 1 page"), and so is a wrap
		// column's text and a value too long for a fact: never a fact, the row's
		// `line`, wrapping whole where touch cannot read a cut badge, the sentences
		// joined by "; ". A painted row paints its one filler where such a column
		// stands.
		const said = lined
			? painted
				? ""
				: [
						...long,
						...meta
							.filter(sentence)
							.map((column) => {
								const at = cell(record, column);
								if (isChangeCell(at)) return changeMeta(at, words);
								return shown(column, at);
							})
							.filter((part) => part !== ""),
					].join("; ")
			: !painted && long.length > 0
				? long.join("; ")
				: undefined;
		return {
			key: record.id,
			title: slot((one) =>
				leading ? shown(leading, cell(one, leading)) : one.id,
			),
			// A tick draws a blocked reason itself (`Row`'s `check.blocked`);
			// the reason of a moved tick leads the row's facts.
			leading: chooser
				? {
						check: {
							checked: chooser.ticked(record.id),
							onChange: (on) => chooser.tick(record.id, on),
							blocked: record.blocked,
						},
					}
				: undefined,
			facts: facts.length ? facts : undefined,
			line: said === "" && !painted ? undefined : said,
			// The row words its age moment and keeps it current itself.
			trailing: ageColumn
				? slot((one) => {
						if (painted) return { age: "" };
						const when = cell(one, ageColumn);
						return typeof when === "string" ? { age: when } : undefined;
					})
				: undefined,
			change: props.changes ? record.change : undefined,
			href: props.links ? record.href : undefined,
			// The row's act and menu, and the drag it carries and the drop it is.
			act: painted
				? undefined
				: (record.act as IconAct | IconLinkAct | undefined),
			more: painted ? undefined : record.more,
			drag: painted
				? undefined
				: props.drag && {
						kind: props.drag.kind,
						picked: chooser?.ticked(record.id)
							? chooser.pick
							: { ids: [record.id] },
					},
			drop: painted ? undefined : record.drop,
			// The open record is current; the others, at their `href`.
			selected:
				record.id === props.selected ||
				record.id === props.current ||
				undefined,
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
					movable={props.movable}
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
