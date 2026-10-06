import type {
	Act,
	ChangeKind,
	ChipMark,
	IconName,
	MenuItem,
	RowEntry,
	StatusMark,
} from "@fcalell/ui-core/descriptors";
import type { StatusState } from "@fcalell/ui-core/tokens";
import type { ReactNode } from "react";
import { Group } from "../../components/group/index.tsx";
import { List, type RowSlots } from "../../components/list/index.tsx";
import { ListRow } from "../../components/list-row/index.tsx";
import { ago } from "../ago.ts";
import type { ShowcaseFrame } from "../cells.ts";

const act = () => {};

// The frame at touch is the page its rows decide their structure by (below
// `tablet` an act stands under the row's text, a lock shows its glyph alone);
// at the desktop it stands in no page, as a row inside a wide sheet does.
function Page(props: { children: ReactNode }) {
	return (
		<div className="flex flex-col gap-sections w-sheet max-w-full touch:@container/page">
			{props.children}
		</div>
	);
}
const MORE: MenuItem[] = [
	{ label: "Redeploy", icon: "RotateCw", onAct: act },
	{ label: "Copy URL", icon: "Copy", onAct: act },
];
const ROLES = [
	{ value: "owner", label: "Owner" },
	{ value: "admin", label: "Admin" },
	{ value: "member", label: "Member" },
];

// Each list's items fill every slot its map declares, so its waiting rows
// stand in exactly the slots its loaded rows draw.

// A deploy: its glyph leading, its commit naming it on the meta line, its
// status and environment chip at the line's end, its age, its acts.
interface Deploy {
	id: string;
	glyph: IconName;
	title: string;
	meta: string[];
	age: string;
	status: StatusMark;
	chip: ChipMark;
}

const DEPLOY_ROW: RowSlots<Deploy> = {
	key: (deploy) => deploy.id,
	leading: { icon: (deploy) => deploy.glyph },
	title: (deploy) => deploy.title,
	meta: (deploy) => deploy.meta,
	trailing: (deploy) => ({ age: deploy.age }),
	status: (deploy) => deploy.status,
	chip: (deploy) => deploy.chip,
	more: () => MORE,
	href: (deploy) => `#${deploy.id}`,
};

const DEPLOYS: Deploy[] = [
	{
		id: "web",
		glyph: "GitBranch",
		title: "web · fix/checkout",
		meta: ["b71d0e2", "Ana Ruiz"],
		age: ago(40),
		status: { state: "failed", label: "Failed" },
		chip: { family: "red", label: "Rolled back" },
	},
	{
		id: "worker",
		glyph: "Server",
		title: "worker · main",
		meta: ["0c5e4aa", "Ema Okafor"],
		age: ago(120),
		status: { state: "done", label: "Ready" },
		chip: { family: "teal", label: "Production" },
	},
];

// A service on one line: its glyph, its name, its last deploy's age, its acts.
interface Service {
	id: string;
	glyph: IconName;
	title: string;
	age: string;
}

const SERVICE_ROW: RowSlots<Service> = {
	key: (service) => service.id,
	leading: { icon: (service) => service.glyph },
	title: (service) => service.title,
	trailing: (service) => ({ age: service.age }),
	more: () => MORE,
	href: (service) => `#${service.id}`,
};

const SERVICES: Service[] = [
	{ id: "api", glyph: "Rocket", title: "api · main", age: ago(0.5) },
	{ id: "cron", glyph: "Clock", title: "cron · main", age: ago(60) },
];

// An issue: its assignee leading, its area and key, its age, its state.
interface Issue {
	id: string;
	assignee: string;
	title: string;
	meta: string[];
	age: string;
	status: StatusMark;
	href: string;
}

const ISSUE_ROW: RowSlots<Issue> = {
	key: (issue) => issue.id,
	leading: { avatar: (issue) => ({ name: issue.assignee }) },
	title: (issue) => issue.title,
	meta: (issue) => issue.meta,
	trailing: (issue) => ({ age: issue.age }),
	status: (issue) => issue.status,
	href: (issue) => issue.href,
};

// Board 40's issues in a Split's list: the first row current (its href is
// the page's own path), the others at their own.
function issues(): Issue[] {
	return [
		{
			id: "acm-142",
			assignee: "Ben Kaya",
			title: "Fix invoice rounding",
			meta: ["ACM-142", "Billing"],
			age: ago(120),
			status: { state: "active", label: "In progress" },
			href: location.pathname,
		},
		{
			id: "acm-139",
			assignee: "Ema Okafor",
			title: "Export cohorts to CSV",
			meta: ["ACM-139", "Growth"],
			age: ago(300),
			status: { state: "waiting", label: "Todo" },
			href: "#acm-139",
		},
		{
			id: "acm-137",
			assignee: "Ana Ruiz",
			title: "Retry failed webhooks with backoff",
			meta: ["ACM-137", "Infra"],
			age: ago(1440),
			status: { state: "attention", label: "Blocked" },
			href: "#acm-137",
		},
	];
}

