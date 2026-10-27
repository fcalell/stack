import type { Option } from "@fcalell/ui-core/descriptors";
import { useState } from "react";
import { FormField } from "../../components/form-field/index.tsx";
import { HeldPicker } from "../../components/picker/base.tsx";
import { Picker } from "../../components/picker/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { ago } from "../ago.ts";
import { isFirstCell, type ShowcaseFrame } from "../cells.ts";
import { endedAt, itemsAt } from "../waiting.ts";
import { press, Stage } from "./overlay-stage.tsx";
import { beside } from "./painted.tsx";
import { drawList, FailedLists } from "./picker-list.tsx";
import { drawSegments } from "./picker-segments.tsx";

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
		<Section
			items={MEMBERS.map((member) => ({
				key: member.name,
				leading: { avatar: { name: member.name } },
				title: member.name,
				meta: [member.email],
				pick: {
					label: `${member.name}'s role`,
					options: [...ROLES],
					value: member.role,
					onChange: change,
				},
			}))}
		/>
	);
}

// A switch that moves as a status: a row's pick whose options carry states
// is the compact state pill, its chevron inside at its end, as a record
// head's status pick is; beside them a row whose pick carries no state keeps
// its value and chevron in the word act. The names are long enough to need
// their room beside the age and the pick at 320.
const POWER = [
	{ value: "on", label: "On", status: "done" },
	{ value: "off", label: "Off", status: "idle" },
] satisfies Option[];
const MODES = [
	{ value: "eco", label: "Eco" },
	{ value: "comfort", label: "Comfort" },
] satisfies Option[];

function Rooms() {
	return (
		<Section
			items={[
				{
					key: "bathroom",
					leading: { icon: "Lightbulb" },
					title: "Bathroom light",
					trailing: { age: ago(4) },
					pick: {
						label: "Bathroom light",
						options: POWER,
						value: "on",
						onChange: change,
					},
				},
				{
					key: "hall",
					leading: { icon: "Lightbulb" },
					title: "Hall light",
					trailing: { age: ago(95) },
					pick: {
						label: "Hall light",
						options: POWER,
						value: "off",
						onChange: change,
					},
				},
				{
					key: "heating",
					leading: { icon: "Thermometer" },
					title: "Living room heating",
					trailing: { age: ago(30) },
					pick: {
						label: "Living room heating",
						options: MODES,
						value: "comfort",
						onChange: change,
					},
				},
			]}
		/>
	);
}

function Triggers() {
	return (
		<div className="flex flex-wrap items-start gap-section">
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
		<div className="flex w-popover max-w-full flex-col gap-gap">
			<Picker
				label="Role"
				options={[...ROLES]}
				value="admin"
				onChange={change}
			/>
			<Picker
				label="Roles"
				options={[...ROLES]}
				value={roles}
				onChange={setRoles}
			/>
			<Picker
				label="Reviewers"
				options={OWNERS.slice(1)}
				value={reviewers}
				onChange={setReviewers}
			/>
			<Picker
				label="Approvers"
				options={OWNERS.slice(1)}
				value={approvers}
				onChange={setApprovers}
			/>
		</div>
	);
}

