import { FormField } from "../../components/form-field/index.tsx";
import { OptionList } from "../../components/option-list/index.tsx";
import { Select } from "../../components/select/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

const change = () => {};
const TOPICS = [
	{
		label: "Activity",
		options: [
			{ value: "mentions", label: "Mentions" },
			{ value: "assigned", label: "Assigned to me" },
			{ value: "failed", label: "Failed deploys" },
			{ value: "comments", label: "Comments" },
		],
	},
	{
		label: "Summaries",
		options: [
			{
				value: "digest",
				label: "Weekly digest",
				description: "Mondays: the week's closed and opened work",
				recommended: true,
			},
			{
				value: "news",
				label: "Product news",
				description: "A few times a year",
			},
		],
	},
];
const ENVIRONMENTS = [
	{ value: "production", label: "Production" },
	{ value: "preview", label: "Preview" },
];

// Board 41's notifications: two groups, three checked, the first checked
// option's children a Select, the recommended mark on a description line.
export function drawOptionList(frame: ShowcaseFrame) {
	return (
		<Wide>
			<FormField label="Email me about" description="Sent to ada@acme.dev.">
				<OptionList
					options={TOPICS}
					value={["failed", "mentions", "assigned"]}
					onChange={change}
					loading={frame.state === "loading"}
				>
					<FormField label="Only for">
						<Select
							value="production"
							onChange={change}
							options={ENVIRONMENTS}
						/>
					</FormField>
				</OptionList>
			</FormField>
		</Wide>
	);
}