// A member led by their invitation's state.
interface Invite {
	id: string;
	state: StatusState;
	title: string;
	meta: string[];
}

const INVITE_ROW: RowSlots<Invite> = {
	key: (invite) => invite.id,
	leading: { status: (invite) => invite.state },
	title: (invite) => invite.title,
	meta: (invite) => invite.meta,
	href: (invite) => `#${invite.id}`,
};

const INVITES: Invite[] = [
	{
		id: "lea",
		state: "waiting",
		title: "lea@northwind.io",
		meta: ["Invited 2 d ago by Ana Ruiz"],
	},
	{
		id: "omar",
		state: "done",
		title: "omar@northwind.io",
		meta: ["Joined yesterday"],
	},
];

// A job's stage led by its state: a steady one (a watch that stands) beside
// one under way, whose leading and status spin.
interface Stage {
	id: string;
	title: string;
	meta: string[];
	status: StatusMark;
}

const STAGE_ROW: RowSlots<Stage> = {
	key: (stage) => stage.id,
	leading: { status: (stage) => stage.status.state },
	title: (stage) => stage.title,
	meta: (stage) => stage.meta,
	status: (stage) => stage.status,
};

const STAGES: Stage[] = [
	{
		id: "watch",
		title: "Watch main",
		meta: ["Since Monday"],
		status: { state: "active", label: "Watching" },
	},
	{
		id: "rebase",
		title: "Rebasing on main",
		meta: ["Started 2 min ago"],
		status: { state: "running", label: "Running" },
	},
];

// A note: its title over its meta, no leading.
interface Note {
	id: string;
	title: string;
	edited: string;
}

const NOTE_ROW: RowSlots<Note> = {
	key: (note) => note.id,
	title: (note) => note.title,
	meta: (note) => [note.edited],
};

// An implementation item carrying the next step as its act: ready, pending
// and blocked on a reason.
interface Step {
	id: string;
	title: string;
	meta: string[];
	act: Act;
}

const STEP_ROW: RowSlots<Step> = {
	key: (step) => step.id,
	title: (step) => step.title,
	meta: (step) => step.meta,
	act: (step) => step.act,
	more: () => MORE,
};

const STEPS: Step[] = [
	{
		id: "staging",
		title: "Checkout redesign",
		meta: ["Implementation", "Ana Ruiz"],
		act: { label: "Claim staging", onAct: act },
	},
	{
		id: "review",
		title: "Invoice export",
		meta: ["Implementation", "Ben Kaya"],
		act: { label: "Request review", onAct: act, loading: true },
	},
	{
		id: "release",
		title: "Webhook retries",
		meta: ["Implementation", "Ema Okafor"],
		act: { label: "Release", onAct: act, blocked: "Staging is not claimed." },
	},
];

// A change set entry carrying every mark at once: its count a meta part, its
// status, a warning (the act that clears it the row's own), the lock it holds
// and its change chip; the second row's marks are long enough to yield.
interface Entry {
	id: string;
	title: string;
	meta: string[];
	status: StatusMark;
	warning: string;
	lock: string;
	chip: ChipMark;
	act: Act;
}

const ENTRY_ROW: RowSlots<Entry> = {
	key: (entry) => entry.id,
	leading: { icon: () => "FileDiff" },
	title: (entry) => entry.title,
	meta: (entry) => entry.meta,
	status: (entry) => entry.status,
	warning: (entry) => entry.warning,
	lock: (entry) => entry.lock,
	chip: (entry) => entry.chip,
	act: (entry) => entry.act,
	more: () => MORE,
};

const ENTRIES: Entry[] = [
	{
		id: "checkout",
		title: "Checkout redesign",
		meta: ["+5 fields"],
		status: { state: "done", label: "Passing" },
		warning: "Name conflicts with Checkout",
		lock: "Holds 3 fields",
		chip: { family: "amber", label: "Changed" },
		act: { label: "Resolve", onAct: act },
	},
	{
		id: "invoice",
		title: "Invoice export with the quarterly reconciliation",
		meta: ["+12 fields"],
		status: { state: "failed", label: "Failing" },
		warning: "Stale since the last release of the billing schema",
		lock: "Holds 14 fields across two environments",
		chip: { family: "green", label: "Added" },
		act: { label: "Refresh", onAct: act },
	},
];

