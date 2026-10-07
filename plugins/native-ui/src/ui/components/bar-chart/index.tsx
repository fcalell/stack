import {
	BANDS,
	type ChartUnit,
	chartHead,
	chartScale,
	currencyOf,
	tickReach,
	unitOf,
} from "@fcalell/ui-core/chart";
import { formatterFor } from "@fcalell/ui-core/format";
import { listState, retryOf } from "@fcalell/ui-core/list-state";
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
	skeleton,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { compact } from "../../lib/compact";
import { LoadingContext } from "../../lib/loading";
import { SectionContext } from "../../lib/section";
import { Strut } from "../../lib/strut";
import { useWords } from "../../lib/words";
import { EmptyStateBase } from "../empty-state/base";
import type { ListEmpty } from "../list";
import { MissingBase } from "../missing/base";
import type { QueryLike } from "../query-boundary";

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
const AXIS_BAND = "relative flex-1";
// A tick centres on its gridline; the last band's bottom is the baseline,
// whose tick is the zero.
const TICK = "absolute right-0 top-0 -translate-y-1/2";
const ZERO = "absolute right-0 bottom-0 translate-y-1/2";
const MAIN = "grow min-w-0";
const PLOT = "relative";
const GRID_BAND = "flex-1";
const BARS = "absolute inset-0 flex-row";
const SLOT = "justify-end items-center flex-1 min-w-0";
const COLUMN = "w-2/3";
// React Native paints a fill under its border, so a stacked part's clear
// split line is its box's border with the fill inside it.
const PART = "w-2/3 shrink-0";
const PART_FILL = "flex-1";
const TIMES = "flex-row";
const TIME = "items-center flex-1 min-w-0";
// A loading line stands in its text's line box: a zero-width line of the
// role beside the bar, so the loading chart keeps the loaded one's boxes.
const LINE = "flex-row items-center";
const TIMES_WAIT = "flex-row justify-between";
const BAR = "w-full";
// A failed or empty chart's EmptyState stands over the loaded boxes, held
// unseen, so it takes the chart's loaded height.
const HELD = "opacity-0";
const OVER = "absolute inset-0";

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
	// The time drawn under the bar.
	at?: (item: T) => string | undefined;
}

// Where a chart's bars come from, oldest first.
type ChartSource<T> =
	| {
			query: QueryLike<readonly T[]>;
			// What failed to load, over the retry act.
			sentence: string;
			empty: ListEmpty;
			items?: never;
			loading?: never;
	  }
	| {
			items: readonly T[];
			// The items are on their way (a compound body's loading form).
			loading?: boolean;
			// Without it an empty chart draws its empty plot.
			empty?: ListEmpty;
			query?: never;
			sentence?: never;
	  };

// Columns over time: one bar per item, stacked by one dimension when `keys`
// names its parts.
export type BarChartProps<T = unknown> = Closed &
	ChartSource<T> & {
		// What the chart counts: the web names its plot by it, the phone draws
		// no name for the plot.
		label: string;
		// The names a bar's parts stack by, bottom first: present, the chart is
		// stacked and draws them as its legend in every form, each name holding
		// its series mark.
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
	at?: string;
}

