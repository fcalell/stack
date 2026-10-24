import { useState } from "react";
import { FormField } from "../../components/form-field/index.tsx";
import { Input } from "../../components/input/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { waitingText } from "../waiting.ts";
import { Wide } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";

const change = () => {};
const REGIONS = [
	{ value: "eu-central-1", label: "Frankfurt, eu-central-1" },
	{ value: "us-east-1", label: "N. Virginia, us-east-1" },
];

// A single-page request form: an answered question folds to its summary row
// and Edit reopens it, focusing its control; the open question holds no
// answer yet, so it stays open.
function Questions() {
	const [name, setName] = useState("Acme Inc");
	const [region, setRegion] = useState<string | undefined>("eu-central-1");
	const [contact, setContact] = useState("");
	const [editing, setEditing] = useState<string>();
	const fold = (key: string, answer: string | undefined) =>
		answer && editing !== key
			? { answer, onEdit: () => setEditing(key) }
			: undefined;
	return (
		<>
			<FormField label="Workspace name" answered={fold("name", name)}>
				<Input
					label="Workspace name"
					value={name}
					onChange={setName}
					onCommit={() => setEditing(undefined)}
				/>
			</FormField>
			<FormField
				label="Default region"
				answered={fold(
					"region",
					REGIONS.find((option) => option.value === region)?.label,
				)}
				picker={{
					value: region,
					onChange: (next: string) => {
						setRegion(next);
						setEditing(undefined);
					},
					options: REGIONS,
					placeholder: "Choose a region",
				}}
			/>
			<FormField
				label="Billing contact"
				description="Receives every invoice."
				answered={fold("contact", contact)}
			>
				<Input
					label="Billing contact"
					value={contact}
					onChange={setContact}
					onCommit={() => setEditing(undefined)}
				/>
			</FormField>
		</>
	);
}

// A change set's fields, one of every kind, over a text field, a switch and a
// checkbox.
function Changes() {
	return (
		<>
			<FormField change="changed" label="Workspace URL">
				<Input label="Workspace URL" value="acme-inc" onChange={change} />
			</FormField>
			<FormField
				change="added"
				label="Default region"
				picker={{
					value: "eu-central-1",
					onChange: change,
					options: REGIONS,
					placeholder: "Choose a region",
				}}
			/>
			<FormField change="removed" label="Billing contact">
				<Input label="Billing contact" value="ana@acme.app" onChange={change} />
			</FormField>
			<FormField
				change="unchanged"
				label="Require two-factor"
				switch={{ checked: true, onChange: change }}
			/>
			<FormField
				change="stale"
				label="Trust this browser"
				checkbox={{ checked: true, onChange: change }}
			/>
		</>
	);
}

// Board 41's fields: typed fields under their labels, then a switch and a
// checkbox inline; in error the messages take the descriptions' places, and
// disabled the labels take the disabled ink, the descriptions kept. At rest
// the three-question form follows. `PAINT.kind.control` draws a field beside
// the same field over a value that never arrives: the label and the
// description stand, the control paints.
export function drawFormField(frame: ShowcaseFrame) {
	if (isPaint(frame))
		return frame.state === "rest" ? (
			<Wide>
				<FormField
					label="Workspace URL"
					description="Changing it breaks links."
				>
					<Input label="Workspace URL" value="acme-inc" onChange={change} />
				</FormField>
				<FormField
					label="Workspace URL"
					description="Changing it breaks links."
				>
					<Input label="Workspace URL" value={waitingText} onChange={change} />
				</FormField>
			</Wide>
		) : undefined;
	const { state } = frame;
	const disabled = state === "disabled";
	const error = state === "error";
	return (
		<Wide>
			<FormField
				label="Workspace URL"
				description={
					disabled
						? "Set by your organisation's SSO."
						: "Changing it breaks shared links."
				}
				error={error ? "Use lowercase letters, digits and dashes." : undefined}
				disabled={disabled}
			>
				<Input
					label="Workspace URL"
					value={error ? "acme inc" : "acme-inc"}
					onChange={change}
				/>
			</FormField>
			<FormField
				label="Default region"
				description="Where new databases are created."
				error={error ? "Pick where new databases are created." : undefined}
				disabled={disabled}
				picker={{
					value: error ? undefined : "eu-central-1",
					onChange: change,
					options: REGIONS,
					placeholder: "Choose a region",
				}}
			/>
			<FormField
				label="Require two-factor"
				description="Every member confirms a code at sign-in."
				disabled={disabled}
				switch={{ checked: true, onChange: change }}
			/>
			<FormField
				label={
					error ? "I accept the data processing terms" : "Trust this browser"
				}
				description={error ? undefined : "Skip the code here for 30 days."}
				error={error ? "Accept the terms to continue." : undefined}
				disabled={disabled}
				checkbox={{ checked: !error, onChange: change }}
			/>
			{state === "rest" ? <Questions /> : null}
			{state === "rest" && frame.cell.name.startsWith("CHANGE_MARK") ? (
				<Changes />
			) : null}
		</Wide>
	);
}
