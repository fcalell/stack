import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import {
	type Bar,
	band,
	type ChartScale,
	type ChartUnit,
	chartHead,
	chartScale,
	chartShare,
	chartSlots,
	currencyOf,
	levelScale,
	levelUnit,
	lifts,
	mark,
	spanFlat,
	spanText,
	spanUnit,
	TIME_ROOM,
	tickReach,
	timeRoom,
	unitSymbol,
} from "@fcalell/ui-core/chart";
import { formatterFor } from "@fcalell/ui-core/format";
import { CHART_SERIES, SIZE_PX } from "@fcalell/ui-core/tokens";
import {
	CHART,
	CHART_BAR,
	CHART_BODY,
	CHART_DOT,
	CHART_GRID,
	CHART_HEAD,
	CHART_KEY,
	CHART_KEY_DOT,
	CHART_KEYS,
	CHART_LEVEL,
	CHART_MAIN,
	CHART_TICK_LANE,
	CHART_TOTAL,
	chartBand,
	chartFill,
	FIGURES,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useState } from "react";
import { Text as RNText, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { withUniwind } from "uniwind";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { compact } from "../../lib/compact";
import { useValue } from "../../lib/motion";
import {
	inertProps,
	PAINT_BOX,
	Painted,
	PaintText,
	PaintView,
} from "../../lib/paint";
import { FrameBody, FrameLine, useCollection } from "../../lib/read";
import { Decoded } from "../../lib/slot";
import { Strut } from "../../lib/strut";
import { Swap } from "../../lib/swap";

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
const NO_AXIS_MAIN = "ms-gap";
const AXIS_BAND = "relative flex-1";
// A tick centres on its gridline; the last band's bottom is the baseline,
// whose tick is the floor: zero, or a level's floor under its readings.
const TICK = "absolute right-0 top-0 -translate-y-1/2 max-w-measure-short";
const ZERO = "absolute right-0 bottom-0 translate-y-1/2";
const MAIN = "grow min-w-0";
const PLOT = "relative";
const GRID_BAND = "flex-1";
// The gridlines stand behind the bars' regions, at the same height.
const GRID = "absolute inset-x-0 top-0";
const BARS = "relative flex-row";
// A bar's slot is its region: the plot's height, the bar standing on its
// floor, as wide as the plot over its slots (`chartSlots`): a short series
// stands in the first of them.
const REGION = "justify-end items-center min-w-0";
// The bar's column: the region's full height, its parts laid over it, each
// the whole column scaled (`CHART_BAR`), or a level's dots travelled down it
// (`CHART_LEVEL`), so a value moves by transform.
const COLUMN = "relative h-full w-2/3";
// The waiting time line: two fillers, at its start and its end.
const PAINTED_TIMES = "flex-row";
const PAINTED_TIME_END = "ms-auto";
// The loaded time line, a line high (its strut): the first bar's time under
// the first bar and the last bar's under the last, each centred on its bar
// and whole, a time wider than that room kept inside the plot's edge, and
// the times between centred on their bars where their room holds them.
const TIMES = "relative flex-row";
const TIME = "absolute top-0";

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

const BarView = withUniwind(Animated.View);

// The plot's height in px, which the phone's one density (touch) fixes: a
// part's lift is a share of it, by transform.
const PLOT_HEIGHT = SIZE_PX.touch.chart;

// A part (or a single bar) is the whole column scaled from the baseline to its
// share of the axis top and lifted over the parts under it, one clear line
// higher for each of them that draws. One that mounts grows from the baseline.
function Part(props: {
	value: number;
	under: number;
	at: number;
	top: number;
	series: (typeof CHART_SERIES)[number];
}) {
	const grown = useValue(props.value / props.top, 0);
	const lifted = useValue(props.under / props.top);
	const moved = useAnimatedStyle(() => ({
		transform: [
			{ translateY: -(lifted.value * PLOT_HEIGHT + props.at) },
			{ scaleY: grown.value },
		],
	}));
	return (
		<BarView
			className={cn(chartFill({ series: props.series }), CHART_BAR)}
			style={[{ transformOrigin: "bottom" }, moved]}
		/>
	);
}

// A level's reading (a part's, with keys) is a dot in its mark, the column
// travelled down from the plot's top by the share it stands under the top
// (`chartShare`), the dot centred on its top edge. One that mounts stands at
// its place.
function Reading(props: {
	value: number;
	scale: ChartScale;
	series: (typeof CHART_SERIES)[number];
}) {
	const share = chartShare(props.value, props.scale);
	const travel = useValue(1 - share);
	const moved = useAnimatedStyle(() => ({
		transform: [{ translateY: travel.value * PLOT_HEIGHT }],
	}));
	return (
		<BarView className={CHART_LEVEL} style={moved}>
			<View className={cn(chartFill({ series: props.series }), CHART_DOT)} />
		</BarView>
	);
}

// One function per bar slot, each called with a loaded item.
export interface BarSlots<T> {
	key: (item: T) => string;
	value: (item: T) => number;
	// The bar's parts' values by the chart's `keys`; a key it lacks is 0.
	parts?: (item: T) => Readonly<Record<string, number>> | undefined;
	/** The time drawn under its own bar (a word; never wraps or cuts): the first bar's and the last's always, and those between at evenly spaced strides (every 12th, 6th, 2nd bar, then each) as the plot's width holds them, so give every bar its time. */
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
	// The bars are a level, not a flow (a reading each hour, open flags per
	// round, not requests per day): the head draws their span, the lowest bar
	// to the highest ("18.2–21°C", "1–3 flags"), and each key its part's
	// span, never their sum and never the last bar, which is the thing's own
	// reading its record says. A span whose ends are one reading (one bar, a
	// flat day) is that reading, so it draws no figure: no total line, and a
	// key its name and mark alone. The plot draws each reading as a dot (each
	// key's its own, in its mark) against an axis around the readings, its
	// floor a step under the lowest and its top over the highest, so the swing
	// reads; a flow's bars stand on zero, a bar's length its value. A unit that
	// never sums (a share, `%`, or a temperature, `°C`) is a level unless this
	// is `false`.
	level?: boolean;
};

// The total (the bars' span with `level`) at body 500 with its unit, the parts' keys under it, then the
// axis beside the plot, its four gridlines a hairline each with its tick centred on it and the baseline with its 0, the columns in the
// chip marks by part, each bar in its slot of the plot (at least
// `CHART_SLOTS`, seven: a shorter series, a day's first hours, stands in the
// first of them, the rest of the plot its gridlines), the first bar's time
// centred under the first bar and the last bar's under the last, each kept
// whole inside the plot, and the times between at evenly spaced strides
// (`timeRoom`), each drawn where its room holds `TIME_ROOM` times the
// longest time. With `level`, a span that is one reading draws no figure,
// and each reading is a dot against an axis around the readings
// (`levelScale`), the baseline's tick its floor. While the `items`
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
	const { bar } = props;
	const items = painted ? [] : (drawn.value as readonly T[]);
	const series: Bar[] = items.map((item) => ({
		key: bar.key(item),
		value: bar.value(item),
		parts: bar.parts?.(item),
	}));
	// Every bar's time, with its room between the ends (`timeRoom`).
	const times = items.map(
		(item, index) =>
			[bar.at?.(item), index, timeRoom(index, items.length)] as const,
	);
	const labels = keys ?? [];
	const part = (bar: Bar, key: string) => bar.parts?.[key] ?? 0;
	const peaks = series.map((bar) =>
		keys ? keys.reduce((sum, key) => sum + part(bar, key), 0) : bar.value,
	);
	const peak = Math.max(0, ...peaks);
	const leveled = level ?? levelUnit(unit);
	// A level stands against its readings' range, each key's its own; a flow
	// on zero, its bars stacked.
	const scale = leveled
		? levelScale(
				keys
					? series.flatMap((bar) => keys.map((key) => part(bar, key)))
					: series.map((bar) => bar.value),
			)
		: chartScale(
				peaks,
				series.flatMap((bar) => [
					bar.value,
					...labels.map((key) => part(bar, key)),
				]),
			);
	const { step, top, bands, floor } = scale;
	const { figure, tick } = formatters(top, step, unit);
	const head = chartHead(series, labels, leveled);
	const { total } = head;
	// A level's figure that is one reading draws none: the record says it.
	const said = (span: { low: number; high: number }) =>
		painted || !leveled || !spanFlat(span, figure);
	// The plot's slots: a short series stands in the first of them.
	const slots = chartSlots(series.length);
	const slot = { width: `${100 / slots}%` } as const;
	const word = unit ? spanUnit(unit, total) : undefined;
	const keyTotals = labels.map((label, at) => ({
		label,
		value: head.parts[at] ?? { low: 0, high: 0 },
	}));

	const totalLine = !said(total) ? null : (
		<View className={cn(CHART_TOTAL, TOTAL)}>
			<Decoded
				role="figure"
				painted={painted}
				text={spanText(total, figure) + (unitSymbol(unit) ?? "")}
				of={total.high}
				className={cn(
					text({ role: "body" }),
					textStrong({ role: "body" }),
					FIGURES,
					"shrink-0",
				)}
			/>
			{word ? (
				<RNText className={cn(text({ role: "meta" }), "shrink")}>{word}</RNText>
			) : null}
		</View>
	);
	// The axis draws its ticks, which a flow of nothing (every bar zero) and a
	// waiting chart have none of; a level of zeros reads zero.
	const ticks = !painted && (leveled ? series.length > 0 : peak > 0);
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
									{said(key.value) ? (
										<Decoded
											role="figure"
											at={at}
											painted={painted}
											text={spanText(key.value, figure)}
											of={key.value.high}
											className={cn(text({ role: "meta" }), FIGURES)}
										/>
									) : null}
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
									<View className={TICK}>
										{/* A rescaled axis cross-fades its labels while its bars move together. */}
										<Swap id={tick(top - step * index)}>
											<RNText
												numberOfLines={1}
												className={cn(text({ role: "meta" }), FIGURES)}
											>
												{tick(top - step * index)}
											</RNText>
										</Swap>
									</View>
									{index === bands - 1 ? (
										<RNText
											className={cn(text({ role: "meta" }), FIGURES, ZERO)}
										>
											{tick(floor)}
										</RNText>
									) : null}
								</View>
							))}
						</View>
					) : null}
					<View className={cn(CHART_MAIN, MAIN, !ticks && NO_AXIS_MAIN)}>
						{painted ? (
							<PaintView painted className={cn(CHART_GRID, PAINT_BOX)} />
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
									{series.map((bar) => {
										const values = keys?.map((key) => part(bar, key)) ?? [];
										const gaps = lifts(values);
										return (
											<View
												key={bar.key}
												style={slot}
												className={cn(CHART_GRID, REGION)}
											>
												<View className={COLUMN}>
													{leveled ? (
														(keys ?? [undefined]).map((key, at) => (
															<Reading
																key={key ?? ""}
																value={
																	key === undefined
																		? bar.value
																		: (values[at] ?? 0)
																}
																scale={scale}
																series={
																	key === undefined ? CHART_SERIES[0] : mark(at)
																}
															/>
														))
													) : keys ? (
														// The first part stands on the baseline, each next one
														// over it.
														keys.map((key, at) => (
															<Part
																key={key}
																value={values[at] ?? 0}
																under={values
																	.slice(0, at)
																	.reduce((sum, one) => sum + one, 0)}
																at={gaps[at] ?? 0}
																top={top}
																series={mark(at)}
															/>
														))
													) : (
														<Part
															value={bar.value}
															under={0}
															at={0}
															top={top}
															series={CHART_SERIES[0]}
														/>
													)}
												</View>
											</View>
										);
									})}
								</View>
							</View>
						)}
						{painted ? (
							<View className={PAINTED_TIMES}>
								{[0, 1].map((at) => (
									<PaintText
										fills="word"
										painted
										key={at}
										className={cn(
											text({ role: "meta" }),
											FIGURES,
											at === 1 && PAINTED_TIME_END,
										)}
									>
										<Painted role="word" at={at} />
									</PaintText>
								))}
							</View>
						) : times.some(([time]) => time) ? (
							<Times times={times} slots={slots} />
						) : null}
					</View>
				</View>
			</View>
		</FrameBody>
	);
}

