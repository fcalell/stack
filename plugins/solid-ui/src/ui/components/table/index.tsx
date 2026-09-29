import type {
	CellValue,
	ColumnWidth,
	Option,
	TableCell,
	TableColumn,
	TableRow,
} from "@fcalell/ui-core/descriptors";
import {
	CHECKBOX_MARK,
	checkbox,
	TABLE_CELL,
	tableRow,
	text,
} from "@fcalell/ui-core/variants";
import { ArrowDown, ArrowUp, Check } from "lucide-solid";
import {
	createMemo,
	createSignal,
	For,
	type JSX,
	Match,
	onCleanup,
	onMount,
	Show,
	Switch,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { ageOf, momentOf, useClock } from "#lib/age.ts";
import { CellContext } from "#lib/cell.ts";
import type { Closed } from "#lib/closed.ts";
import { cn } from "#lib/cn.ts";
import { RING, RING_INSET, WASH } from "#lib/interact.ts";
import { LoadingRows } from "#lib/loading.tsx";
import { useWholeWidth } from "#lib/measure.ts";
import { Chip } from "../chip/index.tsx";
import { Input } from "../input/index.tsx";
import { Picker } from "../picker/index.tsx";
import { Status } from "../status/index.tsx";

// A data grid: a header row, one row per item keyed by its id, every cell
// drawn by its column's kind. The row whose id is `selected` is the open
// one, on `accent-soft` as a `Split` list's open item is. A click on a cell
// opens its row through `onOpen`, unless the column edits: then the cell
// becomes its control in place (an `Input` of the column's kind, a `Picker`,
// a tick), commits on Enter or blur, cancels on Escape, and calls `onEdit`
// once per commit that changed the value. The grid is one tab stop: the
// arrows move the focused cell, Tab and Shift+Tab step across it, Enter
// edits or opens. A `sortable` column sorts on its header, ascending,
// descending, then back to the rows' order. With no rows the header stands
// over `empty`. Inside a `Place` the table takes the whole column.
export type TableProps = Closed & {
	columns: TableColumn[];
	rows: TableRow[];
	selected?: string;
	onOpen?: (id: string) => void;
	onEdit?: (id: string, key: string, value: CellValue) => void;
	empty?: JSX.Element;
	loading?: boolean;
};

const WIDTH: Record<ColumnWidth, string> = {
	rail: "w-rail",
	list: "w-list",
	column: "w-column",
	sheet: "w-sheet",
	reading: "w-reading",
	"1/4": "w-1/4",
	"1/3": "w-1/3",
	"1/2": "w-1/2",
	"2/3": "w-2/3",
	"3/4": "w-3/4",
};

const width = (column: TableColumn) =>
	column.width ? cn(WIDTH[column.width], "shrink-0") : "min-w-0 flex-1";

// A number reads from its end; everything else from its start.
const atEnd = (column: TableColumn) =>
	(column.align ?? (column.kind === "number" ? "end" : "start")) === "end";

// The options a picked column draws its values' labels from.
function optionsOf(column: TableColumn): readonly Option[] {
	if (column.edit?.control !== "picker") return [];
	const first = column.edit.options[0];
	if (first === undefined || !("options" in first))
		return column.edit.options as Option[];
	return column.edit.options.flatMap((group) =>
		"options" in group ? group.options : [],
	);
}

// The words a cell draws, which are also what it sorts by.
function shown(column: TableColumn, cell: TableCell): string | number {
	if (cell === null || cell === undefined) return "";
	if (typeof cell === "object") return cell.label ?? cell.status;
	if (typeof cell === "boolean") return cell ? 1 : 0;
	if (column.edit?.control === "picker") {
		return (
			optionsOf(column).find((option) => option.value === cell)?.label ?? cell
		);
	}
	return cell;
}

// Empty cells sort last in either direction.
function compare(column: TableColumn, a: TableCell, b: TableCell): number {
	const x = shown(column, a);
	const y = shown(column, b);
	if (x === "" || y === "") return x === y ? 0 : x === "" ? 1 : -1;
	if (typeof x === "number" && typeof y === "number") return x - y;
	return String(x).localeCompare(String(y), undefined, { numeric: true });
}

type Sort = { key: string; descending: boolean };
type Spot = { id: string; key: string };

function CheckMark(props: { checked: boolean }) {
	return (
		<span
			class={cn(
				checkbox({ state: props.checked ? "checked" : "unchecked" }),
				CHECKBOX_MARK,
				"inline-flex size-6 shrink-0 items-center justify-center",
			)}
		>
			<Show when={props.checked}>
				<Check class="size-4" aria-hidden="true" />
			</Show>
		</span>
	);
}

function CellView(props: { column: TableColumn; cell: TableCell }) {
	const clock = useClock();
	const column = () => props.column;
	return (
		<Switch
			fallback={
				<span
					class={cn(
						text({ role: column().kind === "source" ? "mono" : "body" }),
						"min-w-0 truncate",
						column().kind === "number" && "tabular-nums",
					)}
				>
					{shown(column(), props.cell)}
				</span>
			}
		>
			<Match when={props.cell === null || props.cell === undefined}>
				{null}
			</Match>
			<Match when={column().kind === "chip" && column()}>
				{(chip) => (
					<Chip
						label={String(shown(chip(), props.cell))}
						family={(chip() as Extract<TableColumn, { kind: "chip" }>).family}
					/>
				)}
			</Match>
			<Match
				when={
					column().kind === "status" &&
					typeof props.cell === "object" &&
					props.cell
				}
			>
				{(cell) => <Status state={cell().status} label={cell().label} />}
			</Match>
			<Match when={column().kind === "age" && typeof props.cell === "string"}>
				<time
					datetime={props.cell as string}
					title={momentOf(props.cell as string)}
					class={cn(text({ role: "meta" }), "shrink-0 tabular-nums")}
				>
					{ageOf(props.cell as string, clock())}
				</time>
			</Match>
			<Match when={column().kind === "check"}>
				<CheckMark checked={props.cell === true} />
			</Match>
		</Switch>
	);
}

// The `Input` that edits a typed cell, focused with its text selected as it
// mounts. Its keys and its blur are the cell's to read.
function TypedEditor(props: {
	column: TableColumn;
	value: string;
	onChange: (value: string) => void;
}) {
	let box!: HTMLDivElement;
	onMount(() => {
		const input = box.querySelector("input");
		input?.focus();
		input?.select();
	});
	const kind = () =>
		props.column.kind === "source"
			? "source"
			: props.column.kind === "number"
				? "number"
				: "text";
	return (
		// The field's border overhangs the cell by a pixel above and below,
		// so the row keeps its height while the cell edits.
		<div ref={box} class="-my-px w-full">
			<Input kind={kind()} value={props.value} onChange={props.onChange} />
		</div>
	);
}

export function Table(props: TableProps) {
	useWholeWidth();
	const [sort, setSort] = createSignal<Sort>();
	const [focus, setFocus] = createSignal<Spot>();
	const [editing, setEditing] = createSignal<Spot>();
	const [draft, setDraft] = createSignal("");
	const cells = new Map<string, HTMLElement>();
	const spotKey = (spot: Spot) => `${spot.id}\u0000${spot.key}`;
	const same = (a: Spot | undefined, b: Spot) =>
		a !== undefined && spotKey(a) === spotKey(b);

	const rows = createMemo(() => {
		const by = sort();
		if (!by) return props.rows;
		const column = props.columns.find((each) => each.key === by.key);
		if (!column) return props.rows;
		const sign = by.descending ? -1 : 1;
		return [...props.rows].sort((a, b) => {
			const x = a.cells[by.key] ?? null;
			const y = b.cells[by.key] ?? null;
			// Empty cells stay last whichever way the column sorts.
			const flip = shown(column, x) === "" || shown(column, y) === "";
			return compare(column, x, y) * (flip ? 1 : sign);
		});
	});

	// The cell that holds the grid's one tab stop: the focused one while its
	// row is shown, else the first.
	const stop = createMemo<Spot | undefined>(() => {
		const spot = focus();
		const list = rows();
		if (
			spot &&
			list.some((row) => row.id === spot.id) &&
			props.columns.some((column) => column.key === spot.key)
		)
			return spot;
		const first = list[0];
		const column = props.columns[0];
		return first && column ? { id: first.id, key: column.key } : undefined;
	});

	const place = (spot: Spot) => {
		setFocus(spot);
		cells.get(spotKey(spot))?.focus();
	};

	const indexOf = (spot: Spot) => ({
		row: rows().findIndex((row) => row.id === spot.id),
		column: props.columns.findIndex((each) => each.key === spot.key),
	});

	const move = (rowAt: number, columnAt: number) => {
		const list = rows();
		const row = list[Math.max(0, Math.min(list.length - 1, rowAt))];
		const column =
			props.columns[Math.max(0, Math.min(props.columns.length - 1, columnAt))];
		if (row && column) place({ id: row.id, key: column.key });
	};

	// One step across the grid, row by row; false past either end, where Tab
	// leaves the grid.
	const step = (spot: Spot, back: boolean): boolean => {
		const span = props.columns.length;
		const at = indexOf(spot);
		const next = at.row * span + at.column + (back ? -1 : 1);
		if (next < 0 || next >= rows().length * span) return false;
		move(Math.floor(next / span), next % span);
		return true;
	};

	const commit = (spot: Spot, value: CellValue, refocus: boolean) => {
		if (!same(editing(), spot)) return;
		setEditing(undefined);
		const row = props.rows.find((each) => each.id === spot.id);
		if (row && row.cells[spot.key] !== value)
			props.onEdit?.(spot.id, spot.key, value);
		if (refocus) place(spot);
	};

	const cancel = (spot: Spot, refocus: boolean) => {
		if (!same(editing(), spot)) return;
		setEditing(undefined);
		if (refocus) place(spot);
	};

	// A typed commit: a number that does not parse is no commit, and the cell
	// keeps its value.
	const settle = (column: TableColumn, spot: Spot, refocus: boolean) => {
		const raw = draft();
		if (column.kind !== "number") return commit(spot, raw, refocus);
		const value = Number(raw.trim());
		if (raw.trim() === "" || !Number.isFinite(value))
			return cancel(spot, refocus);
		commit(spot, value, refocus);
	};

	const activate = (row: TableRow, column: TableColumn) => {
		const spot = { id: row.id, key: column.key };
		setFocus(spot);
		const cell = row.cells[column.key] ?? null;
		if (column.edit?.control === "checkbox") {
			props.onEdit?.(row.id, column.key, cell !== true);
		} else if (column.edit) {
			setDraft(cell === null ? "" : String(cell));
			setEditing(spot);
		} else {
			props.onOpen?.(row.id);
		}
	};

	// The keys of a cell editing its value.
	const editKeys = (event: KeyboardEvent, column: TableColumn, spot: Spot) => {
		// A picker's own list reads its keys.
		if (column.edit?.control === "picker") return;
		if (event.key === "Enter") settle(column, spot, true);
		else if (event.key === "Escape") cancel(spot, true);
		else if (event.key === "Tab") {
			settle(column, spot, true);
			step(spot, event.shiftKey);
		} else return;
		event.preventDefault();
		event.stopPropagation();
	};

	// The keys of a focused cell at rest.
	const moveKeys = (
		event: KeyboardEvent,
		row: TableRow,
		column: TableColumn,
	) => {
		const spot = { id: row.id, key: column.key };
		const at = indexOf(spot);
		switch (event.key) {
			case "ArrowDown":
				move(at.row + 1, at.column);
				break;
			case "ArrowUp":
				move(at.row - 1, at.column);
				break;
			case "ArrowRight":
				move(at.row, at.column + 1);
				break;
			case "ArrowLeft":
				move(at.row, at.column - 1);
				break;
			case "Home":
				move(at.row, 0);
				break;
			case "End":
				move(at.row, props.columns.length - 1);
				break;
			case "Tab":
				if (!step(spot, event.shiftKey)) return;
				break;
			case "Enter":
				activate(row, column);
				break;
			case " ":
				if (column.edit?.control !== "checkbox") return;
				activate(row, column);
				break;
			default:
				return;
		}
		event.preventDefault();
	};

	const toggle = (key: string) => {
		const by = sort();
		if (by?.key !== key) setSort({ key, descending: false });
		else if (!by.descending) setSort({ key, descending: true });
		else setSort(undefined);
	};

	const header = () => (
		<tr class={cn(tableRow({ state: "rest" }), "flex w-full")}>
			<For each={props.columns}>
				{(column) => {
					const sorted = () =>
						sort()?.key === column.key ? sort() : undefined;
					return (
						<th
							scope="col"
							aria-sort={
								column.sortable
									? sorted()
										? sorted()?.descending
											? "descending"
											: "ascending"
										: "none"
									: undefined
							}
							class={cn(
								TABLE_CELL,
								text({ role: "label" }),
								width(column),
								"flex items-center",
								atEnd(column) ? "justify-end text-right" : "text-left",
							)}
						>
							<Show
								when={column.sortable}
								fallback={<span class="truncate">{column.label}</span>}
							>
								<button
									type="button"
									onClick={() => toggle(column.key)}
									class={cn(
										"inline-flex min-w-0 cursor-pointer items-center gap-pair rounded-group hover:text-ink",
										RING,
									)}
								>
									<span class="truncate">{column.label}</span>
									<Show when={sorted()}>
										{(by) => (
											<Dynamic
												component={by().descending ? ArrowDown : ArrowUp}
												class="size-4 shrink-0"
												aria-hidden="true"
											/>
										)}
									</Show>
								</button>
							</Show>
						</th>
					);
				}}
			</For>
		</tr>
	);

	const cellOf = (row: TableRow, column: TableColumn) => {
		const spot = { id: row.id, key: column.key };
		onCleanup(() => cells.delete(spotKey(spot)));
		const cell = () => row.cells[column.key] ?? null;
		const isEditing = () => same(editing(), spot);
		const isStop = () => same(stop(), spot);
		return (
			<td
				ref={(element) => cells.set(spotKey(spot), element)}
				tabindex={isStop() ? 0 : -1}
				onFocus={() => setFocus(spot)}
				onClick={() => {
					if (!isEditing()) activate(row, column);
				}}
				onKeyDown={(event) => {
					if (isEditing()) editKeys(event, column, spot);
					else if (event.target === event.currentTarget)
						moveKeys(event, row, column);
				}}
				onFocusOut={(event) => {
					// Leaving a typed edit commits it; a picker's list lives
					// outside the cell and reports its own close.
					if (!isEditing() || column.edit?.control === "picker") return;
					const next = event.relatedTarget;
					if (next instanceof Node && event.currentTarget.contains(next))
						return;
					settle(column, spot, false);
				}}
				class={cn(
					width(column),
					"flex min-h-floor items-center",
					!isEditing() && TABLE_CELL,
					!isEditing() && (column.edit || props.onOpen) && "cursor-pointer",
					atEnd(column) && "justify-end text-right",
					RING_INSET,
				)}
			>
				<Switch fallback={<CellView column={column} cell={cell()} />}>
					<Match
						when={
							isEditing() && column.edit?.control === "picker" && column.edit
						}
					>
						{(edit) => (
							<CellContext.Provider value={{ close: () => cancel(spot, true) }}>
								<Picker
									label={column.label}
									options={(edit() as { options: Option[] }).options}
									value={typeof cell() === "string" ? String(cell()) : ""}
									onChange={(value) => commit(spot, value, true)}
								/>
							</CellContext.Provider>
						)}
					</Match>
					<Match when={isEditing()}>
						<TypedEditor column={column} value={draft()} onChange={setDraft} />
					</Match>
				</Switch>
			</td>
		);
	};

	return (
		<div class="flex flex-col overflow-x-auto">
			{/* biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the grid pattern, a table whose cells take focus, move by the arrows and edit in place */}
			<table role="grid" class="flex w-full flex-col">
				<thead class="flex flex-col">{header()}</thead>
				<Show when={!props.loading && rows().length > 0}>
					<tbody class="flex flex-col">
						<For each={rows()}>
							{(row) => (
								<tr
									aria-selected={row.id === props.selected}
									class={cn(
										tableRow({
											state: row.id === props.selected ? "selected" : "rest",
										}),
										"flex w-full transition-colors duration-(--duration-fast) ease-ui",
										props.onOpen && WASH,
									)}
								>
									<For each={props.columns}>
										{(column) => cellOf(row, column)}
									</For>
								</tr>
							)}
						</For>
					</tbody>
				</Show>
			</table>
			<Show when={props.loading}>
				<LoadingRows />
			</Show>
			<Show when={!props.loading && rows().length === 0}>
				<div class="flex flex-col pt-stack">{props.empty}</div>
			</Show>
		</div>
	);
}
