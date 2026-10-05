import { cn } from "@fcalell/ui-core/cn";
import {
	lineBox,
	STATS,
	STATS_CELL,
	skeleton,
} from "@fcalell/ui-core/variants";

const CLIP = "overflow-hidden";
const CELLS = "flex flex-wrap -mt-px -ml-px";
const CELL = "flex flex-col min-w-0 grow basis-1/2 page-tablet:basis-0";
const LINE = "flex items-center h-lh";
// A strip's length is the data's, unknown while it waits.
const WAITING = ["a", "b", "c", "d"] as const;

/** A Stats waiting: four cells, each its label and figure as bars in their line boxes. Outside the package's exports. */
export function StatsWait() {
	return (
		<div aria-busy className={cn(STATS, CLIP)}>
			<div className={CELLS}>
				{WAITING.map((key) => (
					<div key={key} className={cn(STATS_CELL, CELL)}>
						<span className={cn(lineBox({ role: "meta" }), LINE)}>
							<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
						</span>
						<span className={cn(lineBox({ role: "figure" }), LINE)}>
							<span className={cn(skeleton({ kind: "line" }), "w-1/3")} />
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
