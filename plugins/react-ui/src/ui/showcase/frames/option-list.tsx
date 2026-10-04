import { FormField } from "../../components/form-field/index.tsx";
import { OptionList } from "../../components/option-list/index.tsx";
import type { QueryLike } from "../../components/query-boundary/index.tsx";
import { Select } from "../../components/select/index.tsx";
import { TextArea } from "../../components/text-area/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

interface Topic {
	id: string;
	name: string;
	kind: string;
	about: string;
	suggested?: boolean;
}

const change = () => {};
const TOPICS: Topic[] = [
	{
		id: "mentions",
		name: "Mentions",
		kind: "Activity",
		about: "When someone names you",
	},
	{
		id: "assigned",
		name: "Assigned to me",
		kind: "Activity",
		about: "Work handed to you",
	},
	{
		id: "failed",
		name: "Failed deploys",
		kind: "Activity",
		about: "Each deploy that fails, with its log",
	},
	{
		id: "comments",
		name: "Comments",
		kind: "Activity",
		about: "Replies on what you wrote",
	},
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
interface Approach {
	id: string;
	name: string;
	about: string;
	suggested?: boolean;
}

const APPROACHES: Approach[] = [
	{
		id: "ask",
		name: "Ask before each change",
		about: "Every edit waits for your yes",
		suggested: true,
	},
	{
		id: "apply",
		name: "Apply and report",
		about: "Edits land, a summary follows",
	},
	{ id: "stop", name: "Stop here", about: "Nothing changes; the plan is kept" },
];
const ENVIRONMENTS = [
	{ value: "production", label: "Production" },
	{ value: "preview", label: "Preview" },
];

// A query in the frame's state: its items at rest, none when empty.
function queryIn<T>(
	state: ShowcaseFrame["state"],
	items: readonly T[],
): QueryLike<readonly T[]> {
	let data: readonly T[] | undefined;
	if (state === "empty") data = [];
	else if (state !== "loading" && state !== "error") data = items;
	return {
		data,
		isPending: state === "loading",
		isError: state === "error",
		refetch: change,
	};
}

// Board 41's notifications from a query: two groups, every topic described,
// three checked, the first checked option's children a Select, the
// recommended mark on a description line; waiting, failed and empty in the
// card. The radio cells draw the question sheet's one answer: three described
// options, none chosen on the unchecked cell, the recommended one chosen on
// the checked cell with its note field under it.
export function drawOptionList(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (cell.startsWith("OPTION_RADIO"))
		return (
			<Wide>
				<FormField label="How should the agent proceed?">
					<OptionList
						query={queryIn(frame.state, APPROACHES)}
						option={{
							value: (approach) => approach.id,
							label: (approach) => approach.name,
							description: (approach) => approach.about,
							recommended: (approach) => approach.suggested,
						}}
						sentence="The answers did not load."
						empty="No answer to choose."
						value={cell === "OPTION_RADIO.state.checked" ? "ask" : null}
						onChange={change}
					>
						<FormField label="Note">
							<TextArea
								value=""
								onChange={change}
								placeholder="Anything the agent should know"
							/>
						</FormField>
					</OptionList>
				</FormField>
			</Wide>
		);
	return (
		<Wide>
			<FormField label="Email me about" description="Sent to ada@acme.dev.">
				<OptionList
					query={queryIn(frame.state, TOPICS)}
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
