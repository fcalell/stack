import { cn } from "@fcalell/ui-core/cn";
import type { StatSpec } from "@fcalell/ui-core/descriptors";
import { type WaitLine, waitLine } from "@fcalell/ui-core/list-state";
import {
	LINK_TARGET,
	lineBox,
	STATS,
	STATS_CELL,
	STATS_EDGE,
	skeleton,
} from "@fcalell/ui-core/variants";

const CLIP = "overflow-hidden";
const CELLS = "flex flex-wrap";
const EDGE = "pointer-events-none";
const CELL = "flex flex-col min-w-0 grow basis-1/2 page-tablet:basis-0";
const LINE = "flex items-center h-lh";
const COUNTS_LINE = "flex items-center";
// A strip given no cells stands four of label and figure in, its length being
// the data's.
const STAND_IN: ReadonlyArray<{ key: string; line: WaitLine }> = [
	{ key: "a", line: "none" },
	{ key: "b", line: "none" },
	{ key: "c", line: "none" },
	{ key: "d", line: "none" },
];

/** A Stats waiting: a cell per item given (four when none), each its label and figure as bars in their line boxes and the line its item declares (a meta line, or one count link's target box) under them, so the strip keeps the loaded one's height. Outside the package's exports. */
export function StatsWait({ items }: { items: readonly StatSpec[] }) {
	const cells =
		items.length > 0
			? items.map((item) => ({ key: item.label, line: waitLine(item) }))
			: STAND_IN;
	return (
		<div aria-busy className={cn(STATS, CLIP)}>
			<div className={CELLS}>
				{cells.map((cell) => (
					<div key={cell.key} className={cn(STATS_CELL, CELL)}>
						<span className={cn(lineBox({ role: "meta" }), LINE)}>
							<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
						</span>
						<span className={cn(lineBox({ role: "figure" }), LINE)}>
							<span className={cn(skeleton({ kind: "line" }), "w-1/3")} />
						</span>
						{cell.line === "meta" ? (
							<span className={cn(lineBox({ role: "meta" }), LINE)}>
								<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
							</span>
						) : null}
						{cell.line === "counts" ? (
							<span className={cn(LINK_TARGET, COUNTS_LINE)}>
								<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
							</span>
						) : null}
					</div>
				))}
			</div>
			<div aria-hidden className={cn(STATS_EDGE, EDGE)} />
		</div>
	);
}
