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

// A part is the rows a cell names, drawn in the frame's state: the topics it
// lists, whether they stand under their group labels, which are checked, and
// whether the first checked one opens the Select under it.
interface Part {
	topics: readonly string[];
	grouped?: boolean;
	chosen: readonly string[];
	opens?: boolean;
}

const PARTS = {
	// Two described rows, the first checked: the labels, descriptions, box
	// states and rows every cell of the list stands on.
	rows: { topics: ["mentions", "assigned"], chosen: ["mentions"] },
	unchecked: { topics: ["mentions", "assigned"], chosen: [] },
	// The checked row opens the Select the children hold.
	checked: {
		topics: ["failed", "comments"],
		chosen: ["failed"],
		opens: true,
	},
	// One row under each group label.
	groups: { topics: ["mentions", "digest"], grouped: true, chosen: [] },
	// The recommended mark stands on a description line.
	recommended: { topics: ["digest", "news"], chosen: [] },
} satisfies Record<string, Part>;

// The part a cell names, by the cell's name or its family's: the first match
// wins, a cell naming no part draws the rows.
const CELL_PARTS: ReadonlyArray<readonly [string, keyof typeof PARTS]> = [
	["CHECKBOX.state.unchecked", "unchecked"],
	["CHECKBOX.state.checked", "checked"],
	["CHIP", "recommended"],
	["TEXT_STRONG", "groups"],
	["SKELETON", "groups"],
	["LINE_BOX", "groups"],
];

// A skeleton or line-box cell is the waiting form itself, so it draws it at
// rest too.
const waits = (cell: string) =>
	cell.startsWith("SKELETON") || cell.startsWith("LINE_BOX");

// The question sheet's one answer: three described options, none chosen on
// the unchecked cell, the recommended one chosen on the checked cell with its
// note field under it. The radio skeleton is its waiting form.
function Approaches(props: {
	state: ShowcaseFrame["state"];
	checked: boolean;
}) {
	return (
		<Wide>
			<FormField label="How should the agent proceed?">
				<OptionList
					query={queryIn(props.state, APPROACHES)}
					option={{
						value: (approach) => approach.id,
						label: (approach) => approach.name,
						description: (approach) => approach.about,
						recommended: (approach) => approach.suggested,
					}}
					sentence="The answers did not load."
					empty="No answer to choose."
					value={props.checked ? "ask" : null}
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
}

// Board 41's notifications from a query: topics under group labels, each
// described, the recommended mark on a description line; waiting, failed and
// empty in the card. Each cell draws only the topics it names (see PARTS), in
// the frame's state.
export function drawOptionList(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const state = waits(cell) && frame.state === "rest" ? "loading" : frame.state;
	if (cell.startsWith("OPTION_RADIO") || cell === "SKELETON.kind.radio")
		return (
			<Approaches
				state={state}
				checked={cell === "OPTION_RADIO.state.checked"}
			/>
		);
	const named = CELL_PARTS.find(([prefix]) => cell.startsWith(prefix));
	const part: Part = PARTS[named?.[1] ?? "rows"];
	return (
		<Wide>
			<FormField label="Email me about" description="Sent to ada@acme.dev.">
				<OptionList
					query={queryIn(
						state,
						TOPICS.filter((topic) => part.topics.includes(topic.id)),
					)}
					option={{
						value: (topic) => topic.id,
						label: (topic) => topic.name,
						description: (topic) => topic.about,
						recommended: (topic) => topic.suggested,
						group: part.grouped ? (topic) => topic.kind : undefined,
					}}
					sentence="The topics did not load."
					empty="No topic to follow yet."
					value={[...part.chosen]}
					onChange={change}
				>
					{part.opens ? (
						<FormField label="Only for">
							<Select
								value="production"
								onChange={change}
								options={ENVIRONMENTS}
							/>
						</FormField>
					) : null}
				</OptionList>
			</FormField>
		</Wide>
	);
}
