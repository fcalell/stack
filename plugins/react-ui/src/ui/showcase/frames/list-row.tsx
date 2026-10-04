import type {
	ChipMark,
	IconName,
	MenuItem,
	StatusMark,
} from "@fcalell/ui-core/descriptors";
import type { StatusState } from "@fcalell/ui-core/tokens";
import { Group } from "../../components/group/index.tsx";
import { List, type RowSlots } from "../../components/list/index.tsx";
import { ListRow } from "../../components/list-row/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const act = () => {};
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
		age: "40 min",
		status: { state: "failed", label: "Failed" },
		chip: { family: "red", label: "Rolled back" },
	},
	{
		id: "worker",
		glyph: "Server",
		title: "worker · main",
		meta: ["0c5e4aa", "Ema Okafor"],
		age: "2 h",
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
	{ id: "api", glyph: "Rocket", title: "api · main", age: "Just now" },
	{ id: "cron", glyph: "Clock", title: "cron · main", age: "1 h" },
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
			age: "2 h",
			status: { state: "active", label: "In progress" },
			href: location.pathname,
		},
		{
			id: "acm-139",
			assignee: "Ema Okafor",
			title: "Export cohorts to CSV",
			meta: ["ACM-139", "Growth"],
			age: "5 h",
			status: { state: "waiting", label: "Todo" },
			href: "#acm-139",
		},
		{
			id: "acm-137",
			assignee: "Ana Ruiz",
			title: "Retry failed webhooks with backoff",
			meta: ["ACM-137", "Infra"],
			age: "1 d",
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

function Issues() {
	return <List items={issues()} row={ISSUE_ROW} />;
}

// Board 40's props: deploys in a List (a glyph leading, a status and a chip
// on the meta line, the more act), services on one line, a job's stages (a
// running row beside an active one), and members in a Group (a trailing
// value, a trailing pick, a status dot leading).
function Props() {
	return (
		<>
			<List items={DEPLOYS} row={DEPLOY_ROW} />
			<List items={SERVICES} row={SERVICE_ROW} />
			<List items={STAGES} row={STAGE_ROW} />
			<Group>
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
function Waiting(props: { kind: "avatar" | "icon" | "status" }) {
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
	return (
		<>
			{led}
			<List items={[]} loading row={NOTE_ROW} />
		</>
	);
}

// The leading kind a skeleton cell stands for.
function waitingKind(cell: string): "avatar" | "icon" | "status" {
	if (cell === "SKELETON.kind.avatar") return "avatar";
	if (cell === "SKELETON.kind.dot") return "status";
	return "icon";
}

// The skeleton and line-box cells draw the waiting rows; the pointer, focus
// and current states draw the Split's list, a cell on the group ground or a
// part only the props draw (a chip, the more act, a glyph, one line) the
// props; the rest cells draw the issues too.
export function drawListRow(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell.startsWith("SKELETON") || cell.startsWith("LINE_BOX"))
		return (
			<Wide>
				<Waiting kind={waitingKind(cell)} />
			</Wide>
		);
	const props =
		cell === "ROW.ground.group" ||
		cell === "ROW.lines.one" ||
		cell.startsWith("CHIP") ||
		cell.startsWith("ICON") ||
		cell === "ROW_ACTS";
	return <Wide>{props ? <Props /> : <Issues />}</Wide>;
}
