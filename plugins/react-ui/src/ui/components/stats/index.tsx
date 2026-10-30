import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
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
import { use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { DistanceContext } from "../../lib/media.ts";
import { follow } from "../../lib/navigate.ts";
import { Decoded } from "../../lib/slot.tsx";
import { CountLinks } from "./count-links.tsx";
import { Meter } from "./meter.tsx";

const CLIP = "shrink-0 overflow-hidden";
// Each cell draws its own top and start hairline; the card's edge is drawn over
// them, so the outer ones are the edge's own.
const CELLS = "flex flex-wrap";
const EDGE = "pointer-events-none";
// Two to a row below `tablet` of the page, one row from it. A cell never
// narrows below its label's longest word and its unit (`min-w-min`, over a
// label that holds its words with `wrap-normal`), so a strip too narrow for its
// cells to share a row wraps them to a further row, the last growing across it.
const CELL =
	"relative flex flex-col min-w-min grow basis-1/2 page-tablet:basis-0";
const LABEL = "wrap-normal";
// In a room a strip is as many tiles as it has cells, each a quarter of the
// row, so a strip of one or two or three stands that many quarters wide, at
// the left, as a status board's tiles do, never one figure across the whole
// row. Four or more fill it. It never goes under its widest cell (`min-w-min`).
// A room is the one place no container query reads, so the place's distance
// decides it.
const TILES: Partial<Record<number, string>> = {
	1: "w-1/4",
	2: "w-2/4",
	3: "w-3/4",
};
const TILED = "min-w-min";
const OPENS = "hover:bg-wash-hover active:bg-wash-press";
const HIT = "absolute inset-0 focus-visible:-outline-offset-2";
// The unit stands whole beside its figure, which gives way to it (a painted
// figure's filler is no shorter than the figure it stands for), so a narrow cell
// never breaks the unit's word or grows by a line while its figure waits.
const FIGURE = "flex items-baseline min-w-0";
// The digits add nothing to the cell's floor (`w-0`, then `grow` into what the
// unit leaves): the floor is the label's word and the unit, the same painted
// and loaded, whatever width the figure or its filler is.
const FIGURE_DIGITS = "w-0 grow min-w-0 truncate";
const UNIT = "shrink-0 whitespace-nowrap";

/** A cell: a `StatSpec` whose figure is a constant or a selection. */
export type StatsItem = StatSpec extends infer S
	? S extends StatSpec
		? Omit<S, "value" | "bound" | "label"> & {
				value: Datum<number>;
			} & (S extends { bound: number }
					? { label: Datum<string>; bound: Datum<number> }
					: { label: string; bound?: never })
		: never
	: never;

/** A strip of counts. */
export interface StatsProps extends Closed {
	/** The cells, in order: each a label over its figure, or a share of its `bound` drawn as a meter (its label a selection too). A cell whose `value` or `bound` is a selection paints its figure, and is inert and no link, until its read lands. */
	items: readonly StatsItem[];
}

/** One hairline card of counts split by hairlines, each cell its label in meta over its figure in tabular figures (its unit muted beside it), then a meta line or sub-counts as links, or the whole cell a link to its list. Zeros are drawn. Two cells to a row below `tablet` of the page. */
export function Stats({ items }: StatsProps) {
	const figures = useSelections(items.map((item) => item.value));
	const number = formatterFor("number");
	const far = use(DistanceContext);
	const tiles = far ? TILES[items.length] : undefined;
	return (
		<div className={cn(STATS, CLIP, tiles && [tiles, TILED])}>
			<ul className={CELLS}>
				{items.map((item, at) => {
					if (item.bound !== undefined)
						return (
							// biome-ignore lint/suspicious/noArrayIndexKey: a bound cell's label may be a read, so its place is its key
							<li key={at} className={cn(STATS_CELL, CELL)}>
								<Meter
									label={item.label}
									value={item.value}
									max={item.bound}
									mark={item.mark}
									meta={item.meta}
									counts={item.counts}
									at={at}
								/>
							</li>
						);
					const figure = figures[at];
					const painted = figure !== undefined && paints(figure);
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
							<span className={cn(text({ role: "meta" }), LABEL)}>
								{item.label}
							</span>
							<p className={cn(STATS_FIGURE, FIGURE)}>
								<span className={cn(text({ role: "figure" }), FIGURE_DIGITS)}>
									<Decoded
										role="figure"
										at={at}
										painted={painted}
										text={
											figure?.painted
												? undefined
												: number.format(figure?.value as number)
										}
										of={figure?.painted ? undefined : (figure?.value as number)}
									/>
								</span>
								{item.unit ? (
									<span className={cn(text({ role: "meta" }), UNIT)}>
										{item.unit}
									</span>
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
