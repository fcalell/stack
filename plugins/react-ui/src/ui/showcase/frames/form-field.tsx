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

// Board 41's fields: typed fields under their labels, then a switch and a
// checkbox inline; in error the messages take the descriptions' places, and
// disabled the labels take the disabled ink, the descriptions kept.
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
		</Wide>
	);
}