// A change set: each row where it stands, one of every kind, with a leading glyph
// so the mark is seen ahead of it.
interface Change {
	id: string;
	kind: ChangeKind;
	title: string;
	meta: string[];
}

const CHANGE_ROW: RowSlots<Change> = {
	key: (change) => change.id,
	change: (change) => change.kind,
	leading: { icon: () => "Workflow" },
	title: (change) => change.title,
	meta: (change) => change.meta,
};

const CHANGES: Change[] = [
	{ id: "intake", kind: "added", title: "Intake form", meta: ["Step 1"] },
	{ id: "review", kind: "changed", title: "Review", meta: ["Step 2"] },
	{ id: "legacy", kind: "removed", title: "Manual approval", meta: ["Step 3"] },
	{ id: "notify", kind: "unchanged", title: "Notify", meta: ["Step 4"] },
	{ id: "archive", kind: "stale", title: "Archive", meta: ["Step 5"] },
];

// A journey's hops with the run's path highlighted: the rows on it at full
// contrast, the rest dimmed, each still a link.
interface Hop {
	id: string;
	title: string;
	meta: string[];
	onPath: boolean;
	status: StatusMark;
}

const HOP_ROW: RowSlots<Hop> = {
	key: (hop) => hop.id,
	leading: { icon: () => "Workflow" },
	title: (hop) => hop.title,
	meta: (hop) => hop.meta,
	status: (hop) => hop.status,
	dim: (hop) => !hop.onPath,
	href: (hop) => `#${hop.id}`,
};

const HOPS: Hop[] = [
	{
		id: "signup",
		title: "Sign up",
		meta: ["Trigger"],
		onPath: true,
		status: { state: "done", label: "Taken" },
	},
	{
		id: "welcome",
		title: "Send welcome email",
		meta: ["Email"],
		onPath: true,
		status: { state: "done", label: "Taken" },
	},
	{
		id: "survey",
		title: "Ask for a survey",
		meta: ["Email"],
		onPath: false,
		status: { state: "waiting", label: "Skipped" },
	},
	{
		id: "upsell",
		title: "Offer the annual plan",
		meta: ["Banner"],
		onPath: false,
		status: { state: "failed", label: "Failed" },
	},
];

// A branching journey as a tree of three levels: a choice point's legs under
// it, a leg's steps under that, the leg off the run's path dimmed whole.
interface Leg extends Hop {
	children?: Leg[];
}

const LEG_ROW: RowSlots<Leg> = {
	...HOP_ROW,
	children: (leg) => leg.children,
};

const LEGS: Leg[] = [
	{
		id: "tree-signup",
		title: "Sign up",
		meta: ["Trigger"],
		onPath: true,
		status: { state: "done", label: "Taken" },
		children: [
			{
				id: "tree-paid",
				title: "Plan is paid",
				meta: ["Choice"],
				onPath: true,
				status: { state: "done", label: "Taken" },
				children: [
					{
						id: "tree-welcome",
						title: "Send welcome email",
						meta: ["Email"],
						onPath: true,
						status: { state: "done", label: "Taken" },
					},
					{
						id: "tree-billing",
						title: "Add to the billing list",
						meta: ["Segment"],
						onPath: true,
						status: { state: "running", label: "Running" },
					},
				],
			},
			{
				id: "tree-free",
				title: "Plan is free",
				meta: ["Choice"],
				onPath: false,
				status: { state: "waiting", label: "Skipped" },
				children: [
					{
						id: "tree-survey",
						title: "Ask for a survey",
						meta: ["Email"],
						onPath: false,
						status: { state: "waiting", label: "Skipped" },
					},
					{
						id: "tree-upsell",
						title: "Offer the annual plan",
						meta: ["Banner"],
						onPath: false,
						status: { state: "failed", label: "Failed" },
					},
				],
			},
		],
	},
];

// An import whose act pends: its steps stand in its meta line's place, one
// done, one running, one waiting; the settled row below gives its meta back.
interface Import {
	id: string;
	title: string;
	meta: string[];
	steps?: StatusMark[];
}

const IMPORT_ROW: RowSlots<Import> = {
	key: (run) => run.id,
	leading: { icon: () => "Globe" },
	title: (run) => run.title,
	meta: (run) => run.meta,
	steps: (run) => run.steps,
	act: (run) => ({
		label: "Import",
		onAct: act,
		loading: run.steps !== undefined,
	}),
	more: () => MORE,
};

