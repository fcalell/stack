import { Columns } from "../../components/columns/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { StandInRows } from "./layout-context.tsx";

const act = () => {};
const COLUMNS = [
	{ title: "Todo", count: 3 },
	{ title: "In progress", count: 2 },
	{ title: "In review", count: 1 },
	{ title: "Done", count: 11 },
];

// Four columns in a frame at the Place's content width, inset at the page
// inset the row bleeds through, so the fourth column meets the edge and the
// row scrolls sideways.
export function drawColumns() {
	return (
		<div className="flex flex-col px-page w-sheet max-w-full overflow-hidden">
			<Columns>
				{COLUMNS.map(({ title, count }) => (
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