// The total (the last bar with `level`) at body 500 with its unit, the parts' keys under it, then the
// axis beside the plot, its four gridlines a hairline each with its tick centred on it and the baseline with its 0, the columns in the
// chip marks by part, a time under each bar that has one. It draws its
// collection's four states: while its query is pending, `loading` is set or a
// loading Section around it waits, its boxes in skeleton at their loaded size
// with the keys standing; a query
// that answers not found draws the rest EmptyState saying it no longer exists
// with Back (never Retry), a failed query the failed EmptyState with
// `sentence` and Retry, and no item `empty`, each at the chart's loaded
// height; then one bar per item.
export function BarChart<T>(props: BarChartProps<T>) {
	const { keys, unit, level } = props;
	const words = useWords();
	const base = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: useContext(LoadingContext),
		inSection: false,
		hasEmpty: props.empty !== undefined,
	};
	const input = { ...base, inSection: useContext(SectionContext) };
	const state = listState(input);
	if (state === "pending") return <Loading keys={keys} />;
	if (state === "missing")
		return (
			<Stand keys={keys}>
				<MissingBase fill />
			</Stand>
		);
	if (state === "failed" && props.query !== undefined)
		return (
			<Stand keys={keys}>
				<EmptyStateBase
					fill
					tone="failed"
					sentence={props.sentence}
					act={{ label: words.retry, onAct: retryOf(props.query) }}
				/>
			</Stand>
		);
	if (state === "empty" && props.empty)
		return (
			<Stand keys={keys}>
				<EmptyStateBase fill tone="rest" {...props.empty} />
			</Stand>
		);
	const { bar } = props;
	const items = (props.query ? props.query.data : props.items) ?? [];
	const series: Bar[] = items.map((item) => ({
		key: bar.key(item),
		value: bar.value(item),
		parts: bar.parts?.(item),
		at: bar.at?.(item),
	}));
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
				)}
			>
				{figure(total)}
			</RNText>
			{word ? <RNText className={text({ role: "meta" })}>{word}</RNText> : null}
		</View>
	);
	return (
		<View className={cn(CHART, STACK)}>
			{labels.length > 0 ? (
				<View className={CHART_HEAD}>
					{totalLine}
					<View className={cn(CHART_KEYS, KEYS)}>
						{keyTotals.map((key, at) => (
							<Key key={key.label} name={key.label} at={at}>
								<RNText className={cn(text({ role: "meta" }), FIGURES)}>
									{figure(key.value)}
								</RNText>
							</Key>
						))}
					</View>
				</View>
			) : (
				totalLine
			)}
			<View className={cn(CHART_BODY, BODY)} style={REACH}>
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
							{peak > 0 ? (
								<RNText className={cn(text({ role: "meta" }), FIGURES, TICK)}>
									{tick(top - step * index)}
								</RNText>
							) : null}
							{peak > 0 && index === bands - 1 ? (
								<RNText className={cn(text({ role: "meta" }), FIGURES, ZERO)}>
									{tick(0)}
								</RNText>
							) : null}
						</View>
					))}
				</View>
				<View className={cn(CHART_MAIN, MAIN)}>
					<View className={PLOT}>
						<View className={CHART_GRID}>
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
								<View key={bar.key} className={SLOT}>
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
					<View className={TIMES}>
						{series.map((bar) => (
							<View key={bar.key} className={TIME}>
								{bar.at ? (
									<RNText
										numberOfLines={1}
										className={cn(text({ role: "meta" }), FIGURES)}
									>
										{bar.at}
									</RNText>
								) : null}
							</View>
						))}
					</View>
				</View>
			</View>
		</View>
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
			<RNText className={text({ role: "meta" })}>{props.name}</RNText>
			{props.children}
		</View>
	);
}

// A failed, missing or empty chart: its EmptyState over the loaded boxes, held
// unseen. React Native has no grid to stack the two
// in one cell, so the EmptyState lies over the boxes, which set the height,
// its frame filling them.
function Stand(props: { keys?: readonly string[]; children: ReactNode }) {
	return (
		<View>
			<View className={HELD}>
				<Loading keys={props.keys} />
			</View>
			<View className={OVER}>{props.children}</View>
		</View>
	);
}

// The loaded boxes: the total's line (with the keys under it, each figure
// waiting in a lane four figures wide, so the legend wraps as the loaded one
// does), a tick's lane on each gridline, the plot's box, a time's lane at
// each end of the plot.
function Loading(props: { keys?: readonly string[] }) {
	const total = (
		<View className={LINE}>
			<Strut role="body" />
			<View className={cn(skeleton({ kind: "line" }), "w-1/4")} />
		</View>
	);
	return (
		<View className={cn(CHART, STACK)}>
			{props.keys ? (
				<View className={CHART_HEAD}>
					{total}
					<View className={cn(CHART_KEYS, KEYS)}>
						{props.keys.map((key, at) => (
							<Key key={key} name={key} at={at}>
								<View className={cn(LINE, CHART_TICK_LANE)}>
									<Strut role="meta" />
									<View className={cn(skeleton({ kind: "line" }), BAR)} />
								</View>
							</Key>
						))}
					</View>
				</View>
			) : (
				total
			)}
			<View className={cn(CHART_BODY, BODY)} style={REACH}>
				<View className={cn(CHART_GRID, CHART_TICK_LANE, AXIS)}>
					{Array.from({ length: BANDS }, (_, index) => (
						<View
							// biome-ignore lint/suspicious/noArrayIndexKey: a band is its index
							key={index}
							className={cn(
								chartBand({ kind: "axis", rule: band(index, BANDS) }),
								AXIS_BAND,
							)}
						>
							<View className={cn(LINE, BAR, TICK)}>
								<Strut role="meta" />
								<View className={cn(skeleton({ kind: "line" }), BAR)} />
							</View>
							{index === BANDS - 1 ? (
								<View className={cn(LINE, BAR, ZERO)}>
									<Strut role="meta" />
									<View className={cn(skeleton({ kind: "line" }), BAR)} />
								</View>
							) : null}
						</View>
					))}
				</View>
				<View className={cn(CHART_MAIN, MAIN)}>
					<View className={skeleton({ kind: "chart" })} />
					<View className={TIMES_WAIT}>
						{[0, 1].map((end) => (
							<View key={end} className={cn(LINE, "w-1/12")}>
								<Strut role="meta" />
								<View className={cn(skeleton({ kind: "line" }), BAR)} />
							</View>
						))}
					</View>
				</View>
			</View>
		</View>
	);
}
