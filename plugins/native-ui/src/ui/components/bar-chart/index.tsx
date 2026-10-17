import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import {
	type ChartUnit,
	chartHead,
	chartScale,
	currencyOf,
	tickReach,
	unitOf,
} from "@fcalell/ui-core/chart";
import { formatterFor } from "@fcalell/ui-core/format";
import { CHART_SERIES } from "@fcalell/ui-core/tokens";
import {
	CHART,
	CHART_BODY,
	CHART_GRID,
	CHART_HEAD,
	CHART_KEY,
	CHART_KEY_DOT,
	CHART_KEYS,
	CHART_MAIN,
	CHART_PART_SPLIT,
	CHART_TICK_LANE,
	CHART_TOTAL,
	chartBand,
	chartFill,
	FIGURES,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { compact } from "../../lib/compact";
import { inertProps, Painted, paintBox, useShown } from "../../lib/paint";
import { FrameBody, FrameLine, useCollection } from "../../lib/read";

const STACK = "min-w-0";
const TOTAL = "flex-row items-baseline";
const KEYS = "flex-row flex-wrap";
const KEY = "flex-row items-center";
const DOT = "shrink-0";
const BODY = "flex-row items-start";
// The body stands half a meta line below the head, so the top tick, centred
// on the plot's top edge, keeps the pair gap from the head's last line.
const REACH = { paddingTop: tickReach("touch") } as const;
const AXIS = "shrink-0";
// With no tick to draw (a waiting chart, a chart of nothing but zeros) the
// axis is not drawn, and its lane and the gap after it are the body's padding
// and the plot's margin, so the plot stands where it will.
const NO_AXIS = "ps-figures";
const NO_AXIS_MAIN = "ms-inside";
const AXIS_BAND = "relative flex-1";
// A tick centres on its gridline; the last band's bottom is the baseline,
// whose tick is the zero.
const TICK = "absolute right-0 top-0 -translate-y-1/2 max-w-measure-short";
const ZERO = "absolute right-0 bottom-0 translate-y-1/2";
const MAIN = "grow min-w-0";
const PLOT = "relative";
const GRID_BAND = "flex-1";
// The gridlines stand behind the bars' regions, at the same height.
const GRID = "absolute inset-x-0 top-0";
const BARS = "relative flex-row";
// A bar's slot is its region: the plot's height, the bar standing on its
// floor.
const REGION = "justify-end items-center flex-1 min-w-0";
const COLUMN = "w-2/3";
// React Native paints a fill under its border, so a stacked part's clear
// split line is its box's border with the fill inside it.
const PART = "w-2/3 shrink-0";
const PART_FILL = "flex-1";
// The time line under the plot, painted or loaded: the first bar's time at
// its start and the last bar's at its end, each whole.
const TIMES = "flex-row";
// A time takes up to half the line, so both stand whole at any real width and
// only a text that cannot fit beside the other truncates.
const TIME = "min-w-0 max-w-1/2";
const TIME_END = "ms-auto";

interface Figures {
	// The head's and the keys' figures.
	figure: (value: number) => string;
	// The axis's ticks, in the lane four figures wide.
	tick: (value: number) => string;
}

// Every figure of one chart in one notation: compact once its axis reaches
// five figures, so a tick stays inside its four-figure lane. Money keeps its
// figures exact (the cents of "$30.97" are not the axis's step) and writes
// its ticks short: no cents when the step is whole.
// TODO: a compact money tick is the symbol before `compact`'s figure, which
// reads right for a symbol-first currency; with Intl's compact notation on
// Hermes (see `compact`) it is the currency formatter's own.
function formatters(
	top: number,
	step: number,
	unit: ChartUnit | undefined,
): Figures {
	const currency = currencyOf(unit);
	if (currency === undefined) {
		const plain = formatterFor("number", undefined, {
			maximumFractionDigits: 1,
		});
		const figure = (value: number) =>
			top >= 10_000 ? compact(value) : plain.format(value);
		return { figure, tick: figure };
	}
	const money = formatterFor("number", undefined, {
		style: "currency",
		currency,
	});
	const whole = formatterFor("number", undefined, {
		style: "currency",
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});
	const symbol =
		money.formatToParts(0).find((part) => part.type === "currency")?.value ??
		"";
	return {
		figure: (value) => money.format(value),
		tick: (value) => {
			if (top >= 10_000) return `${symbol}${compact(value)}`;
			return (Number.isInteger(step) ? whole : money).format(value);
		},
	};
}

function band(index: number, bands: number) {
	return index === bands - 1 ? "both" : "top";
}

// A part's or a column's height: its value's share of the axis top.
function height(value: number, top: number) {
	return { height: `${(value / top) * 100}%` } as const;
}

// One function per bar slot, each called with a loaded item.
export interface BarSlots<T> {
	key: (item: T) => string;
	value: (item: T) => number;
	// The bar's parts' values by the chart's `keys`; a key it lacks is 0.
	parts?: (item: T) => Readonly<Record<string, number>> | undefined;
	/** The time drawn under the plot's start (the first bar's) and end (the last bar's); no other bar's is read (a word; never wraps or cuts). */
	at?: (item: T) => string | undefined;
}

// Columns over time: one bar per item, stacked by one dimension when `keys`
// names its parts.
export type BarChartProps<T = unknown> = Closed & {
	/** The items the bars draw, oldest first: constants, or a selection, which paints the chart until its read lands. A selection is the chart's own frame: it holds its read and draws the failed, missing and empty forms in its own box whatever stands above it. */
	items: Datum<readonly T[]>;
	/** What the chart counts: the web names its plot by it, the phone draws no name for the plot (a short phrase; never drawn on the phone). */
	label: string;
	/** The names a bar's parts stack by, bottom first (each a word; the legend wraps between names): present, the chart is stacked and draws them as its legend in every form, each name holding its series mark. */
	keys?: readonly string[];
	bar: BarSlots<T>;
	// What the values count (`requests`, `minutes`), drawn after the total; a
	// unit that takes a plural is `{ one, other }`, read at the figure it
	// follows; money is `{ currency: "USD" }`, its figures written in the
	// currency with no word after them.
	unit?: ChartUnit;
	// The bars are a level, not a flow (open flags per round, not requests
	// per day): the head draws the last bar's value, and each key the last
	// bar's part, never their sum.
	level?: boolean;
};

// One bar, read from its item.
interface Bar {
	key: string;
	value: number;
	parts?: Readonly<Record<string, number>>;
}

// The total (the last bar with `level`) at body 500 with its unit, the parts' keys under it, then the
// axis beside the plot, its four gridlines a hairline each with its tick centred on it and the baseline with its 0, the columns in the
// chip marks by part, the first bar's time under the
// plot's start and the last bar's under its end. While the `items`
// selection's read waits, the total is a figure's filler, the legend stands
// (its names and marks declared, its figures painted), the plot is one
// painted box at its loaded height with the axis's lane kept and the time
// line is two fillers at its place, the chart inert. The chart is a frame of its items: it
// draws the failed form with Retry, the missing form and the empty form in its
// own box with the generic sentence, and the stale and paused line above
// itself while it holds its read, whatever stands above it.
export function BarChart<T>(props: BarChartProps<T>) {
	const { keys, unit, level } = props;
	const { drawn, frame } = useCollection(props.items);
	const { painted } = drawn;
	const shown = useShown(painted);
	const { bar } = props;
	const items = painted ? [] : (drawn.value as readonly T[]);
	const series: Bar[] = items.map((item) => ({
		key: bar.key(item),
		value: bar.value(item),
		parts: bar.parts?.(item),
	}));
	// Only the ends are timed: the first bar's time at the plot's start, the
	// last bar's at its end.
	const first = items[0];
	const last = items.length > 1 ? items[items.length - 1] : undefined;
	const start = first === undefined ? undefined : bar.at?.(first);
	const end = last === undefined ? undefined : bar.at?.(last);
	const labels = keys ?? [];
	const part = (bar: Bar, key: string) => bar.parts?.[key] ?? 0;
	const peaks = series.map((bar) =>
		keys ? keys.reduce((sum, key) => sum + part(bar, key), 0) : bar.value,
	);
	const peak = Math.max(0, ...peaks);
	const { step, top, bands } = chartScale(
		peaks,
		series.flatMap((bar) => [
			bar.value,
			...labels.map((key) => part(bar, key)),
		]),
	);
	const { figure, tick } = formatters(top, step, unit);
	const head = chartHead(series, labels, level === true);
	const { total } = head;
	const word = unit ? unitOf(unit, total) : undefined;
	const keyTotals = labels.map((label, at) => ({
		label,
		value: head.parts[at] ?? 0,
	}));

	const totalLine = (
		<View className={cn(CHART_TOTAL, TOTAL)}>
			<RNText
				className={cn(
					text({ role: "body" }),
					textStrong({ role: "body" }),
					FIGURES,
					"shrink-0",
				)}
			>
				{painted ? <Painted role="figure" /> : figure(total)}
			</RNText>
			{word ? (
				<RNText className={cn(text({ role: "meta" }), "shrink")}>{word}</RNText>
			) : null}
		</View>
	);
	// The axis draws its ticks, which a chart of nothing (every bar zero) and a
	// waiting one have none of.
	const ticks = !painted && peak > 0;
	return (
		<FrameBody frame={frame} fit="frame">
			<FrameLine frame={frame} />
			<View {...inertProps(painted)} className={cn(CHART, STACK)}>
				{labels.length > 0 ? (
					<View className={CHART_HEAD}>
						{totalLine}
						<View className={cn(CHART_KEYS, KEYS)}>
							{keyTotals.map((key, at) => (
								<Key key={key.label} name={key.label} at={at}>
									<RNText className={cn(text({ role: "meta" }), FIGURES)}>
										{painted ? (
											<Painted role="figure" at={at} />
										) : (
											figure(key.value)
										)}
									</RNText>
								</Key>
							))}
						</View>
					</View>
				) : (
					totalLine
				)}
				<View className={cn(CHART_BODY, BODY, !ticks && NO_AXIS)} style={REACH}>
					{ticks ? (
						<View className={cn(CHART_GRID, CHART_TICK_LANE, AXIS)}>
							{Array.from({ length: bands }, (_, index) => (
								<View
									// biome-ignore lint/suspicious/noArrayIndexKey: a band is its index
									key={index}
									className={cn(
										chartBand({ kind: "axis", rule: band(index, bands) }),
										AXIS_BAND,
									)}
								>
									<RNText
										numberOfLines={1}
										className={cn(text({ role: "meta" }), FIGURES, TICK)}
									>
										{tick(top - step * index)}
									</RNText>
									{index === bands - 1 ? (
										<RNText
											className={cn(text({ role: "meta" }), FIGURES, ZERO)}
										>
											{tick(0)}
										</RNText>
									) : null}
								</View>
							))}
						</View>
					) : null}
					<View className={cn(CHART_MAIN, MAIN, !ticks && NO_AXIS_MAIN)}>
						{painted ? (
							<View className={cn(CHART_GRID, paintBox(shown))} />
						) : (
							<View className={PLOT}>
								<View className={cn(CHART_GRID, GRID)}>
									{Array.from({ length: bands }, (_, index) => (
										<View
											// biome-ignore lint/suspicious/noArrayIndexKey: a band is its index
											key={index}
											className={cn(
												chartBand({ kind: "grid", rule: band(index, bands) }),
												GRID_BAND,
											)}
										/>
									))}
								</View>
								<View className={BARS}>
									{series.map((bar) => (
										<View key={bar.key} className={cn(CHART_GRID, REGION)}>
											{keys ? (
												// The first part stands on the baseline, each next one
												// over it, split from it by a clear line.
												keys
													.map((key, at) =>
														at > 0 ? (
															<View
																key={key}
																className={cn(CHART_PART_SPLIT, PART)}
																style={height(part(bar, key), top)}
															>
																<View
																	className={cn(
																		chartFill({ series: mark(at) }),
																		PART_FILL,
																	)}
																/>
															</View>
														) : (
															<View
																key={key}
																className={cn(
																	chartFill({ series: mark(at) }),
																	PART,
																)}
																style={height(part(bar, key), top)}
															/>
														),
													)
													.reverse()
											) : (
												<View
													className={cn(
														chartFill({ series: CHART_SERIES[0] }),
														COLUMN,
													)}
													style={height(bar.value, top)}
												/>
											)}
										</View>
									))}
								</View>
							</View>
						)}
						{painted ? (
							<View className={TIMES}>
								{[0, 1].map((at) => (
									<RNText
										key={at}
										className={cn(
											text({ role: "meta" }),
											FIGURES,
											at === 1 && TIME_END,
										)}
									>
										<Painted role="word" at={at} />
									</RNText>
								))}
							</View>
						) : start || end ? (
							<View className={TIMES}>
								{start ? (
									<RNText
										numberOfLines={1}
										className={cn(text({ role: "meta" }), FIGURES, TIME)}
									>
										{start}
									</RNText>
								) : null}
								{end ? (
									<RNText
										numberOfLines={1}
										className={cn(
											text({ role: "meta" }),
											FIGURES,
											TIME,
											TIME_END,
										)}
									>
										{end}
									</RNText>
								) : null}
							</View>
						) : null}
					</View>
				</View>
			</View>
		</FrameBody>
	);
}

// A key's series mark by its place in the keys.
function mark(at: number) {
	return CHART_SERIES[at % CHART_SERIES.length] ?? CHART_SERIES[0];
}

// A legend entry: the key's dot in its mark and its name, then its figure.
function Key(props: { name: string; at: number; children: ReactNode }) {
	return (
		<View className={cn(CHART_KEY, KEY)}>
			<View
				className={cn(
					CHART_KEY_DOT,
					chartFill({ series: mark(props.at) }),
					DOT,
				)}
			/>
			<RNText className={cn(text({ role: "meta" }), "shrink")}>
				{props.name}
			</RNText>
			{props.children}
		</View>
	);
}
