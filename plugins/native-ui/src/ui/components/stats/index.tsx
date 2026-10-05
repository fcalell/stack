import type { StatSpec } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import {
	FIGURES,
	STATS,
	STATS_CELL,
	STATS_COUNTS,
	STATS_FIGURE,
	text,
} from "@fcalell/ui-core/variants";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { navigate } from "../../lib/navigate";
import { Link } from "../link";
import { StatsWait } from "./wait";

const CLIP = "overflow-hidden";
// Each cell draws its own top and start hairline; the strip bleeds by one so
// the card clips the outer ones.
const CELLS = "flex-row flex-wrap -mt-px -ml-px";
// Two to a row.
const CELL = "min-w-0 grow basis-1/2";
const HIT = "absolute inset-0 active:bg-wash-press";
const FIGURE = "flex-row items-baseline";
const COUNTS = "flex-row flex-wrap";

export interface StatsProps extends Closed {
	// The cells, in order: each a label over its figure.
	items: readonly StatSpec[];
	// The cells wait as bars in their line boxes; the strip's length is the
	// data's, so four stand in.
	loading?: boolean;
}

// One hairline card of counts split by hairlines, each cell its label in meta
// over its figure in tabular figures (its unit muted beside it), then a meta
// line or sub-counts as links, or the whole cell a link to its list. Zeros are
// drawn. Two cells to a row. A cell that is a link takes its press on a hit
// laid last over it, so it stands on top of the cell's text.
export function Stats({ items, loading }: StatsProps) {
	if (loading) return <StatsWait />;
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
							{item.counts ? (
								<View className={cn(STATS_COUNTS, COUNTS)}>
									{item.counts.map((count) => (
										<RNText
											key={`${count.href}${count.label}`}
											className={text({ role: "meta" })}
										>
											<Link href={count.href}>
												<RNText className={FIGURES}>
													{number.format(count.value)}
												</RNText>{" "}
												{count.label}
											</Link>
										</RNText>
									))}
								</View>
							) : null}
							{href !== undefined ? (
								<Pressable
									accessibilityRole="link"
									accessibilityLabel={item.label}
									onPress={() => navigate(href)}
									className={HIT}
								/>
							) : null}
						</View>
					);
				})}
			</View>
		</View>
	);
}
