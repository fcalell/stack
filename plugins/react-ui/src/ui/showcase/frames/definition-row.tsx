import type { StatusState } from "@fcalell/ui-core/tokens";
import { DefinitionRow } from "../../components/definition-row/index.tsx";
import { Group } from "../../components/group/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const act = () => {};

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
// link, a status under a description, a row with neither act nor link, and
// two locked values, their reason a link to the request that holds one.
function General(props: { status: StatusState }) {
	return (
		<Group>
			<DefinitionRow
				label="Workspace name"
				value="Acme"
				act={{ icon: "Pencil", label: "Rename", onAct: act }}
			/>
			<DefinitionRow
				label="Workspace ID"
				description="The API and the CLI address the workspace by it."
				value="ws_7f3k9q2m4x"
				copyable
			/>
			<Region />
			<DefinitionRow
				label="Custom domain"
				description="Mail and links go out from it."
				value={{
					status: props.status,
					label: props.status === "done" ? "Verified" : undefined,
				}}
				href="#domain"
			/>
			<DefinitionRow
				label="Plan"
				description="Your organisation manages it."
				value="Business"
			/>
			<DefinitionRow
				label="Contract end"
				value="31 Dec 2026"
				locked={{ reason: "Held by CR-12, Ana", href: "#cr-12" }}
			/>
			<DefinitionRow
				label="Billing contact"
				value="ana@acme.test"
				locked={{ reason: "Set by your organisation" }}
			/>
		</Group>
	);
}

// The pointer and focus states force the link row, whose hit takes them;
// every rest cell draws the settings group, a `STATUS_DOT.state` cell its
// status row in that state.
export function drawDefinitionRow(frame: ShowcaseFrame) {
	const [family, , value] = frame.cell.name.split(".");
	// The third segment of a `STATUS_DOT.state` cell is a state key.
	const status = family === "STATUS_DOT" ? (value as StatusState) : "done";
	return (
		<Wide>
			{frame.state === "rest" ? (
				<General status={status} />
			) : (
				<Group>
					<Region />
				</Group>
			)}
		</Wide>
	);
}
