import type {
	CellValue,
	TableColumn,
	TableRow,
} from "@fcalell/ui-core/descriptors";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { EmptyState } from "../../components/empty-state/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Table } from "../../components/table/index.tsx";
import { PortalContainer } from "../../lib/portal.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { key, Stage } from "./overlay-stage.tsx";
import { Column } from "./place.tsx";

const act = () => {};
const QUEUES = ["billing", "mail", "search", "storage"];

// Board 52's columns, one of each kind.
const COLUMNS: TableColumn[] = [
	{ key: "task", label: "Task", width: "1/4", sortable: true },
	{
		key: "schedule",
		label: "Schedule",
		kind: "source",
		width: "measure-short",
		edit: { control: "input" },
	},
	{
		key: "queue",
		label: "Queue",
		kind: "chip",
		family: "teal",
		width: "measure-short",
		sortable: true,
		edit: {
			control: "picker",
			options: [
				{ value: null, label: "No queue" },
				...QUEUES.map((queue) => ({ value: queue, label: queue })),
			],
		},
	},
	{
		key: "retries",
		label: "Retries",
		kind: "number",
		sortable: true,
		edit: { control: "input" },
	},
	{
		key: "alerts",
		label: "Alerts",
		kind: "check",
		edit: { control: "checkbox" },
	},
	{
		key: "last",
		label: "Last run",
		kind: "status",
		width: "measure-short",
		sortable: true,
	},
	{
		key: "updated",
		label: "Updated",
		kind: "age",
		width: "measure-short",
		sortable: true,
	},
];

const ago = (minutes: number) =>
	new Date(Date.now() - minutes * 60_000).toISOString();

const ROWS: TableRow[] = [
	{
		id: "backup",
		href: "#backup",
		cells: {
			task: "Nightly backup",
			schedule: "0 3 * * *",
			queue: "storage",
			retries: 3,
			alerts: true,
			last: { status: "done", label: "Succeeded" },
			updated: ago(2),
		},
	},
	{
		id: "invoices",
		href: "#invoices",
		cells: {
			task: "Invoice sweep",
			schedule: "*/15 * * * *",
			queue: "billing",
			retries: 5,
			alerts: true,
			last: { status: "active", label: "Running" },
			updated: ago(6),
		},
	},
	{
		id: "reindex",
		href: "#reindex",
		cells: {
			task: "Search reindex",
			schedule: "0 */6 * * *",
			queue: "search",
			retries: 1,
			alerts: false,
			last: { status: "failed", label: "Failed" },
			updated: ago(60),
		},
	},
	{
		id: "purge",
		href: "#purge",
		cells: {
			task: "Session purge",
			schedule: "30 2 * * 0",
			queue: null,
			retries: 0,
			alerts: false,
			last: { status: "idle", label: "Paused" },
			updated: ago(180),
		},
	},
	{
		id: "digest",
		href: "#digest",
		cells: {
			task: "Weekly digest",
			schedule: "0 9 * * 1",
			queue: "mail",
			retries: 2,
			alerts: true,
			last: { status: "waiting", label: "Queued" },
			updated: ago(60 * 26),
		},
	},
	{
		id: "rollup",
		href: "#rollup",
		cells: {
			task: "Usage rollup",
			schedule: "5 * * * *",
			queue: "billing",
			retries: 3,
			alerts: true,
			last: { status: "attention", label: "Slow" },
			updated: ago(60 * 48),
		},
	},
];

// The frame's table with its edits held in the frame's own state.
function Tasks(props: {
	readOnly?: boolean;
	selected?: string;
	loading?: boolean;
	empty?: boolean;
}) {
	const [rows, setRows] = useState(ROWS);
	const change = (id: string, at: string, value: CellValue) =>
		setRows((current) =>
			current.map((row) =>
				row.id === id ? { ...row, cells: { ...row.cells, [at]: value } } : row,
			),
		);
	const empty = (
		<EmptyState
			icon="CalendarClock"
			title="No cron tasks yet"
			sentence="A cron task runs on a schedule, a nightly backup or a weekly digest."
		/>
	);
	return (
		<Place title="Cron tasks" act={{ label: "New task", onAct: act }}>
			{props.readOnly ? (
				<Table columns={COLUMNS} rows={rows} onOpen={act} />
			) : (
				<Table
					columns={COLUMNS}
					rows={props.empty ? [] : rows}
					selected={props.selected}
					loading={props.loading}
					empty={empty}
					onOpen={act}
					onEdit={change}
				/>
			)}
		</Place>
	);
}

