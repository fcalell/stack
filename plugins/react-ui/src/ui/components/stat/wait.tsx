import { cn } from "@fcalell/ui-core/cn";
import { lineBox, STAT, skeleton } from "@fcalell/ui-core/variants";

const STACK = "flex flex-col min-w-0";
const LINE = "flex items-center h-lh";

/** A Stat waiting: the figure and its label as bars in their line boxes. Outside the package's exports. */
export function StatWait() {
	return (
		<div aria-busy className={cn(STAT, STACK)}>
			<span className={cn(lineBox({ role: "display" }), LINE)}>
				<span className={cn(skeleton({ kind: "line" }), "w-1/3")} />
			</span>
			<span className={cn(lineBox({ role: "meta" }), LINE)}>
				<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
			</span>
		</div>
	);
}
