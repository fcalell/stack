import {
	listBusy,
	listState,
	listWaits,
	retryOf,
} from "@fcalell/ui-core/list-state";
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
	lineBox,
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
import { useSectionWait } from "../../lib/section";
import { useWords } from "../../lib/words";
import { EmptyStateBase } from "../empty-state/base";
import { Missing } from "../empty-state/missing";
import type { ListEmpty } from "../list";
import type { QueryLike } from "../query-boundary";

const STACK = "min-w-0";
const TOTAL = "flex-row items-baseline";
const KEYS = "flex-row flex-wrap";
const KEY = "flex-row items-center";
const DOT = "shrink-0";
const BODY = "flex-row items-start";
const AXIS = "shrink-0";
const AXIS_BAND = "flex-row justify-end flex-1";
// A tick centres on its gridline.
const TICK = "-translate-y-1/2";
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
const STRUT = "​";
const TIMES_WAIT = "flex-row justify-between";
const BAR = "w-full";
// A failed or empty chart's EmptyState stands over the loaded boxes, held
// unseen, so it takes the chart's loaded height.
const HELD = "opacity-0";
const OVER = "absolute inset-0 justify-center";

// Four bands, the last one's bottom the baseline.
const BANDS = 4;

// The axis top: four even steps over the largest bar, each step the first
// whole multiple of its own magnitude.
function stepOf(peak: number): number {
	if (peak <= 0) return 1;
	const raw = peak / BANDS;
	const magnitude = 10 ** Math.floor(Math.log10(raw));
	return Math.ceil(raw / magnitude) * magnitude;
}

// Every figure of one chart in one notation: compact once its axis reaches
// five figures, so a tick stays inside its four-figure lane.
function formatter(top: number): (value: number) => string {
	if (top >= 10_000) return compact;
	const plain = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
	return (value) => plain.format(value);
}

function band(index: number) {
	return index === BANDS - 1 ? "both" : "top";
}

// A part's or a column's height: its value's share of the axis top.
function height(value: number, top: number) {
	return { height: `${(value / top) * 100}%` } as const;
}

// Hidden from assistive tech: the axis and the times, whose figures each
// column reads aloud.
const HIDDEN = {
	accessibilityElementsHidden: true,
	importantForAccessibility: "no-hide-descendants",
} as const;

// One function per bar slot, each called with a loaded item.
export interface BarSlots<T> {
	key: (item: T) => string;
	// The bar's period, which its column reads aloud.
	label: (item: T) => string;
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
		// What the chart counts, which names the plot.
		label: string;
		// The names a bar's parts stack by, bottom first: present, the chart is
		// stacked and draws them as its legend in every form, each name holding
		// its series mark.
		keys?: readonly string[];
		bar: BarSlots<T>;
		// What the values count (`requests`, `minutes`), drawn after the total.
		unit?: string;
	};

// One bar, read from its item.
interface Bar {
	key: string;
	label: string;
	value: number;
	parts?: Readonly<Record<string, number>>;
	at?: string;
}

