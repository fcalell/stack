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
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { navigate, useWarm } from "../../lib/navigate";
import { inertProps } from "../../lib/paint";
import { endedSentence, FailedMark, RetryMark, useRow } from "../../lib/read";
import { Decoded } from "../../lib/slot";
import { useWords } from "../../lib/words";
import { CountLinks } from "./count-links";
import { Meter } from "./meter";

const CLIP = "overflow-hidden";
// Each cell draws its own top and start hairline; the card's edge is drawn over
// them, so the outer ones are the edge's own.
const CELLS = "flex-row flex-wrap";
// Two to a row.
const CELL = "min-w-0 grow basis-1/2";
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

const number = formatterFor("number");

// A cell without a bound: its label over its figure. The cell is the frame of
// the selection it draws, as a meter is: its read failed with no enclosing
// frame holding it, it draws the failed form itself (the label stays, the
// figure slot shows the failure mark and the retry icon, the line under reads
// "This didn't load." and a press retries); a read an enclosing frame holds
// draws nothing of its own.
function Cell({ item, at }: { item: StatsItem; at: number }) {
	const words = useWords();
	const warm = useWarm();
	const [figure] = useSelections([item.value]);
	const { ended: held, busy, retry } = useRow([item.value]);
	const painted = paints(figure);
	const ended =
		figure.painted && (figure.phase === "failed" || figure.phase === "missing");
	const { href } = item;
	const label = item.label as string;
	return (
		<View {...inertProps(painted)} className={cn(STATS_CELL, CELL)}>
			<RNText className={text({ role: "meta" })}>{label}</RNText>
			<View
				className={cn(
					STATS_FIGURE,
					held ? "flex-row items-center min-h-target" : FIGURE,
				)}
			>
				{held ? null : ended ? (
					// An ended read an enclosing frame holds keeps the figure's slot, drawn
					// nothing; a failed cell's marks stand flush at the cell's start.
					<RNText className={cn(text({ role: "figure" }), "opacity-0")}>
						0
					</RNText>
				) : (
					<Decoded
						role="figure"
						at={at}
						painted={painted}
						text={figure.painted ? undefined : number.format(figure.value)}
						of={figure.painted ? undefined : figure.value}
						className={cn(text({ role: "figure" }), "shrink-0")}
					/>
				)}
				{held ? (
					<>
						<FailedMark />
						{held === "failed" ? <RetryMark busy={busy} /> : null}
					</>
				) : item.unit ? (
					<RNText className={cn(text({ role: "meta" }), "shrink")}>
						{item.unit}
					</RNText>
				) : null}
			</View>
			{held ? (
				<RNText className={text({ role: "meta" })}>
					{endedSentence(words, held)}
				</RNText>
			) : (
				<>
					{item.meta ? (
						<RNText className={text({ role: "meta" })}>{item.meta}</RNText>
					) : null}
					{item.counts ? <CountLinks counts={item.counts} /> : null}
				</>
			)}
			{held === "failed" ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`${words.retry} ${label}`}
					onPress={() => {
						if (!busy) void retry();
					}}
					className={HIT}
				/>
			) : href !== undefined && !painted ? (
				<Pressable
					accessibilityRole="link"
					accessibilityLabel={label}
					onPressIn={() => warm(href)}
					onPress={() => navigate(href)}
					className={HIT}
				/>
			) : null}
		</View>
	);
}

// One hairline card of counts split by hairlines, each cell its label in meta
// over its figure in tabular figures (its unit muted beside it), then a meta
// line or sub-counts as links, or the whole cell a link to its list. Zeros are
// drawn. Two cells to a row. A cell that is a link takes its press on a hit
// laid last over it, so it stands on top of the cell's text. Each cell is the
// frame of the selection it draws.
export function Stats({ items }: StatsProps) {
	return (
		<View className={cn(STATS, CLIP)}>
			<View className={CELLS}>
				{items.map((item, at) =>
					item.bound !== undefined ? (
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
					) : (
						<Cell key={item.label} item={item} at={at} />
					),
				)}
			</View>
			<View pointerEvents="none" className={STATS_EDGE} />
		</View>
	);
}
