import { Columns } from "../../components/columns/index.tsx";
import { Pane } from "../../components/pane/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Place } from "../../components/shell/place.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInCard } from "./layout-context.tsx";
import { Column } from "./place.tsx";

const act = () => {};
const BOARD = [
	{ title: "Todo" },
	{ title: "In progress" },
	{ title: "In review" },
	{ title: "Done" },
];
const HEALTH = [
	{ title: "Deploys" },
	{ title: "Failing tests" },
	{ title: "Open incidents" },
	{ title: "Slow queries" },
];

// The `board` cell: four columns in a frame at the place's content width,
// inset at the page inset the row bleeds through, so the fourth column meets
// the edge and the row scrolls sideways. The `half` cell: a project's health
// in a Place at the showcase's width, four sections two to a row from the
// the place's desktop width and stacked below it.
export function drawColumns(frame: ShowcaseFrame) {
	if (frame.cell.name === "COLUMNS.fit.half")
		return (
			<Column>
				<Place>
					<Pane title="Project health">
						<Columns fit="half">
							{HEALTH.map(({ title }) => (
								<Section key={title} title={title}>
									<StandInCard />
								</Section>
							))}
						</Columns>
					</Pane>
				</Place>
			</Column>
		);
	return (
		<div className="flex flex-col px-page w-sheet max-w-full overflow-hidden">
			<Columns>
				{BOARD.map(({ title }) => (
					<Section
						key={title}
						title={title}
						act={{ icon: "Plus", label: `New issue in ${title}`, onAct: act }}
					>
						<StandInCard />
					</Section>
				))}
			</Columns>
		</div>
	);
}