// The time line: each time centred under its bar's slot, kept whole inside the
// line's edges. The line and each time measure themselves, so a time stands
// unseen until both have, then where it belongs; a time between the ends
// (one with a room) stands where its room holds `TIME_ROOM` times the longest
// time, so a stride's times appear together as the line widens.
function Times(props: {
	times: readonly (readonly [string | undefined, number, number | undefined])[];
	slots: number;
}) {
	const [line, setLine] = useState(0);
	const [widths, setWidths] = useState<Readonly<Record<number, number>>>({});
	const longest = Math.max(0, ...Object.values(widths));
	const slot = line / props.slots;
	return (
		<View
			className={TIMES}
			onLayout={(event) => setLine(event.nativeEvent.layout.width)}
		>
			<Strut role="meta" />
			{props.times.map(([time, at, room]) =>
				time ? (
					<Time
						key={at}
						time={time}
						centre={((at + 0.5) / props.slots) * line}
						line={line}
						fits={room === undefined || room * slot >= TIME_ROOM * longest}
						onWidth={(width) =>
							setWidths((all) =>
								all[at] === width ? all : { ...all, [at]: width },
							)
						}
					/>
				) : null,
			)}
		</View>
	);
}

function Time(props: {
	time: string;
	centre: number;
	line: number;
	fits: boolean;
	onWidth: (width: number) => void;
}) {
	const [width, setWidth] = useState(0);
	const { centre, line } = props;
	const measured = line > 0 && width > 0;
	const left = Math.max(0, Math.min(centre - width / 2, line - width));
	return (
		<RNText
			numberOfLines={1}
			onLayout={(event) => {
				setWidth(event.nativeEvent.layout.width);
				props.onWidth(event.nativeEvent.layout.width);
			}}
			style={{
				start: measured ? left : 0,
				opacity: measured && props.fits ? 1 : 0,
			}}
			className={cn(text({ role: "meta" }), FIGURES, TIME)}
		>
			{props.time}
		</RNText>
	);
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
