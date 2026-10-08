import { Field } from "@base-ui/react/field";
import { cn } from "@fcalell/ui-core/cn";
import type {
	CellValue,
	ChangeKind,
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
import {
	FIGURES,
	skeleton,
	TABLE,
	TABLE_CELL,
	TABLE_CHANGE,
	TABLE_EMPTY,
	TABLE_FRAME,
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
import {
	type FocusEvent,
	type KeyboardEvent,
	type MouseEvent,
	memo,
	type ReactNode,
	use,
	useMemo,
	useRef,
	useState,
} from "react";
import { age } from "../../lib/age.ts";
import { useClock } from "../../lib/clock.ts";
import type { Closed } from "../../lib/closed.ts";
import { CellField, LabelTarget } from "../../lib/field.ts";
import { PageTitle } from "../../lib/frame.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { useTouch } from "../../lib/media.ts";
import { follow, navigate } from "../../lib/navigate.ts";
import { usePageTablet } from "../../lib/page.ts";
import { SectionContext } from "../../lib/section.ts";
import { useWords } from "../../lib/words.tsx";
import { Checkbox } from "../checkbox/index.tsx";
import { Chip } from "../chip/index.tsx";
import { EmptyStateBase } from "../empty-state/base.tsx";
import { Icon } from "../icon/index.tsx";
import { Input } from "../input/index.tsx";
import { List, type RowSlots } from "../list/index.tsx";
import { LockMark } from "../list-row/lock.tsx";
import { WarningMark } from "../list-row/marks.tsx";
import { Missing } from "../missing/index.tsx";
import { PickerBase } from "../picker/base.tsx";
import type { QueryLike } from "../query-boundary/index.tsx";
import { StatusBase } from "../status/base.tsx";
import { ChangeMark } from "../status/change.tsx";
import { Status } from "../status/index.tsx";

// The table fills what its page's body leaves, so an empty one's EmptyState
// centres under the header. From `tablet` of its page the grid stands; below
// it the rows are a list under the sort's pick. Only the live form mounts,
// chosen from the page's width (`usePageTablet`).
const ROOT = "flex flex-col grow";
const FORM = "flex flex-col grow";
// The grid is its own stacking context, so its frozen column stands over its
// cells alone, never over a sheet or a floating act.
const FRAME = "flex flex-col isolate";
// On touch every column stands at one width and the grid scrolls sideways
// under its frozen leading column.
const SCROLLS = "overflow-x-auto";
const FIT = "w-full table-fixed";
const MAX = "w-max table-fixed";
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
const TICK_WIDTH = "w-row";
const TICK_BOX = "flex items-center justify-center min-h-row";
const TALL = "min-h-row-2";
// The leading cell's name over the reason a row's tick stands as it does.
const REASON_STACK = "flex flex-col min-w-0";
const SORT =
	"group/sort flex items-center w-full min-w-0 hover:bg-wash-hover active:bg-wash-press focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
const HEAD = "flex items-center gap-inside min-w-0";
const LABEL = "truncate";
const GLYPH_SORTED = "flex shrink-0 text-ink-body";
// An unsorted column shows the both-ways arrow under the pointer and the
// keyboard.
const GLYPH_HINT =
	"hidden shrink-0 text-ink-meta group-hover/sort:flex group-focus-visible/sort:flex";
// The cell cursor rings inward; the grid holds one cell at tabindex 0.
const BODY_CELL =
	"p-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
const SKELETON_CELL = "p-0";
const CELL = "flex items-center gap-inside min-w-0";
const CELL_END = "justify-end";
const VALUE = "truncate";
const CHANGE = "flex items-center min-w-0";
// The leading cell's change mark and the name (with the reason under it) side
// by side, the mark centred on the name's own line.
const CHANGE_LEAD = "flex items-start min-w-0";
const MARK_LINE = "flex shrink-0 items-center h-line-body";
const TICK = "flex shrink-0 text-ink-body";
// The empty slot spans the grid: a framed EmptyState stands across it, an
// unframed one centres in what the page's body leaves.
const EMPTY = "flex flex-col grow";
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
const SORT_BAR = "flex items-center justify-end";

// A desktop column's width: its measure, its share, or what the others
// leave; a touch column stands at the short measure.
const WIDTH: Record<NonNullable<TableColumn["width"]>, string> = {
	"measure-short": "w-measure-short",
	measure: "w-measure",
	"1/4": "w-1/4",
	"1/3": "w-1/3",
	"1/2": "w-1/2",
	"2/3": "w-2/3",
	"3/4": "w-3/4",
};
const TOUCH_WIDTH = "w-measure-short";

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

/** Where a table's records come from. */
type TableSource<T> =
	| {
			/** The query whose items the rows draw. */
			query: QueryLike<readonly T[]>;
			/** What failed to load, over the retry act (a sentence; wraps). */
			sentence: string;
			items?: never;
			loading?: never;
	  }
	| {
			/** The items the rows draw. */
			items: readonly T[];
			/** The items are on their way (a compound body's loading form): the rows wait. */
			loading?: boolean;
			query?: never;
			sentence?: never;
	  };

interface TableBase<T> extends Closed {
	/** The columns in order, the first the row's name, each reading its cell from the item. */
	columns: readonly TableColumn<T>[];
	/** The row's own slots, each read from the item. */
	row: TableRowSlots<T>;
	/** The open record's id, washed as selected. */
	selected?: string;
	/** The rows the viewer ticks: a tick column leads the grid (its head tick over the rows that can be ticked) and, below `tablet`, each row's leading is its tick. `chosen` is the ticked ids and `onChange` hears the set a tick makes, which the consumer applies its rule to and hands back through `chosen`; `blocked` and `moved` give a row's reason under its leading cell. */
	choose?: TableChoice<T>;
	/** What the table holds while it has no rows, an `EmptyState`. */
	empty?: ReactNode;
}

interface Reads {
	/** Opens a record: a press on its row, Enter on its leading cell. */
	onOpen?: (id: string) => void;
	onEdit?: never;
}

interface Edits {
	onOpen: (id: string) => void;
	/** Hears one committed edit of a cell whose column edits; a phone edits through the record `onOpen` shows. */
	onEdit?: (id: string, key: string, value: CellValue) => void;
}

/** Records in columns, from a query or from items. */
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

// Focus inside an open edit: an Input's value or a Picker's trigger.
const inEdit = (target: HTMLElement) =>
	target instanceof HTMLInputElement ||
	target.closest("[aria-haspopup]") !== null;

const isEnd = (column: TableColumn) =>
	(column.align ?? (column.kind === "number" ? "end" : "start")) === "end";

function editOf(
	columns: readonly TableColumn[],
	at: number,
	edits: boolean,
	row: TableRecord,
) {
	const column = columns[at];
	return column ? cellEdit(column, at === 0, edits, row) : undefined;
}

/** From `tablet` of its page a grid: a header of sortable acts (the table sorts in its own state: newest or largest first, then turned over, then off) over one row per record, its leading cell the record's name (its row's change mark, when it has one, ahead of it and its warning after it); on touch every column stands at the short measure and the grid scrolls sideways under its frozen leading column. Its keyboard is a cell cursor (one Tab stop, the arrows, Home and End; Enter opens the row from its leading cell or edits an editable cell, Space ticks a check, Escape leaves an edit); a press on a row opens it, a press on an editable value edits it in place: typed in an `Input`, picked in a `Picker`, ticked in a `Checkbox`. Below `tablet` one `ListRow` per record (its leading cell the title, its change the row's mark, its age trailing, its status, warning and chip the marks, the other values its meta line) under the sort's pick. It draws its four states: while its query is pending, `loading` is set or a loading Section around it waits, the header stands over skeleton rows (on touch, the list's waiting rows; a Section around busy, its count waiting); a query that answers not found draws the rest EmptyState saying it no longer exists with Back, never Retry, and a failed query the failed EmptyState with `sentence` and Retry, each under the header on the grid; no row draws `empty`; then one row per item, which a Section around counts. */
export function Table<T>(props: TableProps<T>) {
	const { columns, selected, onOpen, onEdit, empty } = props;
	const words = useWords();
	const [place, wide] = usePageTablet();
	const [sort, setSort] = useState<Sort>();
	const base = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: use(LoadingContext),
		inSection: false,
		hasEmpty: empty !== undefined,
	};
	const input = { ...base, inSection: use(SectionContext) };
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
	const under =
		slot === null ? null : <div className={cn(TABLE_EMPTY, EMPTY)}>{slot}</div>;
	// The form is unknown until the root is placed in its page; placing it
	// re-renders before paint.
	let form: ReactNode = null;
	if (wide) {
		form = (
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
			>
				{under}
			</Grid>
		);
	} else if (wide === false) {
		form = (
			<div className={FORM}>
				{slot ?? (
					// The Table reports to the Section around it once; its touch
					// List is its own part, not a list of the Section.
					<SectionContext value={false}>
						<Phone
							columns={columns}
							rows={records}
							sort={sort}
							onSort={setSort}
							selected={selected}
							onOpen={onOpen}
							choose={props.choose}
							loading={waiting}
							warns={props.row.warning !== undefined}
							changes={props.row.change !== undefined}
						/>
					</SectionContext>
				)}
			</div>
		);
	}
	return (
		<div ref={place} className={ROOT}>
			{form}
		</div>
	);
}

// What a row and its cells call back into the grid: one object for the grid's
// life, reading the grid's latest render, so a memoised row or cell never
// re-renders for a new callback.
interface GridActions {
	start: (row: number, column: number) => void;
	done: () => void;
	edit: (row: TableRecord, column: TableColumn, value: CellValue) => void;
	click: (event: MouseEvent, row: TableRecord) => void;
	home: (row: number, column: number) => HTMLElement | undefined;
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
	touch: boolean;
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
			aria-selected={chosen || undefined}
			onClick={(event) => actions.click(event, row)}
			className={cn(
				tableRow({ state: chosen ? "selected" : "rest" }),
				ROW,
				opens && (chosen ? ROW_CHOSEN_PRESS : ROW_PRESS),
			)}
		>
			{choosing ? (
				<TickCell
					row={row}
					index={index}
					name={name}
					ticked={props.ticked}
					tall={reason !== undefined}
					frozen={props.touch}
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
					index={index}
					column={column}
					place={place + shift}
					leading={place === 0}
					cell={row.cells[column.key]}
					control={editOf(columns, place, props.edits, row)?.control}
					locked={cellLocked(column, place === 0, props.edits, row)}
					frozen={props.touch && place === 0}
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
});

// A row's tick cell: a Checkbox named by the leading cell's name, disabled
// while the row is blocked. Frozen
// first on touch, where the leading column freezes after it.
function TickCell(props: {
	row: TableRecord;
	index: number;
	name: string;
	ticked: boolean;
	tall: boolean;
	frozen: boolean;
	chosen: boolean;
	opens: boolean;
	here: boolean;
	actions: GridActions;
}) {
	const { row, index, actions } = props;
	const box = cn(
		TICK_BOX,
		props.tall && TALL,
		props.frozen &&
			tableFrozenCell({ state: props.chosen ? "selected" : "rest" }),
		props.frozen &&
			props.opens &&
			(props.chosen ? FROZEN_CHOSEN_PRESS : FROZEN_PRESS),
	);
	return (
		<td
			data-row={index}
			data-column={0}
			data-choose=""
			tabIndex={props.here ? 0 : -1}
			className={cn(
				BODY_CELL,
				props.frozen && cn(TABLE_FROZEN, FROZEN, FROZEN_AT),
			)}
		>
			{/* biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox inside is the control */}
			<label className={box}>
				<Field.Root disabled={row.blocked !== undefined}>
					<CellField
						value={{
							label: props.name,
							starts: false,
							done: actions.done,
							home: () => actions.home(index, 0),
						}}
					>
						<LabelTarget value={{}}>
							<Checkbox
								checked={props.ticked}
								onChange={(on) => actions.tick(row, on)}
								label={props.name}
							/>
						</LabelTarget>
					</CellField>
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
	index: number;
	column: TableColumn;
	// The cursor's column, counting the tick column first when there is one.
	place: number;
	leading: boolean;
	cell: TableCell | undefined;
	control: NonNullable<TableColumn["edit"]>["control"] | undefined;
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
	const { row, index, column, place, cell, control, actions } = props;
	const [hovered, setHovered] = useState(false);
	// A started edit's control mounts afresh over the one the pointer showed,
	// so it mounts focused or open.
	const starts = props.editing === "started";
	const live =
		control !== undefined &&
		control !== "checkbox" &&
		(props.editing !== undefined || hovered);
	const field = (starting: boolean) => ({
		label: column.label,
		starts: starting,
		done: actions.done,
		home: () => actions.home(index, place),
	});
	const box = cn(
		TABLE_CELL,
		CELL,
		isEnd(column) && CELL_END,
		props.leading && props.reason !== undefined && TALL,
		props.frozen &&
			tableFrozenCell({ state: props.chosen ? "selected" : "rest" }),
		props.frozen &&
			props.opens &&
			(props.chosen ? FROZEN_CHOSEN_PRESS : FROZEN_PRESS),
	);
	return (
		// biome-ignore lint/a11y/useKeyWithClickEvents: the grid's keyboard is the table's, delegated over its cells
		<td
			data-row={index}
			data-column={place}
			data-edit={control}
			tabIndex={props.here ? 0 : -1}
			onPointerEnter={control ? () => setHovered(true) : undefined}
			onPointerLeave={control ? () => setHovered(false) : undefined}
			onClick={
				live || !control || control === "checkbox"
					? undefined
					: () => actions.start(index, place)
			}
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
				<CellField value={field(starts)}>
					<CellEdit
						key={starts ? "started" : "shown"}
						column={column}
						cell={cell}
						onEdit={(value) => actions.edit(row, column, value)}
					/>
				</CellField>
			) : control === "checkbox" ? (
				// biome-ignore lint/a11y/noLabelWithoutControl: the Checkbox inside is the control
				<label className={box}>
					<CellField value={field(false)}>
						<LabelTarget value={{}}>
							<Checkbox
								checked={cell === true}
								onChange={(checked) => actions.edit(row, column, checked)}
								label={column.label}
							/>
						</LabelTarget>
					</CellField>
				</label>
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

interface Cursor {
	row: number;
	column: number;
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
	children: ReactNode;
}) {
	const { columns, rows, sort, loading, choose } = props;
	const words = useWords();
	const touch = useTouch();
	// A tick column leads the cursor's columns: the leading cell is its
	// column `shift`.
	const shift = choose ? 1 : 0;
	const ticked = useMemo(() => new Set(choose?.chosen), [choose?.chosen]);
	const title = use(PageTitle);
	const frame = useRef<HTMLDivElement>(null);
	const [cursor, setCursor] = useState<Cursor>({ row: 0, column: 0 });
	// The cursor's cell in its edit: `started` from the keyboard or a tap, its
	// control mounted afresh (focused, or a pick open), or `entered` when focus
	// reached a control the pointer already showed.
	const [editing, setEditing] = useState<"started" | "entered">();
	const start = (row: number, column: number) => {
		setCursor({ row, column });
		setEditing("started");
	};
	const at: Cursor = {
		row: Math.min(cursor.row, Math.max(rows.length - 1, 0)),
		column: Math.min(cursor.column, Math.max(columns.length - 1 + shift, 0)),
	};
	const edits = props.onEdit !== undefined;

	const cellAt = (row: number, column: number) =>
		frame.current?.querySelector<HTMLElement>(
			`td[data-row="${row}"][data-column="${column}"]`,
		);
	// The cursor's cell stays clear of the frozen columns it scrolls beneath:
	// the leading column, and the tick column before it.
	const clear = (cell: HTMLElement) => {
		const scroller = frame.current;
		const frozen = cell.parentElement?.children[shift];
		if (!touch || !scroller || !frozen || Number(cell.dataset.column) <= shift)
			return;
		const box = cell.getBoundingClientRect();
		const under = frozen.getBoundingClientRect().right - box.left;
		const past = box.right - scroller.getBoundingClientRect().right;
		if (under > 0) scroller.scrollLeft -= under;
		else if (past > 0) scroller.scrollLeft += past;
	};
	const focusCell = (row: number, column: number) => {
		const cell = cellAt(row, column);
		cell?.focus();
		if (cell) clear(cell);
	};
	// A pick's list gone ends the edit; it hands focus back to its cell.
	const done = () => setEditing(undefined);
	const open = (row: TableRecord) => {
		if (props.onOpen) props.onOpen(row.id);
		else if (row.href !== undefined) navigate(row.href);
	};
	const edit = (row: TableRecord, column: TableColumn, value: CellValue) =>
		props.onEdit?.(row.id, column.key, value);
	const tick = (row: TableRecord, on: boolean) =>
		choose?.onChange(chooseRow(choose.chosen, row.id, on));

	const onFocus = (event: FocusEvent) => {
		const target = event.target as HTMLElement;
		const cell = target.closest<HTMLElement>("td[data-row]");
		if (!cell || !frame.current?.contains(cell)) return;
		const row = Number(cell.dataset.row);
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
		const row = Number(cell.dataset.row);
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
		const last = columns.length - 1 + shift;
		const move: Record<string, Cursor | undefined> = {
			ArrowRight: { row, column: Math.min(column + 1, last) },
			ArrowLeft: { row, column: Math.max(column - 1, 0) },
			ArrowDown: { row: Math.min(row + 1, rows.length - 1), column },
			ArrowUp: { row: Math.max(row - 1, 0), column },
			Home: event.ctrlKey ? { row: 0, column: 0 } : { row, column: 0 },
			End: event.ctrlKey
				? { row: rows.length - 1, column: last }
				: { row, column: last },
		};
		const to = move[event.key];
		// The leading link and a check answer Enter and Space themselves; the
		// arrows move the cursor from them as from their cell.
		if (target !== cell && !to) return;
		if (to) {
			event.preventDefault();
			focusCell(to.row, to.column);
			return;
		}
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		if (!field) {
			if (record.blocked === undefined) tick(record, !ticked.has(record.id));
			return;
		}
		const control = editOf(columns, place, edits, record)?.control;
		if (control === "checkbox") {
			edit(record, field, record.cells[field.key] !== true);
			return;
		}
		if (control) {
			start(row, column);
			return;
		}
		if (place === 0 && event.key === "Enter") {
			const link = cell.querySelector("a");
			if (link) link.click();
			else open(record);
		}
	};
	// A press on a row opens it, unless it lands on an editable cell or the
	// leading cell's link, which answer it themselves.
	const onClick = (event: MouseEvent, row: TableRecord) => {
		const target = event.target as HTMLElement;
		// A pick in a cell's popup reaches the row through React's tree alone.
		if (!event.currentTarget.contains(target)) return;
		if (target.closest("td[data-edit], td[data-choose], a")) return;
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
	const reach = tickable(rows).length > 0;

	return (
		<div className={FORM}>
			<div ref={frame} className={cn(TABLE_FRAME, FRAME, touch && SCROLLS)}>
				<table
					// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a table whose keyboard is a cell cursor is the WAI-ARIA grid
					role="grid"
					aria-labelledby={title}
					aria-busy={loading || undefined}
					onFocus={onFocus}
					onBlur={onBlur}
					onKeyDown={onKeyDown}
					className={cn(TABLE, touch ? MAX : FIT)}
				>
					<colgroup>
						{choose ? <col className={TICK_WIDTH} /> : null}
						{columns.map((column) => (
							<col
								key={column.key}
								className={
									touch
										? TOUCH_WIDTH
										: column.width
											? WIDTH[column.width]
											: undefined
								}
							/>
						))}
					</colgroup>
					<thead>
						<tr className={tableRow({ state: "rest" })}>
							{choose ? (
								<th
									scope="col"
									className={cn(
										HEAD_CELL,
										touch && cn(TABLE_FROZEN, FROZEN, FROZEN_AT),
									)}
								>
									<div
										className={cn(
											TICK_BOX,
											touch && tableFrozenCell({ state: "rest" }),
										)}
									>
										<Field.Root disabled={!reach}>
											<Checkbox
												checked={chooseHead(rows, choose.chosen)}
												onChange={() =>
													choose.onChange(chooseAllToggled(rows, choose.chosen))
												}
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
									frozen={touch && place === 0}
									shifted={choose !== undefined}
									onSort={() => props.onSort(column.key)}
								/>
							))}
						</tr>
					</thead>
					<tbody>
						{loading
							? LOADING_BARS.map((bars, index) => (
									<SkeletonRow
										key={bars.join(" ") + String(index)}
										columns={columns}
										bars={bars}
										odd={index % 2 === 1}
										touch={touch}
										choosing={choose !== undefined}
									/>
								))
							: rows.map((row, index) => (
									<Row
										key={row.id}
										row={row}
										index={index}
										columns={columns}
										chosen={row.id === props.selected}
										choosing={choose !== undefined}
										ticked={ticked.has(row.id)}
										opens={opens}
										touch={touch}
										edits={edits}
										cursor={index === at.row ? at.column : -1}
										editing={index === at.row ? editing : undefined}
										actions={actions}
									/>
								))}
					</tbody>
				</table>
			</div>
			{props.children}
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
			<Icon
				name={direction === "descending" ? "ArrowDown" : "ArrowUp"}
				fit="meta"
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
						edge,
						SORT,
						end && CELL_END,
					)}
				>
					{content}
				</button>
			) : (
				<div className={cn(TABLE_CELL, edge, HEAD, end && CELL_END)}>
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
		case "check":
			return cell === true ? (
				<span className={TICK}>
					<Icon name="Check" />
				</span>
			) : null;
		case "status": {
			const status = cell as StatusCell;
			return <Status state={status.status} label={status.label} />;
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
		case "chip":
			return <Chip family={column.family} label={shown(column, cell)} />;
		case "source":
			return (
				<span className={cn(text({ role: "code" }), VALUE)}>
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
				<span className={cn(text({ role: "body" }), VALUE)}>
					{shown(column, cell)}
				</span>
			);
	}
}

// A cell's edit in place: the Input of its column's kind, or its Picker. The
// cell context sets its fit, its name and its tab stop.
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

function SkeletonRow(props: {
	columns: readonly TableColumn[];
	bars: readonly string[];
	odd: boolean;
	touch: boolean;
	choosing: boolean;
}) {
	let bar = 0;
	return (
		<tr aria-hidden className={tableRow({ state: "rest" })}>
			{props.choosing ? (
				<td
					className={cn(
						SKELETON_CELL,
						props.touch && cn(TABLE_FROZEN, FROZEN, FROZEN_AT),
					)}
				>
					<div
						className={cn(
							TICK_BOX,
							props.touch && tableFrozenCell({ state: "rest" }),
						)}
					>
						<span className={skeleton({ kind: "check" })} />
					</div>
				</td>
			) : null}
			{props.columns.map((column, place) => {
				const frozen = props.touch && place === 0;
				let wait: ReactNode;
				if (column.kind === "check")
					wait = <span className={skeleton({ kind: "check" })} />;
				else if (column.kind === "number")
					wait = (
						<span className={cn(skeleton({ kind: "line" }), NUMBER_BAR)} />
					);
				else if (column.kind === "status")
					wait = <StatusBase waiting={props.odd ? "third" : "half"} />;
				else {
					const width = props.bars[bar++ % props.bars.length];
					wait = <span className={cn(skeleton({ kind: "line" }), width)} />;
				}
				return (
					<td
						key={column.key}
						className={cn(
							SKELETON_CELL,
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
								CELL,
								isEnd(column) && CELL_END,
								frozen && tableFrozenCell({ state: "rest" }),
							)}
						>
							{wait}
						</div>
					</td>
				);
			})}
		</tr>
	);
}

// Below `tablet`: the sort's pick over one ListRow per record.
function Phone(props: {
	columns: readonly TableColumn[];
	rows: readonly TableRecord[];
	sort: Sort | undefined;
	onSort: (sort: Sort) => void;
	selected: string | undefined;
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
		<div className={SORT_BAR}>
			<PickerBase<string>
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
	const { onOpen } = props;
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
		// The row words its age moment and keeps it current itself.
		trailing: ageColumn
			? (record) => {
					const when = cell(record, ageColumn);
					return typeof when === "string" ? { age: when } : undefined;
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
		selected: (record) => record.id === props.selected,
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