// A frame driven as it mounts, the way a viewer would: sorting from the
// header, the cursor on a cell and its edit opened from the keyboard. It
// drives before paint, as a `Stage` does (`overlay-stage.tsx`). A popup
// mounts inside the frame, so it draws the frame's mode.
function Driven(props: {
	children: ReactNode;
	ready: (frame: HTMLElement) => void;
}) {
	const frame = useRef<HTMLDivElement>(null);
	const [container, setContainer] = useState<HTMLElement | null>(null);
	const { ready } = props;
	useLayoutEffect(() => {
		if (frame.current) ready(frame.current);
	}, [ready]);
	return (
		<PortalContainer value={container}>
			<div ref={frame} className="relative flex flex-col">
				{props.children}
				<div ref={setContainer} />
			</div>
		</PortalContainer>
	);
}

// The header pressed, a frame apart, until its column sorts the way asked,
// so a drive run twice (StrictMode) lands in the same state: a press renders
// its sort after it returns, and a second drive waits on the first.
function sortBy(
	frame: HTMLElement,
	label: string,
	direction: "ascending" | "descending",
) {
	const head = [...frame.querySelectorAll<HTMLElement>("th button")].find(
		(button) => button.textContent === label,
	);
	const column = head?.closest("th");
	if (!head || !column || head.dataset.driving) return;
	head.dataset.driving = "";
	let presses = 0;
	const step = () => {
		if (column.getAttribute("aria-sort") === direction || presses === 3) {
			delete head.dataset.driving;
			return;
		}
		presses++;
		head.click();
		requestAnimationFrame(step);
	};
	step();
}

// The cursor on a cell, its edit opened by Enter.
function editAt(frame: HTMLElement, row: number, column: number) {
	const cell = frame.querySelector<HTMLElement>(
		`td[data-row="${row}"][data-column="${column}"]`,
	);
	cell?.focus();
	key(cell, "Enter");
}

const newest = (frame: HTMLElement) => sortBy(frame, "Updated", "descending");
const READY: Partial<Record<string, (frame: HTMLElement) => void>> = {
	// The typed edit: a source cell, then a number cell. An edit is opened by
	// focus, so on the page at most one edit frame keeps its edit open (the
	// last to take focus); the edits are checked live.
	"FIELD.fit.bar": (frame) => editAt(frame, 1, 1),
	"FIELD.state.rest": (frame) => editAt(frame, 2, 3),
	// Sorted by an end-aligned column, ascending.
	"TABLE_HEAD_LABEL.sort.sorted": (frame) =>
		sortBy(frame, "Retries", "ascending"),
};

// The Table on every cell it draws, the cell picking what the frame shows: an
// edit open on the field's cells, a read-only grid (the check as its glyph)
// on the body icon, an ascending sort on the sorted label, the rest sorted
// newest first. The state picks the data: the open record selected, loading,
// empty.
export function drawTable(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const tasks = (
		<Tasks
			readOnly={cell === "ICON.fit.body"}
			selected={frame.state === "selected" ? "reindex" : undefined}
			loading={frame.state === "loading"}
			empty={frame.state === "empty"}
		/>
	);
	// The picked edit: the queue's chips in the popover, or on touch in the
	// pick sheet, held inside the frame.
	if (cell === "FIELD.trailing.none")
		return (
			<Stage
				contain={frame.density === "touch"}
				ready={(stage) => editAt(stage, 1, 2)}
			>
				{tasks}
			</Stage>
		);
	return (
		<Column>
			<Driven ready={READY[cell] ?? newest}>{tasks}</Driven>
		</Column>
	);
}
