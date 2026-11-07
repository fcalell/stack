import type { Read } from "@fcalell/plugin-api/tanstack-query";
import type {
	CellValue,
	ChangeCell,
	ChangeKind,
	StatusMark,
	TableChoice,
	TableColumn,
} from "@fcalell/ui-core/descriptors";
import {
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { ActionBar } from "../../components/action-bar/index.tsx";
import { Pane } from "../../components/pane/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Place } from "../../components/shell/place.tsx";
import { Table } from "../../components/table/index.tsx";
import { PortalContainer } from "../../lib/portal.ts";
import { ago } from "../ago.ts";
import { isFirstCell, type ShowcaseFrame } from "../cells.ts";
import { endedAt, itemsAt } from "../waiting.ts";
import { Paged } from "./more.tsx";
import { key } from "./overlay-stage.tsx";
import { isPaint } from "./painted.tsx";
import { hang, Pressed } from "./pending.tsx";
import { Column } from "./place.tsx";

const act = () => {};

interface Task {
	id: string;
	task: string;
	schedule: string;
	queue: string | null;
	retries: number;
	last: StatusMark;
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
		edit: "input",
		cell: (task) => task.schedule,
	},
	{
		key: "queue",
		label: "Queue",
		kind: "chip",
		family: "teal",
		width: "measure-short",
		sortable: true,
		cell: (task) => task.queue,
	},
	{
		key: "retries",
		label: "Retries",
		kind: "number",
		sortable: true,
		edit: "input",
		cell: (task) => task.retries,
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
		locked: true,
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
		last: { tone: "done", label: "Succeeded" },
		timeout: { before: "30s", after: "60s" },
		updated: ago(2),
	},
	{
		id: "invoices",
		task: "Invoice sweep",
		schedule: "*/15 * * * *",
		queue: "billing",
		retries: 5,
		last: { tone: "active", label: "Running" },
		timeout: { before: "1m", after: "2m" },
		updated: ago(6),
	},
	{
		id: "reindex",
		task: "Search reindex",
		schedule: "0 */6 * * *",
		queue: "search",
		retries: 1,
		last: { tone: "failed", label: "Failed" },
		timeout: { before: null, after: "5m" },
		updated: ago(60),
	},
	{
		id: "purge",
		task: "Session purge",
		schedule: "30 2 * * 0",
		queue: null,
		retries: 0,
		last: { tone: "idle", label: "Paused" },
		timeout: { before: "10m", after: null },
		updated: ago(180),
	},
	{
		id: "digest",
		task: "Weekly digest",
		schedule: "0 9 * * 1",
		queue: "mail",
		retries: 2,
		last: { tone: "waiting", label: "Queued" },
		timeout: { before: "45s", after: "90s" },
		updated: ago(60 * 26),
	},
	{
		id: "rollup",
		task: "Usage rollup",
		schedule: "5 * * * *",
		queue: "billing",
		retries: 3,
		last: { tone: "attention", label: "Slow" },
		timeout: { before: "2m", after: "3m" },
		updated: ago(60 * 48),
		warning: "Overlaps Invoice sweep",
	},
];

// What a cell draws of the table: its columns by key (in the table's order,
// the leading one always) and its rows by id, drawn in the frame's state.
// `ready` drives the frame once it mounts, and is one function for the life of
// the part, as the effect that runs it depends on it.
interface Part {
	columns: readonly string[];
	rows: readonly string[];
	changes?: boolean;
	choosing?: boolean;
	// The rows have an act and a menu, and can be dragged and moved: the acts column.
	acts?: boolean;
	ready?: (frame: HTMLElement) => void;
}

const WHOLE: Part = {
	columns: COLUMNS.map((column) => column.key),
	rows: TASKS.map((task) => task.id),
};

