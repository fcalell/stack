import { FormField } from "../../components/form-field/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Select } from "../../components/select/index.tsx";
import { TextArea } from "../../components/text-area/index.tsx";
import { isFirstCell, type ShowcaseFrame } from "../cells.ts";
import { endedAt, itemsAt, waitingText } from "../waiting.ts";
import { Wide } from "./layout-context.tsx";
import { beside, isPaint } from "./painted.tsx";

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
	["PAINT", "groups"],
	["LINE_BOX", "groups"],
];

// The question sheet's one answer: three described options, none chosen on
// the unchecked cell, the recommended one chosen on the checked cell with its
// note field under it. Painted, the radios are its value waiting.
function Approaches(props: { checked: boolean; painted?: boolean }) {
	return (
		<Wide>
			<FormField
				label="How should the agent proceed?"
				options={{
					items: APPROACHES,
					option: {
						value: (approach) => approach.id,
						label: (approach) => approach.name,
						description: (approach) => approach.about,
						recommended: (approach) => approach.suggested,
					},
					value: props.painted ? waitingText : props.checked ? "ask" : null,
					onChange: change,
					children: (
						<FormField label="Note">
							<TextArea
								value=""
								onChange={change}
								placeholder="Anything the agent should know"
							/>
						</FormField>
					),
				}}
			/>
		</Wide>
	);
}

// The topics a part names, in a Section that holds their read as a page ships
// it, so the failed and empty forms stand in the Section's body.
function Topics(props: {
	id: string;
	state: ShowcaseFrame["state"];
	part: Part;
}) {
	const { part } = props;
	const topics = itemsAt(
		props.id,
		props.state,
		TOPICS.filter((topic) => part.topics.includes(topic.id)),
	);
	return (
		<Section
			title="Notifications"
			read={topics}
			failed="The topics did not load."
			empty={{ sentence: "No topic to follow yet." }}
		>
			<FormField
				label="Email me about"
				description="Sent to ada@acme.dev."
				options={{
					items: topics,
					option: {
						value: (topic) => topic.id,
						label: (topic) => topic.name,
						description: (topic) => topic.about,
						recommended: (topic) => topic.suggested,
						group: part.grouped ? (topic) => topic.kind : undefined,
					},
					value: [...part.chosen],
					onChange: change,
					children: part.opens ? (
						<FormField label="Only for">
							<Select
								value="production"
								onChange={change}
								options={ENVIRONMENTS}
							/>
						</FormField>
					) : null,
				}}
			/>
		</Section>
	);
}

// Board 41's notifications from a read: topics under group labels, each
// described, the recommended mark on a description line; painted while the
// read waits, the frame drawing the failed and empty forms. Each cell draws
// only the topics it names (see PARTS), in the frame's state; a `PAINT` cell
// draws the rows loaded beside the same rows painted, and the radios loaded
// beside the radios with their value waiting. The error state, on the first
// cell, draws the list over items that fail and answer not found, in a field
// no frame holds: the list says so itself, in its own line.
export function drawOptionList(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	if (frame.state === "error")
		return isFirstCell(frame) ? (
			<Wide>
				{endedAt<Topic>(frame.id, "error").map(({ title, items }) => (
					<FormField
						key={title}
						label={title}
						options={{
							items,
							option: {
								value: (topic) => topic.id,
								label: (topic) => topic.name,
							},
							value: [],
							onChange: change,
						}}
					/>
				))}
			</Wide>
		) : undefined;
	if (cell === "PAINT.kind.control") {
		return beside(
			frame,
			<Approaches checked />,
			<Approaches checked painted />,
		);
	}
	if (cell.startsWith("OPTION_RADIO"))
		return <Approaches checked={cell === "OPTION_RADIO.state.checked"} />;
	const named = CELL_PARTS.find(([prefix]) => cell.startsWith(prefix));
	const part: Part = PARTS[named?.[1] ?? "rows"];
	if (isPaint(frame)) {
		return beside(
			frame,
			<Wide>
				<Topics id={`${frame.id}/loaded`} state="rest" part={part} />
			</Wide>,
			<Wide>
				<Topics id={`${frame.id}/painted`} state="loading" part={part} />
			</Wide>,
		);
	}
	return (
		<Wide>
			<Topics id={frame.id} state={frame.state} part={part} />
		</Wide>
	);
}
