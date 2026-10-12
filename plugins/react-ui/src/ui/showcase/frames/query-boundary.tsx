import { DefinitionRow } from "../../components/definition-row/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { List, type RowSlots } from "../../components/list/index.tsx";
import { Pane } from "../../components/pane/index.tsx";
import { Place } from "../../components/place/index.tsx";
import type { QueryLike } from "../../components/query-boundary/index.tsx";
import { QueryBoundary } from "../../components/query-boundary/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Column } from "./place.tsx";

const refetch = () => {};
const ISSUES = [
	"Fix invoice rounding",
	"Export cohorts to CSV",
	"Retry failed webhooks",
];
// Setting rows, a label over its description with a switch at the end: the
// rows a Group's loading form stands in for.
const SETTINGS = [
	{
		label: "Failed deploys",
		description: "An email the moment a deploy fails.",
		on: true,
	},
	{
		label: "Weekly summary",
		description: "Every Monday, deploys and usage.",
		on: false,
	},
	{
		label: "Mentions",
		description: "When a teammate names you in a comment.",
		on: true,
	},
];
const ROW: RowSlots<string> = {
	key: (issue) => issue,
	title: (issue) => issue,
	meta: () => ["Billing"],
};

function queryOf(state: ShowcaseFrame["state"]): QueryLike<number> {
	return {
		data: state === "rest" ? 3 : undefined,
		isPending: state === "loading",
		isError: state === "error",
		refetch,
	};
}

// The boundary in the frame's state twice, each naming its body's loading
// form: in a Section over a Group of setting rows (the Section waits with it) and in a
// list Pane over a List of items.
export function drawQueryBoundary(frame: ShowcaseFrame) {
	const query = queryOf(frame.state);
	return (
		<Column>
			<Place>
				<Pane title="Settings">
					<Section
						title="Notifications"
						count={3}
						description="What Acme tells you, and where."
					>
						<QueryBoundary
							query={query}
							sentence="Notification settings did not load."
							loading={<Group loading items={[]} />}
						>
							{() => (
								<Group
									items={SETTINGS.map((setting) => ({
										key: setting.label,
										row: (
											<DefinitionRow
												label={setting.label}
												description={setting.description}
												switch={{ checked: setting.on, onChange: refetch }}
											/>
										),
									}))}
								/>
							)}
						</QueryBoundary>
					</Section>
				</Pane>
			</Place>
			<div className="flex flex-col h-dvh">
				<Place>
					<Pane title="Issues">
						<QueryBoundary
							query={query}
							sentence="Issues did not load."
							loading={<List items={[]} loading row={ROW} />}
						>
							{(count) => <List items={ISSUES.slice(0, count)} row={ROW} />}
						</QueryBoundary>
					</Pane>
				</Place>
			</div>
		</Column>
	);
}
