import { cn } from "@fcalell/ui-core/cn";
import { formatterFor } from "@fcalell/ui-core/format";
import { STAT, STAT_FIGURE, text } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";
import { StatWait } from "./wait.tsx";

const STACK = "flex flex-col min-w-0";
const FIGURE = "flex items-baseline";

/** One figure with its label: the focal point of a screen. */
export interface StatProps extends Closed {
	/** What the figure counts, read after it ("need you"). */
	label: string;
	/** The figure; zero is a count, drawn. */
	value: number;
	/** What the figure counts, muted beside it. */
	unit?: string;
	/** The figure and its label as bars in their line boxes. */
	loading?: boolean;
}

/** The figure at the display role in tabular figures with its label in meta under it, so it reads "2, need you". One per screen. */
export function Stat({ label, value, unit, loading }: StatProps) {
	if (loading) return <StatWait />;
	return (
		<div className={cn(STAT, STACK)}>
			<p className={cn(STAT_FIGURE, FIGURE)}>
				<span className={text({ role: "display" })}>
					{formatterFor("number").format(value)}
				</span>
				{unit ? <span className={text({ role: "meta" })}>{unit}</span> : null}
			</p>
			<p className={text({ role: "meta" })}>{label}</p>
		</div>
	);
}
