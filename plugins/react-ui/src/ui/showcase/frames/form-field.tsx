import { useState } from "react";
import { Checkbox } from "../../components/checkbox/index.tsx";
import { FormField } from "../../components/form-field/index.tsx";
import { Input } from "../../components/input/index.tsx";
import { Select } from "../../components/select/index.tsx";
import { Switch } from "../../components/switch/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

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
			>
				<Select
					value={region}
					onChange={(next) => {
						setRegion(next);
						setEditing(undefined);
					}}
					options={REGIONS}
					placeholder="Choose a region"
				/>
			</FormField>
			<FormField
				label="Billing contact"
				description="Receives every invoice."
				answered={fold("contact", contact)}
			>
				<Input
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
				<Input value="acme-inc" onChange={change} />
			</FormField>
			<FormField change="added" label="Default region">
				<Select
					value="eu-central-1"
					onChange={change}
					options={REGIONS}
					placeholder="Choose a region"
				/>
			</FormField>
			<FormField change="removed" label="Billing contact">
				<Input value="ana@acme.app" onChange={change} />
			</FormField>
			<FormField change="unchanged" label="Require two-factor">
				<Switch checked onChange={change} label="Require two-factor" />
			</FormField>
			<FormField change="stale" label="Trust this browser">
				<Checkbox checked onChange={change} label="Trust this browser" />
			</FormField>
		</>
	);
}

// Board 41's fields: typed fields under their labels, then a switch and a
// checkbox inline; in error the messages take the descriptions' places, and
// disabled the labels take the disabled ink, the descriptions kept. At rest
// the three-question form follows.
export function drawFormField(frame: ShowcaseFrame) {
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
				<Input value={error ? "acme inc" : "acme-inc"} onChange={change} />
			</FormField>
			<FormField
				label="Default region"
				description="Where new databases are created."
				error={error ? "Pick where new databases are created." : undefined}
				disabled={disabled}
			>
				<Select
					value={error ? undefined : "eu-central-1"}
					onChange={change}
					options={REGIONS}
					placeholder="Choose a region"
				/>
			</FormField>
			<FormField
				label="Require two-factor"
				description="Every member confirms a code at sign-in."
				disabled={disabled}
			>
				<Switch checked onChange={change} label="Require two-factor" />
			</FormField>
			<FormField
				label={
					error ? "I accept the data processing terms" : "Trust this browser"
				}
				description={error ? undefined : "Skip the code here for 30 days."}
				error={error ? "Accept the terms to continue." : undefined}
				disabled={disabled}
			>
				<Checkbox
					checked={!error}
					onChange={change}
					label={
						error ? "I accept the data processing terms" : "Trust this browser"
					}
				/>
			</FormField>
			{state === "rest" ? <Questions /> : null}
			{state === "rest" && frame.cell.name.startsWith("CHANGE_MARK") ? (
				<Changes />
			) : null}
		</Wide>
	);
}
