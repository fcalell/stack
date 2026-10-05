import { Columns } from "../../components/columns/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInRows } from "./layout-context.tsx";
import { Column } from "./place.tsx";

const act = () => {};
const BOARD = [
	{ title: "Todo", count: 3 },
	{ title: "In progress", count: 2 },
	{ title: "In review", count: 1 },
	{ title: "Done", count: 11 },
];
const HEALTH = [
	{ title: "Deploys", count: 4 },
	{ title: "Failing tests", count: 3 },
	{ title: "Open incidents", count: 1 },
	{ title: "Slow queries", count: 6 },
];

// The `board` cell: four columns in a frame at the Place's content width,
// inset at the page inset the row bleeds through, so the fourth column meets
// the edge and the row scrolls sideways. The `half` cell: a project's health
// in a Place at the showcase's width, four sections two to a row from the
// Place's desktop width and stacked below it.
export function drawColumns(frame: ShowcaseFrame) {
	if (frame.cell.name === "COLUMNS.fit.half")
		return (
			<Column>
				<Place title="Project health">
					<Columns fit="half">
						{HEALTH.map(({ title, count }) => (
							<Section key={title} title={title} count={count}>
								<Group>
									<StandInRows ground="group" />
								</Group>
							</Section>
						))}
					</Columns>
				</Place>
			</Column>
		);
	return (
		<div className="flex flex-col px-page w-sheet max-w-full overflow-hidden">
			<Columns>
				{BOARD.map(({ title, count }) => (
					<Section
						key={title}
						title={title}
						count={count}
						act={{ icon: "Plus", label: `New issue in ${title}`, onAct: act }}
					>
						<Group>
							<StandInRows ground="group" />
						</Group>
					</Section>
				))}
			</Columns>
		</div>
	);
}
