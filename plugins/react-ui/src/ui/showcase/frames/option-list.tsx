import { FormField } from "../../components/form-field/index.tsx";
import { OptionList } from "../../components/option-list/index.tsx";
import type { QueryLike } from "../../components/query-boundary/index.tsx";
import { Select } from "../../components/select/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

interface Topic {
	id: string;
	name: string;
	kind: string;
	about?: string;
	suggested?: boolean;
}

const change = () => {};
const TOPICS: Topic[] = [
	{ id: "mentions", name: "Mentions", kind: "Activity" },
	{ id: "assigned", name: "Assigned to me", kind: "Activity" },
	{ id: "failed", name: "Failed deploys", kind: "Activity" },
	{ id: "comments", name: "Comments", kind: "Activity" },
	{
		id: "digest",
		name: "Weekly digest",
		kind: "Summaries",
		about: "Mondays: the week's closed and opened work",
		suggested: true,
	},
	{
		id: "news",
		name: "Product news",
		kind: "Summaries",
		about: "A few times a year",
	},
];
const ENVIRONMENTS = [
	{ value: "production", label: "Production" },
	{ value: "preview", label: "Preview" },
];

// The topics' query in the frame's state: its topics at rest, none when
// empty.
function topicsIn(state: ShowcaseFrame["state"]): QueryLike<readonly Topic[]> {
	let data: readonly Topic[] | undefined;
	if (state === "empty") data = [];
	else if (state !== "loading" && state !== "error") data = TOPICS;
	return {
		data,
		isPending: state === "loading",
		isError: state === "error",
		refetch: change,
	};
}

// Board 41's notifications from a query: two groups, three checked, the
// first checked option's children a Select, the recommended mark on a
// description line; waiting, failed and empty in the card.
export function drawOptionList(frame: ShowcaseFrame) {
	return (
		<Wide>
			<FormField label="Email me about" description="Sent to ada@acme.dev.">
				<OptionList
					query={topicsIn(frame.state)}
					option={{
						value: (topic) => topic.id,
						label: (topic) => topic.name,
						description: (topic) => topic.about,
						recommended: (topic) => topic.suggested,
						group: (topic) => topic.kind,
					}}
					sentence="The topics did not load."
					empty="No topic to follow yet."
					value={["failed", "mentions", "assigned"]}
					onChange={change}
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
