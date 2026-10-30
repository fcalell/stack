import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { StatSpec } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import {
	STATS,
	STATS_CELL,
	STATS_EDGE,
	STATS_FIGURE,
	text,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { DistanceContext } from "../../lib/frame";
import { navigate, useWarm } from "../../lib/navigate";
import { inertProps } from "../../lib/paint";
import { Decoded } from "../../lib/slot";
import { CountLinks } from "./count-links";
import { Meter } from "./meter";

const CLIP = "overflow-hidden";
// Each cell draws its own top and start hairline; the card's edge is drawn over
// them, so the outer ones are the edge's own.
const CELLS = "flex-row flex-wrap";
// Two to a row.
const CELL = "min-w-0 grow basis-1/2";
// In a room a strip is as many tiles as it has cells, each a quarter of the
// row, so a strip of one or two or three stands that many quarters wide, as a
// status board's tiles do; four or more fill it.
const TILES: Partial<Record<number, string>> = {
	1: "w-1/4",
	2: "w-2/4",
	3: "w-3/4",
};
const HIT = "absolute inset-0 active:bg-wash-press";
const FIGURE = "flex-row items-baseline";

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

export interface StatsProps extends Closed {
	/** The cells, in order: each a label over its figure, or a share of its `bound` drawn as a meter (its label a selection too). A cell whose `value` or `bound` is a selection paints its figure, and takes no touch, until its read lands. */
	items: readonly StatsItem[];
}

// One hairline card of counts split by hairlines, each cell its label in meta
// over its figure in tabular figures (its unit muted beside it), then a meta
// line or sub-counts as links, or the whole cell a link to its list. Zeros are
// drawn. Two cells to a row. A cell that is a link takes its press on a hit
// laid last over it, so it stands on top of the cell's text.
export function Stats({ items }: StatsProps) {
	const figures = useSelections(items.map((item) => item.value));
	const warm = useWarm();
	const number = formatterFor("number");
	const far = useContext(DistanceContext);
	const tiles = far ? TILES[items.length] : undefined;
	return (
		<View className={cn(STATS, CLIP, tiles)}>
			<View className={CELLS}>
				{items.map((item, at) => {
					if (item.bound !== undefined)
						return (
							// biome-ignore lint/suspicious/noArrayIndexKey: a bound cell's label may be a read, so its place is its key
							<View key={at} className={cn(STATS_CELL, CELL)}>
								<Meter
									label={item.label}
									value={item.value}
									max={item.bound}
									mark={item.mark}
									meta={item.meta}
									counts={item.counts}
									at={at}
								/>
							</View>
						);
					const { href } = item;
					const figure = figures[at];
					const painted = figure !== undefined && paints(figure);
					return (
						<View
							key={item.label}
							{...inertProps(painted)}
							className={cn(STATS_CELL, CELL)}
						>
							<RNText className={text({ role: "meta" })}>{item.label}</RNText>
							<View className={cn(STATS_FIGURE, FIGURE)}>
								<Decoded
									role="figure"
									at={at}
									painted={painted}
									text={
										figure?.painted === false
											? number.format(figure.value)
											: undefined
									}
									of={figure?.painted === false ? figure.value : undefined}
									className={cn(text({ role: "figure" }), "shrink-0")}
								/>
								{item.unit ? (
									<RNText className={cn(text({ role: "meta" }), "shrink")}>
										{item.unit}
									</RNText>
								) : null}
							</View>
							{item.meta ? (
								<RNText className={text({ role: "meta" })}>{item.meta}</RNText>
							) : null}
							{item.counts ? <CountLinks counts={item.counts} /> : null}
							{href !== undefined && !painted ? (
								<Pressable
									accessibilityRole="link"
									accessibilityLabel={item.label}
									onPressIn={() => warm(href)}
									onPress={() => navigate(href)}
									className={HIT}
								/>
							) : null}
						</View>
					);
				})}
			</View>
			<View pointerEvents="none" className={STATS_EDGE} />
		</View>
	);
}
