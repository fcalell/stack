import { text } from "@fcalell/ui-core/variants";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { Split } from "../../components/split/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { StandInList, StandInRows } from "./layout-context.tsx";
import { Column } from "./place.tsx";

// The Split in a bleeding Place, whose strip takes the Details act below
// `wide`, on the main cell. `empty` opens nothing, so the main holds the
// empty state; every other frame opens the first record. The record's
// heading, the empty state and the rows are context.
export function drawSplit(frame: ShowcaseFrame) {
	if (frame.cell.name !== "SPLIT_MAIN.state.rest") return undefined;
	const empty = frame.state === "empty";
	return (
		<Column>
			<Place title="Issues" bleed>
				<Split
					list={<StandInList />}
					main={
						empty ? undefined : (
							<>
								<h2 className={text({ role: "heading" })}>
									Fix invoice rounding
								</h2>
								<Section title="Activity">
									<StandInRows ground="list" />
								</Section>
							</>
						)
					}
					pane={
						<Section title="Properties">
							<StandInRows ground="list" />
						</Section>
					}
					empty={<p className={text({ role: "meta" })}>No issue open</p>}
				/>
			</Place>
		</Column>
	);
}
