import { EmptyState } from "../../components/empty-state/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { List } from "../../components/list/index.tsx";
import { Place } from "../../components/place/index.tsx";
import type { QueryLike } from "../../components/query-boundary/index.tsx";
import { QueryBoundary } from "../../components/query-boundary/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Split } from "../../components/split/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInRows } from "./layout-context.tsx";
import { Column } from "./place.tsx";

const refetch = () => {};

function queryOf(state: ShowcaseFrame["state"]): QueryLike<number> {
	return {
		data: state === "rest" ? 3 : undefined,
		isPending: state === "loading",
		isError: state === "error",
		refetch,
	};
}

// The boundary in the frame's state twice: in a Section over a Group (the
// Section waits with it) and in a Split's list.
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
					>
						{() => (
							<Group>
								<StandInRows ground="group" />
							</Group>
						)}
					</QueryBoundary>
				</Section>
			</Place>
			<div className="flex flex-col h-dvh">
				<Place title="Issues" bleed>
					<Split
						list={
							<QueryBoundary query={query} sentence="Issues did not load.">
								{() => (
									<List>
										<StandInRows ground="list" />
									</List>
								)}
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