// A pick a `FormField` holds: the field's label over the box at the form's
// field height, the placeholder in its ink while nothing is chosen, the field's
// error and disabled states on the box; a pick of one, then of several, each
// chosen and not.
function Fielded(props: {
	invalid?: boolean;
	disabled?: boolean;
	only?: boolean;
}) {
	const { invalid, disabled, only } = props;
	const [roles, setRoles] = useState<Role[]>(["admin", "member"]);
	const [none, setNone] = useState<Role[]>([]);
	const error = invalid ? "Pick a role." : undefined;
	return (
		<div className="flex w-popover max-w-full flex-col gap-stack">
			<FormField
				label="Default role"
				description="Given to anyone who joins."
				error={error}
				disabled={disabled}
				picker={{
					value: "admin",
					onChange: change,
					options: [...ROLES],
					placeholder: "Choose a role",
				}}
			/>
			{only ? null : (
				<>
					<FormField
						label="Fallback role"
						error={error}
						disabled={disabled}
						picker={{
							onChange: change,
							options: [...ROLES],
							placeholder: "Choose a role",
						}}
					/>
					<FormField
						label="Allowed roles"
						error={error}
						disabled={disabled}
						picker={{
							value: roles,
							onChange: setRoles,
							options: [...ROLES],
							placeholder: "Choose roles",
						}}
					/>
					<FormField
						label="Blocked roles"
						error={error}
						disabled={disabled}
						picker={{
							value: none,
							onChange: setNone,
							options: [...ROLES],
							placeholder: "Choose roles",
						}}
					/>
				</>
			)}
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

// The cells only the list fit draws, and those only the segments fit does; every
// other cell is the menu's.
const LIST_CELLS = [
	"BLOCK_IN",
	"OPTION_LIST",
	"OPTION_GROUP_LABEL",
	"TEXT_STRONG",
	"OPTION_LINE",
	"LINE_BOX",
	"CHECKBOX",
	"OPTION_RADIO",
	"ROW_TITLE_LINE",
	"ROW_META_LINE",
	"OPTION_CHILDREN",
	"OPTION_INDENT",
	"PAINT.kind.glyphs",
	"SCRAMBLE",
	"LINE_IN",
];
const SEGMENT_CELLS = ["SEGMENT"];
const drawn = (cell: string, prefixes: readonly string[]) =>
	prefixes.some((prefix) => cell.startsWith(prefix));

// The menu fit: the row fit's cells draw the members' picks and the rooms'
// (two picks of states, one of none); the open state draws the
// role pick's list (four options, no search) on the row fit cells and the
// owner filter's (seven two-line options, the search leading and an act after
// them, which stands the touch sheet full height) on the field cells; every other
// cell the field-fit triggers (two of them an option's chip after its label),
// with a value, with the empty choice and with
// none (its label in the placeholder's ink, a row fit's too).
//
// `PAINT.kind.control` draws the field-fit trigger beside its painted form, then
// the list's and the segments'. The list fit and the segments fit draw the
// cells they own (`drawList`, `drawSegments`); loading, the menu's options
// wait and its trigger paints.
export function drawPicker(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell === "PAINT.kind.control")
		return beside(
			frame,
			<div className="flex flex-col items-start gap-section">
				<div className="flex flex-wrap items-center gap-section">
					<Picker
						label="Role"
						options={[...ROLES]}
						value="admin"
						onChange={change}
					/>
					<HeldPicker
						label="Role"
						options={[...ROLES]}
						value="admin"
						onChange={change}
						painted
					/>
				</div>
				{drawList(frame)}
				{drawSegments(frame)}
			</div>,
			null,
		);
	if (drawn(cell, LIST_CELLS)) return drawList(frame);
	if (drawn(cell, SEGMENT_CELLS)) return drawSegments(frame);
	if (frame.state === "loading")
		return (
			<Picker
				label="Role"
				options={itemsAt(frame.id, "loading", [...ROLES])}
				value="admin"
				onChange={change}
			/>
		);
	// The error state, on the first cell, adds the picker over options that fail
	// and answer not found, which no frame holds, so it says so itself.
	if (frame.state === "error")
		return (
			<div className="flex w-popover max-w-full flex-col gap-section">
				<Fielded invalid />
				{isFirstCell(frame)
					? endedAt<Option>(frame.id, "error").map(({ title, items }) => (
							<Picker
								key={title}
								label={title}
								options={items}
								value="admin"
								onChange={change}
							/>
						))
					: null}
				{isFirstCell(frame) ? <FailedLists id={frame.id} /> : null}
			</div>
		);
	const row =
		cell.startsWith("PICKER.fit.row") ||
		cell === "WORD_ACT" ||
		cell === "PICKER_VALUE" ||
		cell.startsWith("ICON.fit.meta") ||
		cell.startsWith("ROW.");
	const bar = cell.startsWith("PICKER.fit.bar");
	// The field's cells, and the disabled state of the rest, draw the picks a
	// `FormField` holds.
	const fielded =
		cell === "FIELD.state.error" ||
		(frame.state === "disabled" && !row && !bar);
	if (frame.state === "selected")
		return (
			<Stage contain={frame.density === "touch"} ready={openFirst}>
				<div className="flex flex-col p-pad">{opened(row, bar, fielded)}</div>
			</Stage>
		);
	if (fielded) return <Fielded disabled={frame.state === "disabled"} />;
	if (row)
		return (
			<div className="flex flex-col gap-section">
				<Members />
				<Rooms />
			</div>
		);
	return bar ? <Bars /> : <Triggers />;
}

// What the open state draws: the members' row picks, the bar fit's picks, a
// field's pick, or the owner filter.
function opened(row: boolean, bar: boolean, fielded: boolean) {
	if (row) return <Members />;
	if (bar) return <Bars />;
	if (fielded) return <Fielded only />;
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
