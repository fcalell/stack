import type {
	CellValue,
	ChangeCell,
	ChangeKind,
	StatusCell,
	TableChoice,
	TableColumn,
} from "@fcalell/ui-core/descriptors";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { EmptyState } from "../../components/empty-state/index.tsx";
import { Place } from "../../components/place/index.tsx";
import type { QueryLike } from "../../components/query-boundary/index.tsx";
import { Table } from "../../components/table/index.tsx";
import { PortalContainer } from "../../lib/portal.ts";
import { ago } from "../ago.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { key, Stage } from "./overlay-stage.tsx";
import { Column } from "./place.tsx";

const act = () => {};
const QUEUES = ["billing", "mail", "search", "storage"];

interface Task {
	id: string;
	task: string;
	schedule: string;
	queue: string | null;
	retries: number;
	alerts: boolean;
	last: StatusCell;
	timeout: ChangeCell;
	updated: string;
	warning?: string;
}

// Board 52's columns, one of each kind, its timeout a value changed, added or
// removed and locked whole by the change set that holds it.
const COLUMNS: TableColumn<Task>[] = [
	{
		key: "task",
		label: "Task",
		width: "1/4",
		sortable: true,
		cell: (task) => task.task,
	},
	{
		key: "schedule",
		label: "Schedule",
		kind: "source",
		width: "measure-short",
		edit: { control: "input" },
		cell: (task) => task.schedule,
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
		cell: (task) => task.queue,
	},
	{
		key: "retries",
		label: "Retries",
		kind: "number",
		sortable: true,
		edit: { control: "input" },
		cell: (task) => task.retries,
	},
	{
		key: "alerts",
		label: "Alerts",
		kind: "check",
		edit: { control: "checkbox" },
		cell: (task) => task.alerts,
	},
	{
		key: "last",
		label: "Last run",
		kind: "status",
		width: "measure-short",
		sortable: true,
		cell: (task) => task.last,
	},
	{
		key: "timeout",
		label: "Timeout",
		kind: "change",
		width: "measure-short",
		sortable: true,
		locked: "Held by CR-12, Ana",
		cell: (task) => task.timeout,
	},
	{
		key: "updated",
		label: "Updated",
		kind: "age",
		width: "measure-short",
		sortable: true,
		cell: (task) => task.updated,
	},
];

// The session purge's schedule is a cell its row locks, ending in a lock.
const ROW = {
	id: (task: Task) => task.id,
	href: (task: Task) => `#${task.id}`,
	locked: (task: Task) => (task.id === "purge" ? ["schedule"] : undefined),
	warning: (task: Task) => task.warning,
};

// A change set holding the tasks: where each stands, so its row draws the mark
// ahead of its name.
const STANDING: Record<string, ChangeKind> = {
	backup: "changed",
	invoices: "unchanged",
	reindex: "added",
	purge: "removed",
	digest: "stale",
	rollup: "unchanged",
};
const CHANGE_SET = { ...ROW, change: (task: Task) => STANDING[task.id] };

// The change set's rule: a change under a parent needs it, so ticking the
// change ticks the parent, and the parent stays ticked while a change under it
// is. The session purge is removed by a held change, so it cannot be ticked.
const NEEDS: Record<string, string> = {
	rollup: "invoices",
	digest: "backup",
};
const HELD = "Held by CR-12, Ana";

function ruled(ids: readonly string[]): string[] {
	const set = new Set(ids);
	for (const id of ids) {
		const need = NEEDS[id];
		if (need) set.add(need);
	}
	return [...set];
}

const TASKS: Task[] = [
	{
		id: "backup",
		task: "Nightly backup",
		schedule: "0 3 * * *",
		queue: "storage",
		retries: 3,
		alerts: true,
		last: { status: "done", label: "Succeeded" },
		timeout: { before: "30s", after: "60s" },
		updated: ago(2),
	},
	{
		id: "invoices",
		task: "Invoice sweep",
		schedule: "*/15 * * * *",
		queue: "billing",
		retries: 5,
		alerts: true,
		last: { status: "active", label: "Running" },
		timeout: { before: "1m", after: "2m" },
		updated: ago(6),
	},
	{
		id: "reindex",
		task: "Search reindex",
		schedule: "0 */6 * * *",
		queue: "search",
		retries: 1,
		alerts: false,
		last: { status: "failed", label: "Failed" },
		timeout: { before: null, after: "5m" },
		updated: ago(60),
	},
	{
		id: "purge",
		task: "Session purge",
		schedule: "30 2 * * 0",
		queue: null,
		retries: 0,
		alerts: false,
		last: { status: "idle", label: "Paused" },
		timeout: { before: "10m", after: null },
		updated: ago(180),
	},
	{
		id: "digest",
		task: "Weekly digest",
		schedule: "0 9 * * 1",
		queue: "mail",
		retries: 2,
		alerts: true,
		last: { status: "waiting", label: "Queued" },
		timeout: { before: "45s", after: "90s" },
		updated: ago(60 * 26),
	},
	{
		id: "rollup",
		task: "Usage rollup",
		schedule: "5 * * * *",
		queue: "billing",
		retries: 3,
		alerts: true,
		last: { status: "attention", label: "Slow" },
		timeout: { before: "2m", after: "3m" },
		updated: ago(60 * 48),
		warning: "Overlaps Invoice sweep",
	},
];

