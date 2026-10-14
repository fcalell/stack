import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import { formatterFor } from "@fcalell/ui-core/format";
import { STAT, STAT_FIGURE, text } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";
import { Painted } from "../../lib/paint.tsx";

const STACK = "flex flex-col min-w-0";
const FIGURE = "flex items-baseline";

/** One figure with its label: the focal point of a screen. */
export interface StatProps extends Closed {
	/** What the figure counts, read after it ("need you") (a short phrase; wraps). */
	label: string;
	/** The figure; zero is a count, drawn. A selection paints the figure, and the Stat is inert, until its read lands. */
	value: Datum<number>;
	/** What the figure counts, muted beside it (a word; wraps). */
	unit?: string;
}

/** The figure at the display role in tabular figures with its label in meta under it, so it reads "2, need you". One per screen. */
export function Stat({ label, value, unit }: StatProps) {
	const [figure] = useSelections([value]);
	return (
		<div inert={figure.painted || undefined} className={cn(STAT, STACK)}>
			<p className={cn(STAT_FIGURE, FIGURE)}>
				<span className={text({ role: "display" })}>
					{figure.painted ? (
						<Painted role="figure" />
					) : (
						formatterFor("number").format(figure.value)
					)}
				</span>
				{unit ? <span className={text({ role: "meta" })}>{unit}</span> : null}
			</p>
			<p className={text({ role: "meta" })}>{label}</p>
		</div>
	);
}
