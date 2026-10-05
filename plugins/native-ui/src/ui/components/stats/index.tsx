import type { StatSpec } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import {
	STATS,
	STATS_CELL,
	STATS_EDGE,
	STATS_FIGURE,
	text,
} from "@fcalell/ui-core/variants";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { navigate } from "../../lib/navigate";
import { CountLinks } from "../meter/count-links";
import { StatsWait } from "./wait";

const CLIP = "overflow-hidden";
// Each cell draws its own top and start hairline; the card's edge is drawn over
// them, so the outer ones are the edge's own.
const CELLS = "flex-row flex-wrap";
// Two to a row.
const CELL = "min-w-0 grow basis-1/2";
const HIT = "absolute inset-0 active:bg-wash-press";
const FIGURE = "flex-row items-baseline";

export interface StatsProps extends Closed {
	// The cells, in order: each a label over its figure. While `loading`, the
	// items known (their `meta` or `counts` set each waiting cell's line);
	// none, and four cells of label and figure stand in.
	items: readonly StatSpec[];
	// A cell per item waits as bars in its line boxes, the line it declares
	// included, at the loaded height.
	loading?: boolean;
}

// One hairline card of counts split by hairlines, each cell its label in meta
// over its figure in tabular figures (its unit muted beside it), then a meta
// line or sub-counts as links, or the whole cell a link to its list. Zeros are
// drawn. Two cells to a row. A cell that is a link takes its press on a hit
// laid last over it, so it stands on top of the cell's text.
export function Stats({ items, loading }: StatsProps) {
	if (loading) return <StatsWait items={items} />;
	const number = formatterFor("number");
	return (
		<View className={cn(STATS, CLIP)}>
			<View className={CELLS}>
				{items.map((item) => {
					const { href } = item;
					return (
						<View key={item.label} className={cn(STATS_CELL, CELL)}>
							<RNText className={text({ role: "meta" })}>{item.label}</RNText>
							<View className={cn(STATS_FIGURE, FIGURE)}>
								<RNText className={text({ role: "figure" })}>
									{number.format(item.value)}
								</RNText>
								{item.unit ? (
									<RNText className={text({ role: "meta" })}>
										{item.unit}
									</RNText>
								) : null}
							</View>
							{item.meta ? (
								<RNText className={text({ role: "meta" })}>{item.meta}</RNText>
							) : null}
							{item.counts ? <CountLinks counts={item.counts} /> : null}
							{href !== undefined ? (
								<Pressable
									accessibilityRole="link"
									accessibilityLabel={`${item.label}, ${number.format(item.value)}${item.unit ? ` ${item.unit}` : ""}`}
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