// The frame's query in its state over the tasks it holds: pending while
// loading, failed on error, none when empty, else the tasks.
function queryOf(
	state: ShowcaseFrame["state"],
	tasks: readonly Task[],
): QueryLike<readonly Task[]> {
	const answered = state !== "loading" && state !== "error";
	return {
		data: answered ? (state === "empty" ? [] : tasks) : undefined,
		isPending: state === "loading",
		isError: state === "error",
		refetch: act,
	};
}

// The frame's table with its edits held in the frame's own state.
function Tasks(props: {
	readOnly?: boolean;
	changes?: boolean;
	choosing?: boolean;
	// The state of the selection bar docked at the page's foot, which makes
	// the page a publish page: the bar reads the chosen count, and while it
	// is `disabled` nothing is chosen and the act is blocked.
	publish?: ShowcaseFrame["state"];
	state: ShowcaseFrame["state"];
}) {
	const choosing = props.choosing || props.publish !== undefined;
	const row = props.changes || choosing ? CHANGE_SET : ROW;
	const [tasks, setTasks] = useState(TASKS);
	const [chosen, setChosen] = useState(
		props.publish === "disabled" ? [] : ["rollup", "invoices"],
	);
	const choose: TableChoice<Task> | undefined = choosing
		? {
				chosen,
				onChange: (ids) => setChosen(ruled(ids)),
				blocked: (task) => (task.id === "purge" ? HELD : undefined),
				moved: (task) => {
					const child = Object.keys(NEEDS).find(
						(id) => NEEDS[id] === task.id && chosen.includes(id),
					);
					const name = TASKS.find((each) => each.id === child)?.task;
					return name === undefined ? undefined : `Needed by ${name}`;
				},
			}
		: undefined;
	const change = (id: string, at: string, value: CellValue) =>
		setTasks((current) =>
			current.map((task) => (task.id === id ? { ...task, [at]: value } : task)),
		);
	const empty = (
		<EmptyState
			icon="CalendarClock"
			title="No cron tasks yet"
			sentence="A cron task runs on a schedule, a nightly backup or a weekly digest."
		/>
	);
	const publishing = props.publish !== undefined;
	const publishAct = {
		label:
			chosen.length === 1
				? "Publish 1 change"
				: `Publish ${chosen.length} changes`,
		onAct: act,
		loading: props.publish === "loading",
		blocked: chosen.length === 0 ? "Choose a change to publish." : undefined,
	};
	// The rows that can be chosen: the held one cannot, so `of` counts the rest.
	// `onAll` clears the rows, and chooses them all below `tablet` of the page,
	// where the table draws no head tick.
	const tickable = tasks.filter((task) => task.id !== "purge");
	const placed = publishing
		? {
				foot: (
					<ActionBar
						chosen={{
							count: chosen.length,
							of: tickable.length,
							onAll: (all) =>
								setChosen(ruled(all ? tickable.map((task) => task.id) : [])),
						}}
						acts={[publishAct]}
					/>
				),
			}
		: { act: { label: "New task", onAct: act } };
	return (
		<Place title="Cron tasks" {...placed}>
			{props.readOnly ? (
				<Table columns={COLUMNS} items={tasks} row={row} onOpen={act} />
			) : (
				<Table
					columns={COLUMNS}
					query={queryOf(props.state, tasks)}
					sentence="Cron tasks did not load."
					row={row}
					selected={props.state === "selected" ? "reindex" : undefined}
					choose={choose}
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

// A header's presses turn its column's sort through this cycle.
const SORT_CYCLE = ["none", "descending", "ascending"];

// The header pressed, at once, as many times as its column's sort cycle
// needs to sort the way asked: each press queues the Table's next sort on
// the last, so one drive lands in one commit. The header keeps a mark, so a
// drive run twice (StrictMode) presses once.
function sortBy(
	frame: HTMLElement,
	label: string,
	direction: "ascending" | "descending",
) {
	const head = [...frame.querySelectorAll<HTMLElement>("th button")].find(
		(button) => button.textContent === label,
	);
	const column = head?.closest("th");
	if (!head || !column || head.dataset.driven !== undefined) return;
	head.dataset.driven = "";
	const at = SORT_CYCLE.indexOf(column.getAttribute("aria-sort") ?? "none");
	const presses =
		(SORT_CYCLE.indexOf(direction) - at + SORT_CYCLE.length) %
		SORT_CYCLE.length;
	for (let press = 0; press < presses; press++) head.click();
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
// on the body icon, the change set's marks on the change mark, the change
// set's rule (a head tick mixed over its rows, a blocked row, a moved one) on
// the mixed checkbox, an ascending sort on the sorted label, the rest sorted
// newest first. The state picks the query's answer: the open record
// selected, pending, failed, empty.
export function drawTable(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const tasks = (
		<Tasks
			readOnly={cell === "ICON.fit.body"}
			changes={cell.startsWith("CHANGE_MARK")}
			choosing={cell === "CHECKBOX.state.mixed"}
			state={frame.state}
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

// A publish page: the tasks a change set holds, ticked from the grid, over a
// selection bar docked at the foot reading how many are chosen. The state is
// the bar's act's: pending, or blocked with nothing chosen.
export function Publish(props: { state: ShowcaseFrame["state"] }) {
	return <Tasks publish={props.state} state="rest" />;
}
