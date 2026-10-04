import { DefinitionRow } from "../../components/definition-row/index.tsx";
import { EmptyState } from "../../components/empty-state/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { List, type RowSlots } from "../../components/list/index.tsx";
import { Place } from "../../components/place/index.tsx";
import type { QueryLike } from "../../components/query-boundary/index.tsx";
import { QueryBoundary } from "../../components/query-boundary/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Split } from "../../components/split/index.tsx";
import { Switch } from "../../components/switch/index.tsx";
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
// Split's list over a List of items.
export function drawQueryBoundary(frame: ShowcaseFrame) {
	const query = queryOf(frame.state);
	return (
		<Column>
			<Place title="Settings">
				<Section
					title="Notifications"
					count={3}
					description="What Acme tells you, and where."
				>
					<QueryBoundary
						query={query}
						sentence="Notification settings did not load."
						loading={<Group loading />}
					>
						{() => (
							<Group>
								{SETTINGS.map((setting) => (
									<DefinitionRow
										key={setting.label}
										label={setting.label}
										description={setting.description}
										value={
											<Switch
												checked={setting.on}
												onChange={refetch}
												label={setting.label}
											/>
										}
									/>
								))}
							</Group>
						)}
					</QueryBoundary>
				</Section>
			</Place>
			<div className="flex flex-col h-dvh">
				<Place title="Issues" bleed>
					<Split
						list={
							<QueryBoundary
								query={query}
								sentence="Issues did not load."
								loading={<List items={[]} loading row={ROW} />}
							>
								{(count) => <List items={ISSUES.slice(0, count)} row={ROW} />}
							</QueryBoundary>
						}
						empty={
							<EmptyState
								icon="Search"
								title="No issue open"
								sentence="Pick an issue from the list to read it here."
							/>
						}
					/>
				</Place>
			</div>
		</Column>
	);
}