const IMPORTS: Import[] = [
	{
		id: "docs",
		title: "Documentation site",
		meta: ["Imported 2 min ago"],
		steps: [
			{ state: "done", label: "Fetched 48 pages" },
			{ state: "running", label: "Reading the pages" },
			{ state: "waiting", label: "Indexing" },
		],
	},
	{
		id: "help",
		title: "Help centre",
		meta: ["Imported yesterday", "212 pages"],
	},
];

// A memory note read whole: its title wraps to every line it needs, its origin
// on the meta line, its more act on the first line.
interface Memory {
	id: string;
	title: string;
	origin: string;
}

const MEMORY_ROW: RowSlots<Memory> = {
	key: (memory) => memory.id,
	title: (memory) => memory.title,
	meta: (memory) => [memory.origin],
	wrap: true,
	more: () => MORE,
};

const MEMORIES: Memory[] = [
	{
		id: "tone",
		title:
			"Ana prefers short replies with the decision first, then the reasons, and never more than three bullet points in a message to the whole team.",
		origin: "From a chat on Monday",
	},
	{ id: "tz", title: "Works from Lisbon.", origin: "From her profile" },
];

// A change set entry the viewer ticks to publish: one ticked, one not, one
// that cannot be ticked, its reason leading its meta line.
interface Tick {
	id: string;
	title: string;
	meta: string[];
	checked: boolean;
	blocked?: string;
}

const TICK_ROW: RowSlots<Tick> = {
	key: (tick) => tick.id,
	leading: {
		check: (tick) => ({
			checked: tick.checked,
			onChange: act,
			blocked: tick.blocked,
		}),
	},
	title: (tick) => tick.title,
	meta: (tick) => tick.meta,
};

const TICKS: Tick[] = [
	{
		id: "checkout",
		title: "Checkout redesign",
		meta: ["+5 fields"],
		checked: true,
	},
	{
		id: "invoice",
		title: "Invoice export",
		meta: ["+12 fields"],
		checked: false,
	},
	{
		id: "legacy",
		title: "Manual approval",
		meta: ["Removed"],
		checked: false,
		blocked: "Held by CR-12, Ana",
	},
];

// An import source asking for its URL: its input and Import act on the row;
// the second row's address failed.
interface Source {
	id: string;
	title: string;
	entry: RowEntry;
}

const SOURCE_ROW: RowSlots<Source> = {
	key: (source) => source.id,
	leading: { icon: () => "Globe" },
	title: (source) => source.title,
	entry: (source) => source.entry,
};

const SOURCES: Source[] = [
	{
		id: "docs",
		title: "Documentation site",
		entry: {
			label: "Documentation URL",
			field: { value: "", onChange: act },
			placeholder: "https://docs.acme.app",
			act: { label: "Import", onAct: act },
		},
	},
	{
		id: "help",
		title: "Help centre",
		entry: {
			label: "Help centre URL",
			field: { value: "help.acme", onChange: act },
			act: { label: "Import", onAct: act },
			error: "Enter a full address starting with https://.",
		},
	},
];

function Issues() {
	return <List items={issues()} row={ISSUE_ROW} />;
}

// Board 40's props: deploys in a List (a glyph leading, a status and a chip
// on the meta line, the more act), services on one line, a job's stages (a
// running row beside an active one), change set entries (every mark and the
// act that clears the warning), a change set (one row of every kind), ticked
// entries (one ticked, one blocked), a journey's hops (the rows off the
// path dimmed) and the same journey as a tree of three levels, an import whose steps stand in its meta line's place, notes
// whose titles wrap whole, and members in a Group (a trailing
// value, a trailing pick, a status dot leading).
function Props() {
	return (
		<>
			<List items={DEPLOYS} row={DEPLOY_ROW} />
			<List items={SERVICES} row={SERVICE_ROW} />
			<List items={STAGES} row={STAGE_ROW} />
			<List items={STEPS} row={STEP_ROW} />
			<List items={SOURCES} row={SOURCE_ROW} />
			<List items={ENTRIES} row={ENTRY_ROW} />
			<List items={CHANGES} row={CHANGE_ROW} />
			<List items={TICKS} row={TICK_ROW} />
			<List items={HOPS} row={HOP_ROW} />
			<List items={LEGS} row={LEG_ROW} />
			<List items={IMPORTS} row={IMPORT_ROW} />
			<List items={MEMORIES} row={MEMORY_ROW} />
			<Group>
				<ListRow
					leading={{ icon: "Globe" }}
					title="Pricing page"
					meta={["Imported 2 min ago"]}
					status={{ state: "done", label: "Imported" }}
					act={{ label: "Edit", onAct: act }}
				/>
				<ListRow
					leading={{ avatar: { name: "Ana Ruiz" } }}
					title="Ana Ruiz"
					meta={["ana@acme.app"]}
					trailing={{ value: "Owner" }}
					more={MORE}
				/>
				<ListRow
					leading={{ avatar: { name: "Ben Kaya" } }}
					title="Ben Kaya"
					meta={["ben@acme.app"]}
					trailing={{
						pick: {
							label: "Ben Kaya's role",
							options: ROLES,
							value: "admin",
							onChange: act,
						},
					}}
					more={MORE}
				/>
				<ListRow
					leading={{ status: "waiting" }}
					title="lea@northwind.io"
					meta={["Invited 2 d ago by Ana Ruiz"]}
					status={{ state: "waiting", label: "Pending" }}
					more={MORE}
				/>
			</Group>
		</>
	);
}

