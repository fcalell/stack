import type { Option } from "@fcalell/ui-core/descriptors";
import { useState } from "react";
import { Group } from "../../components/group/index.tsx";
import { ListRow } from "../../components/list-row/index.tsx";
import { Picker } from "../../components/picker/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { press, Stage } from "./overlay-stage.tsx";

const change = () => {};
const ROLES = [
	{
		value: "owner",
		label: "Owner",
		description: "Everything, billing included",
	},
	{
		value: "admin",
		label: "Admin",
		description: "Manages members and settings",
	},
	{
		value: "member",
		label: "Member",
		description: "Creates and edits projects",
	},
	{ value: "viewer", label: "Viewer", description: "Reads and comments" },
] as const;
type Role = (typeof ROLES)[number]["value"];
const OWNERS = [
	{ value: null, label: "Anyone", description: "Every owner, no filter" },
	{ value: "ana", label: "Ana Ruiz", description: "ana@acme.app" },
	{ value: "ben", label: "Ben Kaya", description: "ben@acme.app" },
	{ value: "chen", label: "Chen Wu", description: "chen@acme.app" },
	{
		value: "dana",
		label: "Dana Moss",
		description: "dana@acme.app",
		blocked: "On leave until June",
	},
	{ value: "ema", label: "Ema Okafor", description: "ema@acme.app" },
	{ value: "felix", label: "Felix Varga", description: "felix@acme.app" },
];
// Options carrying their kind as a chip after the label.
const CONTEXTS = [
	{ value: "live", label: "Live" },
	{
		value: "billing",
		label: "Billing limits",
		chip: { family: "amber", label: "Draft" },
	},
	{
		value: "onboarding",
		label: "Onboarding copy",
		chip: { family: "green", label: "Ready" },
	},
] satisfies Option[];
const MEMBERS = [
	{ name: "Ben Kaya", email: "ben@acme.app", role: "admin" },
	{ name: "Chen Wu", email: "Invited 2 days ago", role: "member" },
	{ name: "Ema Okafor", email: "ema@acme.app", role: "member" },
] as const;

// A member's role as a row's trailing pick.
function Members() {
	return (
		<Group>
			{MEMBERS.map((member) => (
				<ListRow<Role>
					key={member.name}
					leading={{ avatar: { name: member.name } }}
					title={member.name}
					meta={[member.email]}
					trailing={{
						pick: {
							label: `${member.name}'s role`,
							options: [...ROLES],
							value: member.role,
							onChange: change,
						},
					}}
				/>
			))}
		</Group>
	);
}

function Triggers() {
	return (
		<div className="flex flex-wrap items-start gap-sections">
			<Picker
				label="Role"
				options={[...ROLES]}
				value="admin"
				onChange={change}
			/>
			<Picker label="Owner" options={OWNERS} value={null} onChange={change} />
			<Picker label="Reviewer" options={OWNERS.slice(1)} onChange={change} />
			<Picker label="Role" options={[...ROLES]} onChange={change} fit="row" />
			<Picker
				label="Context"
				options={CONTEXTS}
				value="billing"
				onChange={change}
			/>
			<Picker
				label="Context"
				options={CONTEXTS}
				value="billing"
				onChange={change}
				fit="row"
			/>
		</div>
	);
}

// The bar fit fills its column: a pick, and a pick of several holding its
// values as chips (two, none, then a blocked option in the value).
function Bars() {
	const [roles, setRoles] = useState<Role[]>(["admin", "member"]);
	const [reviewers, setReviewers] = useState<(string | null)[]>([]);
	// Dana is blocked and chosen: her chip removes, and her row draws as any
	// chosen one.
	const [approvers, setApprovers] = useState<(string | null)[]>(["dana"]);
	return (
		<div className="flex w-popover max-w-full flex-col gap-pair">
			<Picker
				fit="bar"
				label="Role"
				options={[...ROLES]}
				value="admin"
				onChange={change}
			/>
			<Picker
				fit="bar"
				label="Roles"
				options={[...ROLES]}
				value={roles}
				onChange={setRoles}
			/>
			<Picker
				fit="bar"
				label="Reviewers"
				options={OWNERS.slice(1)}
				value={reviewers}
				onChange={setReviewers}
			/>
			<Picker
				fit="bar"
				label="Approvers"
				options={OWNERS.slice(1)}
				value={approvers}
				onChange={setApprovers}
			/>
		</div>
	);
}

// The trigger opens from the pointer: a popover's on its press down, a
// sheet's on its click.
function openFirst(stage: HTMLElement) {
	const trigger = stage.querySelector("button");
	for (const type of ["pointerdown", "mousedown"])
		trigger?.dispatchEvent(
			new PointerEvent(type, {
				bubbles: true,
				pointerType: "mouse",
				button: 0,
			}),
		);
	press(trigger);
}

// The row fit's cells draw the members' picks; the open state draws the
// role pick's list (four options, no search) on the row fit cells and the
// owner filter's (seven two-line options, the search leading and an act after
// them, which stands the touch sheet full height) on the field cells; every other
// cell the field-fit triggers (two of them an option's chip after its label),
// with a value, with the empty choice and with
// none (its label in the placeholder's ink, a row fit's too).
export function drawPicker(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const row =
		cell.startsWith("PICKER.fit.row") ||
		cell === "PILL_ACT" ||
		cell === "PICKER_VALUE" ||
		cell.startsWith("ICON.fit.meta") ||
		cell.startsWith("ROW.");
	const bar = cell.startsWith("PICKER.fit.bar");
	if (frame.state === "selected")
		return (
			<Stage contain={frame.density === "touch"} ready={openFirst}>
				<div className="flex flex-col p-card">{opened(row, bar)}</div>
			</Stage>
		);
	if (row) return <Members />;
	return bar ? <Bars /> : <Triggers />;
}

// What the open state draws: the members' row picks, the bar fit's picks, or
// the owner filter.
function opened(row: boolean, bar: boolean) {
	if (row) return <Members />;
	if (bar) return <Bars />;
	return (
		<Picker
			label="Owner"
			options={OWNERS}
			value={null}
			onChange={change}
			act={{ icon: "Plus", label: "Add an owner", onAct: change }}
		/>
	);
}
