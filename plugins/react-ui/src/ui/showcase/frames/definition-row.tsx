import type { StatusState } from "@fcalell/ui-core/tokens";
import {
	DefinitionRow,
	DefinitionRowBase,
} from "../../components/definition-row/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { isFirstCell, type ShowcaseFrame } from "../cells.ts";
import { readsAt } from "../waiting.ts";
import { Wide } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";

const act = () => {};

// A fact picked in place.
const CYCLE = {
	label: "Billing cycle",
	options: [
		{ value: "monthly", label: "Monthly" },
		{ value: "yearly", label: "Yearly" },
	],
	value: "monthly",
	onChange: act,
};

// The facts of a card, as loaded or painted; a painted row paints each part
// of what it is given (a description, an act, a link, a control).
export function Facts(props: { painted?: boolean }) {
	return (
		<Group
			items={[
				{
					key: "plan",
					row: (
						<DefinitionRowBase
							painted={props.painted}
							label="Plan"
							value="Business"
						/>
					),
				},
				{
					key: "workspace-name",
					row: (
						<DefinitionRowBase
							painted={props.painted}
							label="Workspace name"
							value="Acme"
							act={{ icon: "Pencil", label: "Rename", onAct: act }}
						/>
					),
				},
				{
					key: "workspace-id",
					row: (
						<DefinitionRowBase
							painted={props.painted}
							label="Workspace ID"
							value="ws_7f3k9q2m4x"
							copyable
						/>
					),
				},
				{
					key: "custom-domain",
					row: (
						<DefinitionRowBase
							painted={props.painted}
							label="Custom domain"
							description="Mail and links go out from it."
							value={{ status: "done", label: "Verified" }}
							href="#domain"
						/>
					),
				},
				{
					key: "contract-end",
					row: (
						<DefinitionRowBase
							painted={props.painted}
							label="Contract end"
							value="31 Dec 2026"
							locked={{ reason: "Held by CR-12, Ana" }}
						/>
					),
				},
				{
					key: "notify-on-failure",
					row: (
						<DefinitionRowBase
							painted={props.painted}
							label="Notify on failure"
							switch={{ checked: true, onChange: act }}
						/>
					),
				},
				{
					key: "billing-cycle",
					row: (
						<DefinitionRowBase
							painted={props.painted}
							label="Billing cycle"
							pick={CYCLE}
						/>
					),
				},
			]}
		/>
	);
}

function Region() {
	return (
		<DefinitionRow
			label="Region"
			value="Frankfurt (eu-central-1)"
			href="#region"
		/>
	);
}

// Board 40's settings: an act, a copyable code value under a description, a
// link, a status under a description, a row with neither act nor link, a value
// of words, a sentence label beside a switch, and
// two locked values, their reason a link to the request that holds one.
function General(props: { status: StatusState }) {
	return (
		<Group
			items={[
				{
					key: "workspace-name",
					row: (
						<DefinitionRow
							label="Workspace name"
							value="Acme"
							act={{ icon: "Pencil", label: "Rename", onAct: act }}
						/>
					),
				},
				{
					key: "workspace-id",
					row: (
						<DefinitionRow
							label="Workspace ID"
							description="The API and the CLI address the workspace by it."
							value="ws_7f3k9q2m4x"
							copyable
						/>
					),
				},
				{ key: "region2", row: <Region /> },
				{
					key: "custom-domain",
					row: (
						<DefinitionRow
							label="Custom domain"
							description="Mail and links go out from it."
							value={{
								status: props.status,
								label: props.status === "done" ? "Verified" : undefined,
							}}
							href="#domain"
						/>
					),
				},
				{
					key: "plan",
					row: (
						<DefinitionRow
							label="Plan"
							description="Your organisation manages it."
							value="Business"
						/>
					),
				},
				{
					key: "contract-end",
					row: (
						<DefinitionRow
							label="Contract end"
							value="31 Dec 2026"
							locked={{ reason: "Held by CR-12, Ana", href: "#cr-12" }}
						/>
					),
				},
				{
					key: "billing-contact",
					row: (
						<DefinitionRow
							label="Billing contact"
							value="ana@acme.test"
							locked={{ reason: "Set by your organisation" }}
						/>
					),
				},
				{
					key: "expected-spend",
					row: <DefinitionRow label="Expected spend" value="No history yet" />,
				},
				{
					key: "only-what-changed-since-you-last-looked",
					row: (
						<DefinitionRow
							label="Only what changed since you last looked"
							switch={{ checked: true, onChange: act }}
						/>
					),
				},
				{
					key: "billing-cycle",
					row: <DefinitionRow label="Billing cycle" pick={CYCLE} />,
				},
			]}
		/>
	);
}

// A change set's facts, one of every kind, a value changed, added, removed,
// untouched or gone stale.
function Changes() {
	return (
		<Group
			items={[
				{
					key: "region",
					row: (
						<DefinitionRow
							change="changed"
							label="Region"
							value="Frankfurt (eu-central-1)"
						/>
					),
				},
				{
					key: "custom-domain",
					row: (
						<DefinitionRow
							change="added"
							label="Custom domain"
							value="acme.app"
						/>
					),
				},
				{
					key: "fallback-region",
					row: (
						<DefinitionRow
							change="removed"
							label="Fallback region"
							value="Dublin"
						/>
					),
				},
				{
					key: "workspace-name",
					row: (
						<DefinitionRow
							change="unchanged"
							label="Workspace name"
							description="Shown to every member."
							value="Acme"
						/>
					),
				},
				{
					key: "plan",
					row: <DefinitionRow change="stale" label="Plan" value="Business" />,
				},
			]}
		/>
	);
}

// The facts of a card whose read failed, no frame above holding it: each row
// is the failed form itself, one that opens and one that does not, a counted
// one beside them.
function Failed(props: { id: string }) {
	const failing = readsAt(props.id).failing;
	return (
		<Group
			items={[
				{
					key: "region",
					row: (
						<DefinitionRow
							label="Region"
							description="Where the workspace runs."
							value={failing.at((rows) => rows.join(", "))}
							href="#region"
						/>
					),
				},
				{
					key: "plan",
					row: (
						<DefinitionRow
							label="Plan"
							description="Your organisation manages it."
							value={failing.at((rows) => rows.join(", "))}
						/>
					),
				},
				{
					key: "knowledge",
					row: (
						<DefinitionRow
							label="Knowledge"
							value={failing.at((rows) => `${rows.length}`)}
							href="#knowledge"
						/>
					),
				},
			]}
		/>
	);
}

// Every cell draws the settings group, a `STATUS_DOT.state` cell its status
// row in that state, a `CHANGE_MARK` cell the change set's facts; a `PAINT`
// cell draws a card of facts painted beside the loaded one.
export function drawDefinitionRow(frame: ShowcaseFrame) {
	if (isPaint(frame)) {
		if (frame.state !== "rest") return undefined;
		return (
			<Wide>
				<Facts />
				<Facts painted />
			</Wide>
		);
	}
	// The error state, on the first cell, draws the rows over a read that failed.
	if (frame.state === "error")
		return isFirstCell(frame) ? (
			<Wide>
				<Failed id={frame.id} />
			</Wide>
		) : undefined;
	const [family, , value] = frame.cell.name.split(".");
	// The third segment of a `STATUS_DOT.state` cell is a state key.
	const status = family === "STATUS_DOT" ? (value as StatusState) : "done";
	const rest =
		family === "CHANGE_MARK" ? <Changes /> : <General status={status} />;
	return <Wide>{rest}</Wide>;
}