// Waiting rows over the loaded ones they stand in for, led by the kind the
// cell names (a glyph by default), then a note's title over its meta with no
// leading.
function Waiting(props: { kind: "avatar" | "icon" | "status" | "check" }) {
	let led = (
		<>
			<List items={[]} loading row={DEPLOY_ROW} />
			<List items={DEPLOYS} row={DEPLOY_ROW} />
		</>
	);
	if (props.kind === "avatar")
		led = (
			<>
				<List items={[]} loading row={ISSUE_ROW} />
				<List items={issues()} row={ISSUE_ROW} />
			</>
		);
	if (props.kind === "status")
		led = (
			<>
				<List items={[]} loading row={INVITE_ROW} />
				<List items={INVITES} row={INVITE_ROW} />
			</>
		);
	if (props.kind === "check")
		led = (
			<>
				<List items={[]} loading row={TICK_ROW} />
				<List items={TICKS} row={TICK_ROW} />
			</>
		);
	return (
		<>
			{led}
			<List items={[]} loading row={NOTE_ROW} />
			<List items={[]} loading row={STEP_ROW} />
			<List items={STEPS} row={STEP_ROW} />
			<List items={[]} loading row={SOURCE_ROW} />
			<List items={SOURCES} row={SOURCE_ROW} />
			<List items={[]} loading row={ENTRY_ROW} />
			<List items={ENTRIES} row={ENTRY_ROW} />
			<List items={[]} loading row={CHANGE_ROW} />
			<List items={CHANGES} row={CHANGE_ROW} />
			<List items={[]} loading row={LEG_ROW} />
			<List items={LEGS} row={LEG_ROW} />
			<List items={[]} loading row={IMPORT_ROW} />
			<List items={IMPORTS} row={IMPORT_ROW} />
			<List items={[]} loading row={MEMORY_ROW} />
			<List items={MEMORIES} row={MEMORY_ROW} />
		</>
	);
}

// The leading kind a skeleton cell stands for.
function waitingKind(cell: string): "avatar" | "icon" | "status" | "check" {
	if (cell === "SKELETON.kind.avatar") return "avatar";
	if (cell === "SKELETON.kind.check") return "check";
	if (cell === "SKELETON.kind.dot") return "status";
	return "icon";
}

// The skeleton and line-box cells draw the waiting rows; the current state
// draws the Split's list, a cell on the group ground or a
// part only the props draw (a chip, the more act, a glyph, one line) the
// props; the rest cells draw the issues too.
export function drawListRow(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell.startsWith("SKELETON") || cell.startsWith("LINE_BOX"))
		return (
			<Page>
				<Waiting kind={waitingKind(cell)} />
			</Page>
		);
	const props =
		cell === "ROW.ground.group" ||
		cell === "ROW.lines.one" ||
		cell === "ROW.lines.whole" ||
		cell.startsWith("ROW_TITLE") ||
		cell.startsWith("ROW_STEP") ||
		cell.startsWith("CHIP") ||
		cell.startsWith("ICON") ||
		cell.startsWith("BUTTON") ||
		cell.startsWith("FIELD") ||
		cell.startsWith("FORM_FIELD") ||
		cell === "ROW_MARKS" ||
		cell === "ROW_WARNING" ||
		cell.startsWith("CHANGE_MARK") ||
		cell.startsWith("CHECKBOX") ||
		cell === "ROW_ACTS";
	return <Page>{props ? <Props /> : <Issues />}</Page>;
}
