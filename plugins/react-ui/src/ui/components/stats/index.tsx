import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { StatSpec } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import {
	STATS,
	STATS_CELL,
	STATS_EDGE,
	STATS_FIGURE,
	text,
} from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";
import { follow } from "../../lib/navigate.ts";
import { Painted } from "../../lib/paint.tsx";
import { CountLinks } from "../meter/count-links.tsx";

const CLIP = "shrink-0 overflow-hidden";
// Each cell draws its own top and start hairline; the card's edge is drawn over
// them, so the outer ones are the edge's own.
const CELLS = "flex flex-wrap";
const EDGE = "pointer-events-none";
// Two to a row below `tablet` of the page, one row from it.
const CELL =
	"relative flex flex-col min-w-0 grow basis-1/2 page-tablet:basis-0";
const OPENS = "hover:bg-wash-hover active:bg-wash-press";
const HIT = "absolute inset-0 focus-visible:-outline-offset-2";
const FIGURE = "flex items-baseline";

/** A cell: a `StatSpec` whose figure is a constant or a selection. */
export type StatsItem = StatSpec extends infer S
	? S extends StatSpec
		? Omit<S, "value"> & { value: Datum<number> }
		: never
	: never;

/** A strip of counts. */
export interface StatsProps extends Closed {
	/** The cells, in order: each a label over its figure. A cell whose `value` is a selection paints its figure, and is inert and no link, until its read lands. */
	items: readonly StatsItem[];
}

/** One hairline card of counts split by hairlines, each cell its label in meta over its figure in tabular figures (its unit muted beside it), then a meta line or sub-counts as links, or the whole cell a link to its list. Zeros are drawn. Two cells to a row below `tablet` of the page. */
export function Stats({ items }: StatsProps) {
	const figures = useSelections(items.map((item) => item.value));
	const number = formatterFor("number");
	return (
		<div className={cn(STATS, CLIP)}>
			<ul className={CELLS}>
				{items.map((item, at) => {
					const figure = figures[at];
					const painted = figure?.painted === true;
					const opens = item.href !== undefined && !painted;
					return (
						<li
							key={item.label}
							inert={painted || undefined}
							className={cn(STATS_CELL, CELL, opens && OPENS)}
						>
							{opens ? (
								// biome-ignore lint/a11y/useAnchorContent: the hit covers the cell, named by its label
								<a
									href={item.href}
									onClick={follow}
									aria-label={item.label}
									className={HIT}
								/>
							) : null}
							<span className={text({ role: "meta" })}>{item.label}</span>
							<p className={cn(STATS_FIGURE, FIGURE)}>
								<span className={text({ role: "figure" })}>
									{figure?.painted ? (
										<Painted role="figure" at={at} />
									) : (
										number.format(figure?.value as number)
									)}
								</span>
								{item.unit ? (
									<span className={text({ role: "meta" })}>{item.unit}</span>
								) : null}
							</p>
							{item.meta ? (
								<p className={text({ role: "meta" })}>{item.meta}</p>
							) : null}
							{item.counts ? <CountLinks counts={item.counts} /> : null}
						</li>
					);
				})}
			</ul>
			<div aria-hidden className={cn(STATS_EDGE, EDGE)} />
		</div>
	);
}