// The total at body 500 with its unit, the parts' keys under it, then the
// axis beside the plot, its four gridlines a hairline, the columns in the
// chip marks by part, a time under each bar that has one. React Native has no
// hidden table: the total names the chart and sums it, and each column reads
// its label and its figures in full, as the web's table rows do. It draws its
// collection's four states: while its query is pending, `loading` is set or a
// loading Section around it waits, its boxes in skeleton at their loaded size
// with the keys standing (a Section around a pending query busy); a query
// that answers not found draws the rest EmptyState saying it no longer exists
// with Back (never Retry), a failed query the failed EmptyState with
// `sentence` and Retry, and no item `empty`, each at the chart's loaded
// height; then one bar per item.
export function BarChart<T>(props: BarChartProps<T>) {
	const { label, keys, unit } = props;
	const words = useWords();
	const base = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: useContext(LoadingContext),
		inSection: false,
		hasEmpty: props.empty !== undefined,
	};
	const input = { ...base, inSection: useSectionWait(listWaits(base)) };
	const state = listState(input);
	if (state === "pending")
		return <Loading keys={keys} busy={listBusy(input)} />;
	if (state === "missing")
		return (
			<Stand keys={keys}>
				<Missing />
			</Stand>
		);
	if (state === "failed" && props.query !== undefined)
		return (
			<Stand keys={keys}>
				<EmptyStateBase
					tone="failed"
					sentence={props.sentence}
					act={{ label: words.retry, onAct: retryOf(props.query) }}
				/>
			</Stand>
		);
	if (state === "empty" && props.empty)
		return (
			<Stand keys={keys}>
				<EmptyStateBase tone="rest" {...props.empty} />
			</Stand>
		);
	const { bar } = props;
	const items = (props.query ? props.query.data : props.items) ?? [];
	const series: Bar[] = items.map((item) => ({
		key: bar.key(item),
		label: bar.label(item),
		value: bar.value(item),
		parts: bar.parts?.(item),
		at: bar.at?.(item),
	}));
	const labels = keys ?? [];
	const part = (bar: Bar, key: string) => bar.parts?.[key] ?? 0;
	const peak = Math.max(
		0,
		...series.map((bar) =>
			keys ? keys.reduce((sum, key) => sum + part(bar, key), 0) : bar.value,
		),
	);
	const step = stepOf(peak);
	const top = step * BANDS;
	const figure = formatter(top);
	// A column gives assistive tech the figures the plot cannot: in full.
	const full = new Intl.NumberFormat();
	const total = series.reduce((sum, bar) => sum + bar.value, 0);
	const keyTotals = labels.map((label) => ({
		label,
		value: series.reduce((sum, bar) => sum + part(bar, label), 0),
	}));
	const summary = [
		label,
		unit ? `${figure(total)} ${unit}` : figure(total),
		...keyTotals.map((key) => `${key.label} ${figure(key.value)}`),
	].join(", ");
	const said = (bar: Bar) =>
		[
			bar.label,
			unit ? `${full.format(bar.value)} ${unit}` : full.format(bar.value),
			...labels.map((key) => `${key} ${full.format(part(bar, key))}`),
		].join(", ");
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
			{unit ? <RNText className={text({ role: "meta" })}>{unit}</RNText> : null}
		</View>
	);
	return (
		<View className={cn(CHART, STACK)}>
			<View accessible accessibilityLabel={summary}>
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
			</View>
			<View className={cn(CHART_BODY, BODY)}>
				<View {...HIDDEN} className={cn(CHART_GRID, CHART_TICK_LANE, AXIS)}>
					{Array.from({ length: BANDS }, (_, index) => (
						<View
							// biome-ignore lint/suspicious/noArrayIndexKey: a band is its index
							key={index}
							className={cn(
								chartBand({ kind: "axis", rule: band(index) }),
								AXIS_BAND,
							)}
						>
							{peak > 0 ? (
								<RNText className={cn(text({ role: "meta" }), FIGURES, TICK)}>
									{figure(top - step * index)}
								</RNText>
							) : null}
						</View>
					))}
				</View>
				<View className={cn(CHART_MAIN, MAIN)}>
					<View className={PLOT}>
						<View className={CHART_GRID}>
							{Array.from({ length: BANDS }, (_, index) => (
								<View
									// biome-ignore lint/suspicious/noArrayIndexKey: a band is its index
									key={index}
									className={cn(
										chartBand({ kind: "grid", rule: band(index) }),
										GRID_BAND,
									)}
								/>
							))}
						</View>
						<View className={BARS}>
							{series.map((bar) => (
								<View
									key={bar.key}
									accessible
									accessibilityLabel={said(bar)}
									className={SLOT}
								>
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
					<View {...HIDDEN} className={TIMES}>
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

// A failed, missing or empty chart: its EmptyState over the loaded boxes, held unseen
// and hidden from assistive tech. React Native has no grid to stack the two
// in one cell, so the EmptyState lies over the boxes, which set the height.
function Stand(props: { keys?: readonly string[]; children: ReactNode }) {
	return (
		<View>
			<View {...HIDDEN} className={HELD}>
				<Loading keys={props.keys} busy={false} />
			</View>
			<View className={OVER}>{props.children}</View>
		</View>
	);
}

// The loaded boxes: the total's line (with the keys under it, each figure
// waiting in a lane four figures wide, so the legend wraps as the loaded one
// does), a tick's lane on each gridline, the plot's box, a time's lane at
// each end of the plot.
function Loading(props: { keys?: readonly string[]; busy: boolean }) {
	const total = (
		<View className={LINE}>
			<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
			<View className={cn(skeleton({ kind: "line" }), "w-1/4")} />
		</View>
	);
	return (
		<View
			accessibilityState={{ busy: props.busy }}
			className={cn(CHART, STACK)}
		>
			{props.keys ? (
				<View className={CHART_HEAD}>
					{total}
					<View className={cn(CHART_KEYS, KEYS)}>
						{props.keys.map((key, at) => (
							<Key key={key} name={key} at={at}>
								<View className={cn(LINE, CHART_TICK_LANE)}>
									<RNText className={lineBox({ role: "meta" })}>{STRUT}</RNText>
									<View className={cn(skeleton({ kind: "line" }), BAR)} />
								</View>
							</Key>
						))}
					</View>
				</View>
			) : (
				total
			)}
			<View className={cn(CHART_BODY, BODY)}>
				<View className={cn(CHART_GRID, CHART_TICK_LANE, AXIS)}>
					{Array.from({ length: BANDS }, (_, index) => (
						<View
							// biome-ignore lint/suspicious/noArrayIndexKey: a band is its index
							key={index}
							className={cn(
								chartBand({ kind: "axis", rule: band(index) }),
								AXIS_BAND,
							)}
						>
							<View className={cn(LINE, BAR, TICK)}>
								<RNText className={lineBox({ role: "meta" })}>{STRUT}</RNText>
								<View className={cn(skeleton({ kind: "line" }), BAR)} />
							</View>
						</View>
					))}
				</View>
				<View className={cn(CHART_MAIN, MAIN)}>
					<View className={skeleton({ kind: "chart" })} />
					<View className={TIMES_WAIT}>
						{[0, 1].map((end) => (
							<View key={end} className={cn(LINE, "w-1/12")}>
								<RNText className={lineBox({ role: "meta" })}>{STRUT}</RNText>
								<View className={cn(skeleton({ kind: "line" }), BAR)} />
							</View>
						))}
					</View>
				</View>
			</View>
		</View>
	);
}