// The frame's table over the part's columns and rows, with its edits held in
// the frame's own state. The first row is the open record when selected, the second the current one. A
// `read` is the tasks as a read still to land, which the Pane holds and the
// table paints.
function Tasks(props: {
	part?: Part;
	read?: Read<readonly Task[]>;
	// The state of the selection bar docked at the page's foot, which makes
	// the page a publish page: the bar reads the chosen count, and while it
	// is `disabled` nothing is chosen and the act is blocked.
	publish?: ShowcaseFrame["state"];
	state: ShowcaseFrame["state"];
}) {
	const part = props.part ?? WHOLE;
	const { read } = props;
	const choosing = part.choosing || props.publish !== undefined;
	const own = part.changes || choosing ? CHANGE_SET : ROW;
	// An icon act and a menu at each row's end, which the grid also moves and drags.
	const row = part.acts
		? {
				...own,
				act: (task: Task) => ({
					icon: "Play" as const,
					label: `Run ${task.task}`,
					onAct: act,
				}),
				more: (task: Task) => [{ label: `Copy ${task.task}`, onAct: act }],
			}
		: own;
	const [tasks, setTasks] = useState(TASKS);
	const [chosen, setChosen] = useState(
		props.publish === "disabled" ? [] : ["rollup", "invoices"],
	);
	const columns = COLUMNS.filter((column) => part.columns.includes(column.key));
	const shown = part.rows.flatMap((id) =>
		tasks.filter((task) => task.id === id),
	);
	const blocked = (task: Task) => (task.id === "purge" ? HELD : undefined);
	const choose: TableChoice<Task> | undefined = choosing
		? {
				chosen,
				onChange: (ids) => setChosen(ruled(ids)),
				blocked,
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
	const publishing = props.publish !== undefined;
	const publishAct = {
		label:
			chosen.length === 1
				? "Publish 1 change"
				: `Publish ${chosen.length} changes`,
		onAct: props.publish === "pending" ? hang : act,
		blocked: chosen.length === 0 ? "Choose a change to publish." : undefined,
	};
	const actions = publishing
		? undefined
		: [{ icon: "Plus" as const, label: "New task", onAct: act }];
	// The publish page's acts stand in the Pane's foot, a selection bar over
	// the rows that can be ticked, which the page counts itself.
	const reach = shown.filter((task) => blocked(task) === undefined);
	const bar = publishing ? (
		<ActionBar
			acts={[publishAct]}
			chosen={{
				count: chosen.length,
				of: reach.length,
				onAll: (all) =>
					setChosen(ruled(all ? reach.map((task) => task.id) : [])),
			}}
		/>
	) : undefined;
	const page = (
		<Place>
			<Pane wide title="Cron tasks" acts={actions} read={read} foot={bar}>
				<Table
					columns={columns}
					items={read ?? shown}
					row={row}
					drag={part.acts ? { kind: "task" } : undefined}
					reorder={part.acts ? { onMove: act } : undefined}
					selected={props.state === "selected" ? part.rows[0] : undefined}
					current={props.state === "selected" ? part.rows[1] : undefined}
					choose={choose}
					onOpen={act}
					onEdit={change}
				/>
			</Pane>
		</Place>
	);
	return props.publish === "pending" ? (
		<Pressed label={publishAct.label}>{page}</Pressed>
	) : (
		page
	);
}

// A frame driven as it mounts, the way a viewer would: sorting from the
// header, the cursor on a cell and its edit opened from the keyboard. It
// drives before paint, as a `Stage` does (`overlay-stage.tsx`). A popup
// mounts inside the frame, so it draws the frame's mode.
function Driven(props: {
	children: ReactNode;
	ready?: (frame: HTMLElement) => void;
}) {
	const frame = useRef<HTMLDivElement>(null);
	const [container, setContainer] = useState<HTMLElement | null>(null);
	const { ready } = props;
	useLayoutEffect(() => {
		if (frame.current) ready?.(frame.current);
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
const byRetries = (frame: HTMLElement) => sortBy(frame, "Retries", "ascending");

// A part: the leading column and the ones named, over the rows named.
function only(
	columns: readonly string[],
	rows: readonly string[],
	more?: Omit<Part, "columns" | "rows">,
): Part {
	return { columns: ["task", ...columns], rows, ...more };
}

// A part whose edit opens from the keyboard on a cell, once it mounts.
function editing(part: Part, row: string, column: string): Part {
	return {
		...part,
		ready: (frame) =>
			editAt(frame, part.rows.indexOf(row), part.columns.indexOf(column)),
	};
}

const standing = (kind: ChangeKind) =>
	Object.keys(STANDING)
		.filter((id) => STANDING[id] === kind)
		.slice(0, 1);

// A cell draws the part it names, the name or its family's the first match of
// this list: one row of each status, of each change mark and of each change
// value, the columns a kind of text, glyph, chip or edit stands in, and the
// head, row and frozen cells on a few rows of the common columns. A cell
// naming none draws that few, sorted newest first.
const SORTED = only(["retries", "updated"], ["backup", "invoices", "reindex"], {
	ready: byRetries,
});
const PAINTED = only(
	["schedule", "queue", "retries", "last", "updated"],
	["backup", "invoices"],
	{ choosing: true },
);
const CELL_PARTS: ReadonlyArray<readonly [string, Part]> = [
	...TASKS.map(
		(task) =>
			[`STATUS_DOT.tone.${task.last.tone}`, only(["last"], [task.id])] as const,
	),
	...[...new Set(Object.values(STANDING))].map(
		(kind) =>
			[
				`CHANGE_MARK.kind.${kind}`,
				only([], standing(kind), { changes: true }),
			] as const,
	),
	...(
		[
			["before", "changed"],
			["after", "changed"],
			["added", "added"],
			["removed", "removed"],
		] as const
	).map(
		([value, kind]) =>
			[
				`TABLE_CHANGE_VALUE.kind.${value}`,
				only(["timeout"], standing(kind)),
			] as const,
	),
	["TEXT_STRONG", only(["retries"], ["backup", "invoices"])],
	[
		"TEXT.role.meta",
		only(["updated"], ["backup", "rollup"], { ready: newest }),
	],
	["TEXT.role.code", only(["schedule"], ["backup", "invoices"])],
	["TEXT", only(["retries"], ["backup", "invoices"])],
	// The sort arrows, the lock on the timeout's head and the change's arrow.
	["ICON.fit.meta", only(["timeout"], standing("changed"))],
	["CHIP", only(["queue"], ["backup", "invoices"])],
	// The lock ends the session purge's schedule, which its row holds.
	[
		"FIELD.fit.bar",
		editing(
			only(["schedule"], ["backup", "invoices", "purge"]),
			"invoices",
			"schedule",
		),
	],
	[
		"FIELD.state.rest",
		editing(only(["retries"], ["backup", "reindex"]), "reindex", "retries"),
	],
	// The change set's rule: a head tick mixed over its rows, a ticked row, an
	// unticked one, a blocked row, a moved one.
	[
		"CHECKBOX.state",
		only(["last"], ["backup", "invoices", "purge", "rollup"], {
			choosing: true,
		}),
	],
	// The acts column at the grid's end: an icon act and the menu that holds
	// the moves, drawn on the icon act's cell.
	[
		"ICON_BUTTON",
		only(["retries", "updated"], ["backup", "invoices", "reindex"], {
			acts: true,
		}),
	],
	["TABLE_HEAD_LABEL.sort.sorted", SORTED],
	[
		"TABLE_HEAD_LABEL",
		only(["retries", "updated"], ["backup", "invoices", "reindex"]),
	],
	// The painted cells of each column kind, loaded beside painted (below).
	["PAINT", PAINTED],
];
const COMMON = only(
	["retries", "last", "updated"],
	["backup", "invoices", "reindex"],
	{
		ready: newest,
	},
);

// A comparison is a table whose cells hold a value per column: the leading
// column names the fact, a column follows for each compared thing, and a chip
// or status column carries a fact's mark or verdict.
interface Fact {
	id: string;
	label: string;
	values: string[];
	mark?: string;
	verdict?: StatusMark;
}

const compared = (head: string, things: string[]): TableColumn<Fact>[] => [
	{ key: "fact", label: head, cell: (fact) => fact.label },
	...things.map(
		(thing, at): TableColumn<Fact> => ({
			key: thing,
			label: thing,
			cell: (fact) => fact.values[at] ?? null,
		}),
	),
];

// Board 51's plan change (two columns), plans (three, a chip beside each fact)
// and a data layer (a spec beside what was observed, each fact's verdict a
// status; a passing fact's is done, one more draws none).
const CHANGE: Fact[] = [
	{ id: "plan", label: "Plan", values: ["Team", "Business"] },
	{ id: "seats", label: "Seats", values: ["10", "25"] },
	{ id: "storage", label: "Storage", values: ["100 GB", "1 TB"] },
	{ id: "audit", label: "Audit log", values: ["Not included", "Kept 90 days"] },
	{
		id: "billed",
		label: "Billed",
		values: ["$120 a month", "$480 a month, from 14 October"],
	},
];
const PLANS: Fact[] = [
	{
		id: "seats",
		label: "Seats",
		values: ["3", "10", "Unlimited"],
		mark: "Changed",
	},
	{
		id: "projects",
		label: "Projects",
		values: ["2", "Unlimited", "Unlimited"],
		mark: "Changed",
	},
	{
		id: "sso",
		label: "Single sign-on",
		values: ["No", "No", "Yes"],
		mark: "Beta",
	},
	{
		id: "history",
		label: "History",
		values: ["7 days", "90 days", "Forever"],
		mark: "New",
	},
	{
		id: "support",
		label: "Support",
		values: ["Community", "Email", "Email and chat, same day"],
		mark: "New",
	},
];
const LAYER: Fact[] = [
	{
		id: "plan",
		label: "plan",
		values: ["string", "string"],
		verdict: { tone: "done", label: "Matches" },
	},
	{
		id: "seats",
		label: "seats",
		values: ["number", "string"],
		verdict: { tone: "failed", label: "Wrong type" },
	},
	{
		id: "trial",
		label: "trial_ends",
		values: ["date", "Not observed"],
		verdict: { tone: "failed", label: "Missing" },
	},
	{
		id: "currency",
		label: "currency",
		values: ["USD", "usd"],
		verdict: { tone: "attention", label: "Differs" },
	},
	{ id: "workspace", label: "workspace_id", values: ["uuid", "uuid"] },
];
const FACT_ROW = { id: (fact: Fact) => fact.id };

// Tests by environment: two status columns, each cell the verdict of one
// environment. Below `tablet` a row says which environment each word is of
// ("Staging: Passing"), each its own status badge with its tone mark (the
// failing one's mark too, not the first alone); the grid has the column's head.
interface Check {
	id: string;
	page: string;
	staging: StatusMark;
	production: StatusMark;
}
const CHECKS: Check[] = [
	{
		id: "order",
		page: "Order confirmation",
		staging: { tone: "done", label: "Passing" },
		production: { tone: "failed", label: "Failing" },
	},
	{
		id: "cart",
		page: "Cart",
		staging: { tone: "done", label: "Passing" },
		production: { tone: "done", label: "Passing" },
	},
];
const CHECK_COLUMNS: TableColumn<Check>[] = [
	{ key: "page", label: "Page", cell: (check) => check.page },
	{
		key: "staging",
		label: "Staging",
		kind: "status",
		cell: (check) => check.staging,
	},
	{
		key: "production",
		label: "Production",
		kind: "status",
		cell: (check) => check.production,
	},
];

// A destination's variables: an editable name, a few short columns and a long
// Description in a column that wraps. Below `tablet` the Description is the
// row's `line`, wrapping whole under the name, never a cut badge; the short
// columns stand as the row's facts.
interface Variable {
	id: string;
	name: string;
	type: string;
	scope: string;
	required: StatusMark;
	description: string;
}
const VARIABLES: Variable[] = [
	{
		id: "endpoint",
		name: "endpoint_url",
		type: "URL",
		scope: "Event",
		required: { tone: "done", label: "Required" },
		description:
			"Where the destination receives each event, including the path, as the vendor's collection endpoint documents it for the region the workspace runs in.",
	},
	{
		id: "key",
		name: "api_key",
		type: "Secret",
		scope: "Account",
		required: { tone: "done", label: "Required" },
		description: "Sent in the Authorization header.",
	},
];
const VARIABLE_COLUMNS: TableColumn<Variable>[] = [
	{
		key: "name",
		label: "Name",
		kind: "source",
		width: "1/4",
		edit: "input",
		cell: (variable) => variable.name,
	},
	{ key: "type", label: "Type", cell: (variable) => variable.type },
	{ key: "scope", label: "Scope", cell: (variable) => variable.scope },
	{
		key: "required",
		label: "Required",
		kind: "status",
		cell: (variable) => variable.required,
	},
	{
		key: "description",
		label: "Description",
		wrap: true,
		cell: (variable) => variable.description,
	},
];

// A mapping table whose headers are phrases and one holds a long word: a header
// wraps to a second line before it cuts ("Destination or tag manager"), and a
// word wider than the short measure gives its column the room it takes.
interface Mapping {
	id: string;
	event: string;
	destination: string;
	attribution: string;
}
const MAPPINGS: Mapping[] = [
	{
		id: "purchase",
		event: "purchase, order.currency",
		destination: "Google Tag Manager",
		attribution: "30 days",
	},
	{
		id: "signup",
		event: "sign_up",
		destination: "Segment",
		attribution: "7 days",
	},
];
const MAPPING_COLUMNS: TableColumn<Mapping>[] = [
	{ key: "event", label: "Event", cell: (mapping) => mapping.event },
	{
		key: "destination",
		label: "Destination or tag manager",
		cell: (mapping) => mapping.destination,
	},
	{
		key: "attribution",
		label: "Conversion attribution_window",
		cell: (mapping) => mapping.attribution,
	},
];

// Ages at the longest words the language has: an age column with no width stands at the
// longest of them, so neither "1 second ago" nor "59 seconds ago" is cut.
interface Edit {
	id: string;
	edited: string;
}
const EDITS: Edit[] = [
	{ id: "now", edited: ago(1 / 60) },
	{ id: "seconds", edited: ago(59 / 60) },
	{ id: "months", edited: ago(60 * 24 * 30 * 11) },
];
const EDIT_COLUMNS: TableColumn<Edit>[] = [
	{ key: "id", label: "Edit", cell: (edit) => edit.id },
	{ key: "edited", label: "Edited", kind: "age", cell: (edit) => edit.edited },
];

// A change log: a Kind column of chips beside a column of free text. The chip
// column stands at its widest chip, so "Calculated metric" is never cut while the
// text column has room.
interface Logged {
	id: string;
	kind: string;
	changed: string;
}
const LOGGED: Logged[] = [
	{
		id: "metric",
		kind: "Calculated metric",
		changed: "Revenue per visit now divides by sessions, not by users",
	},
	{
		id: "channel",
		kind: "Marketing channel",
		changed: "Paid social is split from organic social",
	},
	{ id: "tag", kind: "Tag", changed: "Renamed" },
];
const LOGGED_COLUMNS: TableColumn<Logged>[] = [
	{ key: "id", label: "Entry", cell: (entry) => entry.id },
	{
		key: "kind",
		label: "Kind",
		kind: "chip",
		family: "neutral",
		cell: (entry) => entry.kind,
	},
	{ key: "changed", label: "What changed", cell: (entry) => entry.changed },
];

// A change log whose "What changed" cell holds a long before and after: it wraps at
// its words within its row at every width, never an ellipsis cutting a word.
interface Reworded {
	id: string;
	changed: ChangeCell;
}
const REWORDED: Reworded[] = [
	{
		id: "activations",
		changed: {
			before: "Activations VIP customers on join",
			after: "VIP customers on join, on leave",
		},
	},
	{
		id: "audience",
		changed: {
			before: null,
			after: "Audience of people who opened the app twice",
		},
	},
];
const REWORDED_COLUMNS: TableColumn<Reworded>[] = [
	{ key: "id", label: "Entry", cell: (entry) => entry.id },
	{
		key: "changed",
		label: "What changed",
		kind: "change",
		width: "measure-short",
		cell: (entry) => entry.changed,
	},
];
function cutChanges(host: Element): string[] {
	return [...host.querySelectorAll<HTMLElement>("tbody td span")]
		.filter(
			(words) =>
				words.children.length === 0 && words.scrollWidth > words.clientWidth,
		)
		.map((words) => `the change "${words.textContent}" is cut`);
}

const MARKED: TableColumn<Fact> = {
	key: "mark",
	label: "Change",
	kind: "chip",
	family: "teal",
	width: "measure-short",
	cell: (fact) => fact.mark ?? null,
};
const VERDICT: TableColumn<Fact> = {
	key: "verdict",
	label: "Verdict",
	kind: "status",
	width: "measure-short",
	cell: (fact) => fact.verdict ?? null,
};

// The comparisons judge their touch rows and log an error where one breaks: a
// value too long for a fact is the row's line, said whole, so no badge stands cut
// with an ellipsis where touch cannot read the rest.
const SETTLE = 30;
// The Kind column is the second: its chips are never cut, whatever the width the
// free text column beside it has to give up (that column cuts its text, which the
// tooltip reads).
function cutChips(host: Element): string[] {
	return [
		...host.querySelectorAll<HTMLElement>("tbody td:nth-child(2) .truncate"),
	]
		.filter((words) => words.scrollWidth > words.clientWidth)
		.map((words) => `the chip "${words.textContent}" is cut`);
}
function cutFacts(host: Element): string[] {
	return [
		...host.querySelectorAll<HTMLElement>('[class*="bg-fill-badge"] .truncate'),
	]
		.filter((words) => words.scrollWidth > words.clientWidth)
		.map((words) => `the fact "${words.textContent}" is cut`);
}

// The three comparisons, each in a Section that holds its read as a page ships
// them.
function Comparisons(props: { id: string; state: ShowcaseFrame["state"] }) {
	const at = <T,>(name: string, items: readonly T[]) =>
		itemsAt(`${props.id}/${name}`, props.state, items);
	const change = at("change", CHANGE);
	const plans = at("plans", PLANS);
	const layer = at("layer", LAYER);
	const checks = itemsAt(`${props.id}/checks`, props.state, CHECKS);
	const variables = itemsAt(`${props.id}/variables`, props.state, VARIABLES);
	const mappings = itemsAt(`${props.id}/mappings`, props.state, MAPPINGS);
	const edits = itemsAt(`${props.id}/edits`, props.state, EDITS);
	const logged = itemsAt(`${props.id}/logged`, props.state, LOGGED);
	const reworded = itemsAt(`${props.id}/reworded`, props.state, REWORDED);
	const kinds = useRef<HTMLDivElement>(null);
	const changes = useRef<HTMLDivElement>(null);
	const host = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (props.state !== "rest") return;
		let frame = 0;
		let seen = 0;
		const watch = () => {
			if (++seen < SETTLE) {
				frame = requestAnimationFrame(watch);
				return;
			}
			if (host.current)
				for (const fault of cutFacts(host.current))
					console.error(`Comparisons: ${fault}`);
			if (changes.current)
				for (const fault of cutChanges(changes.current))
					console.error(`Comparisons: ${fault}`);
			if (kinds.current)
				for (const fault of cutChips(kinds.current))
					console.error(`Comparisons: ${fault}`);
		};
		frame = requestAnimationFrame(watch);
		return () => cancelAnimationFrame(frame);
	}, [props.state]);
	return (
		<div ref={host} className="min-w-0">
			<Place>
				<Pane wide title="Comparisons">
					<Section title="Plan change" read={change}>
						<Table
							columns={compared("Fact", ["Current", "After the change"])}
							items={change}
							row={FACT_ROW}
						/>
					</Section>
					<Section title="Plans" read={plans}>
						<Table
							columns={[
								...compared("Fact", ["Free", "Team", "Business"]),
								MARKED,
							]}
							items={plans}
							row={FACT_ROW}
						/>
					</Section>
					<Section title="Tests" read={checks}>
						<Table
							columns={CHECK_COLUMNS}
							items={checks}
							row={{ id: (check: Check) => check.id }}
						/>
					</Section>
					<Section title="Variables" read={variables}>
						<Table
							columns={VARIABLE_COLUMNS}
							items={variables}
							row={{ id: (variable: Variable) => variable.id }}
							onOpen={act}
							onEdit={act}
						/>
					</Section>
					<Section title="Mappings" read={mappings}>
						<Table
							columns={MAPPING_COLUMNS}
							items={mappings}
							row={{ id: (mapping: Mapping) => mapping.id }}
						/>
					</Section>
					<Section title="Changes" read={logged}>
						<div ref={kinds} className="min-w-0">
							<Table
								columns={LOGGED_COLUMNS}
								items={logged}
								row={{ id: (entry: Logged) => entry.id }}
							/>
						</div>
					</Section>
					<Section title="Reworded" read={reworded}>
						<div ref={changes} className="min-w-0">
							<Table
								columns={REWORDED_COLUMNS}
								items={reworded}
								row={{ id: (entry: Reworded) => entry.id }}
							/>
						</div>
					</Section>
					<Section title="Ages" read={edits}>
						<Table
							columns={EDIT_COLUMNS}
							items={edits}
							row={{ id: (edit: Edit) => edit.id }}
						/>
					</Section>
					<Section title="Data layer" read={layer}>
						<Table
							columns={[
								...compared("Field", ["Expected", "Observed"]),
								VERDICT,
							]}
							items={layer}
							row={FACT_ROW}
						/>
					</Section>
				</Pane>
			</Place>
		</div>
	);
}

// The Table on the part each cell names, in the frame's state: the open record
// selected, or painted while its read waits; the more state, on the first cell,
// the table over a pages read in each state of its more row; the empty and
// error states, on the table cell, over a read that answers none, fails and
// answers not found, in Sections that hold none of them.. A `PAINT` cell draws the part loaded and the same part painted. The first cell also draws the comparisons: tables whose cells hold a value per column.
export function drawTable(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const part =
		CELL_PARTS.find(([prefix]) => cell.startsWith(prefix))?.[1] ?? COMMON;
	const rows = part.rows.flatMap((id) =>
		TASKS.filter((task) => task.id === id),
	);
	const painted = (
		<Tasks
			part={part}
			state="loading"
			read={itemsAt(`${frame.id}/painted`, "loading", rows)}
		/>
	);
	if (frame.state === "more")
		return isFirstCell(frame) ? (
			<Column>
				<Paged
					id={frame.id}
					rows={rows}
					draw={(read) => <Tasks part={part} state="rest" read={read} />}
				/>
			</Column>
		) : undefined;
	if (frame.state === "empty" || frame.state === "error")
		return isFirstCell(frame) ? (
			<Column>
				<Place>
					<Pane wide title="Cron tasks">
						{endedAt<Task>(frame.id, frame.state).map(({ title, items }) => (
							<Section key={title} title={title}>
								<Table columns={COLUMNS} items={items} row={ROW} />
							</Section>
						))}
						{frame.state === "empty" ? (
							<Section title="Empty, with an act">
								<Table
									columns={COLUMNS}
									items={itemsAt<Task>(`${frame.id}/act`, "empty", [])}
									row={ROW}
									empty={{
										sentence: "No tasks yet. Schedule one to run on a cron.",
										act: { label: "New task", onAct: act },
									}}
								/>
							</Section>
						) : null}
					</Pane>
				</Place>
			</Column>
		) : undefined;
	if (isPaint(frame)) {
		if (frame.state !== "rest") return undefined;
		return (
			<Column>
				<Tasks part={part} state="rest" />
				{painted}
			</Column>
		);
	}
	const tasks =
		frame.state === "loading" ? (
			painted
		) : (
			<Tasks part={part} state={frame.state} />
		);
	return (
		<Column>
			<Driven ready={part.ready}>{tasks}</Driven>
			{isFirstCell(frame) &&
			(frame.state === "rest" || frame.state === "loading") ? (
				<Comparisons id={`${frame.id}/compared`} state={frame.state} />
			) : null}
		</Column>
	);
}

// A publish page: the tasks a change set holds, ticked from the grid, over a
// selection bar docked at the foot reading how many are chosen. The state is
// the bar's act's: pending, or blocked with nothing chosen.
export function Publish(props: { state: ShowcaseFrame["state"] }) {
	return <Tasks publish={props.state} state="rest" />;
}
