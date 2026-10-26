import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import {
	type Bar,
	band,
	type ChartUnit,
	chartHead,
	chartScale,
	currencyOf,
	levelUnit,
	lifts,
	mark,
	spanText,
	spanUnit,
} from "@fcalell/ui-core/chart";
import { cn } from "@fcalell/ui-core/cn";
import { formatterFor } from "@fcalell/ui-core/format";
import { CHART_SERIES } from "@fcalell/ui-core/tokens";
import {
	CHART,
	CHART_BAR,
	CHART_BODY,
	CHART_GRID,
	CHART_HEAD,
	CHART_KEY,
	CHART_KEY_DOT,
	CHART_KEYS,
	CHART_MAIN,
	CHART_TICK_LANE,
	CHART_TOTAL,
	chartBand,
	chartFill,
	FIGURES,
	lineBox,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { VIRTUAL_FROM } from "@fcalell/ui-core/window";
import {
	type CSSProperties,
	memo,
	type ReactNode,
	useMemo,
	useRef,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { PAINT_BOX, Painted } from "../../lib/paint.tsx";
import {
	FrameBody,
	FrameLine,
	stillOf,
	useCollection,
} from "../../lib/read.tsx";
import { Decoded } from "../../lib/slot.tsx";
import { Swap } from "../../lib/swap.tsx";
import { Scroller, useScroller, Window } from "../../lib/window.tsx";

const STACK = "flex flex-col min-w-0";
const TOTAL = "flex items-baseline";
const HEAD = "flex flex-col";
const KEYS = "flex flex-wrap";
const KEY = "inline-flex items-center";
const DOT = "shrink-0";
// The body stands half a meta line below the head, so the top tick, centred
// on the plot's top edge, keeps the pair gap from the head's last line.
const BODY = "flex items-start pt-[calc(1lh/2)]";
const AXIS = "flex flex-col shrink-0";
// With no tick to draw (a waiting chart, a chart of nothing but zeros) the
// axis is not drawn, and its lane and the gap after it are the body's padding
// and the plot's margin, so the plot stands where it will.
const NO_AXIS = "ps-figures";
const NO_AXIS_MAIN = "ms-gap";
const AXIS_BAND = "relative flex-1";
// A tick centres on its gridline; the last band's bottom is the baseline,
// whose tick is the zero.
const TICK =
	"absolute end-0 top-0 -translate-y-1/2 max-w-measure-short truncate";
const ZERO = "absolute end-0 bottom-0 translate-y-1/2";
const MAIN = "grow min-w-0";
// The plot over its time line, the whole width the axis leaves.
const PLOT_MAIN = "flex flex-col";
// Past `VIRTUAL_FROM` bars the plot keeps a bar's width and scrolls sideways
// under the axis, which stays; the bars window along x.
const SCROLLS = "overflow-x-auto focus-visible:-outline-offset-2";
const WIDE = "w-max min-w-full";
const BAR_WIDE = "w-target shrink-0";
const PLOT = "relative";
// The gridlines stand behind the bars' regions, at the same height.
const GRID = "absolute inset-x-0 top-0 flex flex-col";
const GRID_BAND = "flex-1";
const BARS = "relative flex";
// A bar's slot is its region: the plot's height, the bar standing on its
// floor.
const REGION = "flex flex-col justify-end items-center";
const BAR_FIT = "flex-1 min-w-0";
// The bar's column: the region's full height, its parts laid over it, each the
// whole column scaled (`CHART_BAR`), so a value moves by transform.
const COLUMN = "relative h-full w-2/3";
// The time line under the plot, painted or loaded: the first bar's time at
// its start and the last bar's at its end, each whole.
const TIMES = "flex";
// A time takes up to half the line, so both stand whole at any real width and
// only a text that cannot fit beside the other truncates.
const TIME = "min-w-0 max-w-1/2 truncate";
const TIME_END = "ms-auto";

interface Figures {
	// The head's and the keys' figures.
	figure: Intl.NumberFormat;
	// The axis's ticks, in the lane four figures wide.
	tick: Intl.NumberFormat;
}

// Every figure of one chart in one notation: compact once its axis reaches
// five figures, so a tick stays inside its four-figure lane. Money keeps its
// figures exact (the cents of "$30.97" are not the axis's step) and writes
// its ticks short: no cents when the step is whole.
function formatters(
	top: number,
	step: number,
	unit: ChartUnit | undefined,
): Figures {
	const compact = top >= 10_000;
	const currency = currencyOf(unit);
	if (currency === undefined) {
		const plain = formatterFor(
			"number",
			undefined,
			compact
				? { notation: "compact", maximumFractionDigits: 1 }
				: { maximumFractionDigits: 1 },
		);
		return { figure: plain, tick: plain };
	}
	const money = { style: "currency", currency } as const;
	const whole = { minimumFractionDigits: 0, maximumFractionDigits: 0 };
	return {
		figure: formatterFor("number", undefined, money),
		tick: formatterFor("number", undefined, {
			...money,
			...(compact
				? {
						notation: "compact",
						minimumFractionDigits: 0,
						maximumFractionDigits: 1,
					}
				: Number.isInteger(step)
					? whole
					: {}),
		}),
	};
}

/** One function per bar slot, each called with a loaded item. */
export interface BarSlots<T> {
	/** The item's React key, unique in the chart. */
	key: (item: T) => string;
	/** The bar's total. */
	value: (item: T) => number;
	/** The bar's parts' values by the chart's `keys`; a key it lacks is 0. */
	parts?: (item: T) => Readonly<Record<string, number>> | undefined;
	/** The time drawn under the plot's start (the first bar's) and end (the last bar's); no other bar's is read (a word; never wraps or cuts). */
	at?: (item: T) => string | undefined;
}

/** Columns over time: one bar per item, stacked by one dimension when `keys` names its parts. */
export type BarChartProps<T = unknown> = Closed & {
	/** The items the bars draw, oldest first: constants, or a selection, which paints the chart until its read lands. A selection is the chart's own frame: it holds its read and draws the failed, missing and empty forms in its own box whatever stands above it. */
	items: Datum<readonly T[]>;
	/** What the chart counts, which names the plot (a short phrase; read aloud, never drawn). */
	label: string;
	/** The names a bar's parts stack by, bottom first (each a word; the legend wraps between names): present, the chart is stacked and draws them as its legend in every form, each name holding its series mark. */
	keys?: readonly string[];
	/** The bar slots, read from each item. */
	bar: BarSlots<T>;
	/** What the values count (`requests`, `minutes`), drawn after the total; a unit that takes a plural is `{ one, other }` (`{ one: "flag", other: "flags" }`), the form chosen by the figure it follows; money is `{ currency: "USD" }`, its figures written in the currency with no word after them. */
	unit?: ChartUnit;
	/** The bars are a level, not a flow (a reading each hour, open flags per round, not requests per day): the head draws their span, the lowest bar to the highest ("18.2–21 °C", "1–3 flags"), and each key its part's span, never their sum and never the last bar, which is the thing's own reading its record says. A unit that never sums (a share, `%`, or a temperature, `°C`) is a level unless this is `false`. The bars stand on zero either way: a bar's length is its value. */
	level?: boolean;
};

const NONE: readonly never[] = [];

// A bar's part by key; a key it lacks is 0.
const part = (bar: Bar, key: string) => bar.parts?.[key] ?? 0;

// One bar's slot in the plot: the bar, or its parts stacked, standing on the
// plot's floor.
const BarSlot = memo(function BarSlot(props: {
	bar: Bar;
	keys: readonly string[] | undefined;
	top: number;
	wide: boolean;
}) {
	const { bar, keys, top } = props;
	// A part is the whole column scaled to its share of the axis top and lifted
	// over the parts under it, one clear line higher for each of them that draws.
	const fill = (value: number, under: number, gap: number) =>
		({
			"--fill": value / top,
			"--stack": `calc(${(under / top) * 100}% + ${gap}px)`,
		}) as CSSProperties;
	const values = keys?.map((key) => part(bar, key)) ?? [];
	const gaps = lifts(values);
	return (
		<div className={cn(CHART_GRID, REGION, props.wide ? BAR_WIDE : BAR_FIT)}>
			<div className={COLUMN}>
				{keys ? (
					// The first part stands on the baseline, each next one over it.
					keys.map((key, at) => (
						<div
							key={key}
							className={cn(chartFill({ series: mark(at) }), CHART_BAR)}
							style={fill(
								values[at] ?? 0,
								values.slice(0, at).reduce((sum, one) => sum + one, 0),
								gaps[at] ?? 0,
							)}
						/>
					))
				) : (
					<div
						className={cn(chartFill({ series: CHART_SERIES[0] }), CHART_BAR)}
						style={fill(bar.value, 0, 0)}
					/>
				)}
			</div>
		</div>
	);
});

/** The total (the bars' span with `level`) at body 500 with its unit, the parts' keys under it, then the axis beside the plot, its four gridlines a hairline each with its tick centred on it and the baseline with its 0, the columns in the chip marks by part, the first bar's time under the plot's start and the last bar's under its end (no other bar's time is drawn). From `VIRTUAL_FROM` bars the plot keeps a bar's width and scrolls sideways, the axis staying, and only the bars near the view are drawn, the time line spanning the scrolled width so the last time stands whole at the end. While the `items` selection's read waits, the total is a figure's filler, the legend stands (its names and marks declared, its figures painted), the plot is one painted box at its loaded height with the axis's lane kept and the time line is two fillers at its place, the chart inert. The chart is a frame of its items: it draws the failed form with Retry, the missing form and the empty form in its own box with the generic sentence, and the stale and paused line above itself while it holds its read, whatever stands above it. */
export function BarChart<T>(props: BarChartProps<T>) {
	const { label, keys, unit, level } = props;
	const { drawn, frame } = useCollection(props.items);
	const { painted } = drawn;
	const { bar } = props;
	const items = painted ? NONE : drawn.value;
	// The bars are read from their items once per answer, so a bar's slot
	// renders only when its own bar changed.
	const series = useMemo<Bar[]>(
		() =>
			items.map((item) => ({
				key: bar.key(item),
				value: bar.value(item),
				parts: bar.parts?.(item),
			})),
		[items, bar],
	);
	// Only the ends are timed: the first bar's time at the plot's start, the
	// last bar's at its end.
	const first = items[0];
	const last = items.length > 1 ? items[items.length - 1] : undefined;
	const start = first === undefined ? undefined : bar.at?.(first);
	const end = last === undefined ? undefined : bar.at?.(last);
	const labels = keys ?? [];
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
	const head = chartHead(series, labels, level ?? levelUnit(unit));
	const { total } = head;
	const word = unit ? spanUnit(unit, total) : undefined;
	const keyTotals = labels.map((label, at) => ({
		label,
		value: head.parts[at] ?? { low: 0, high: 0 },
	}));
	const totalLine = (
		<div className={cn(CHART_TOTAL, TOTAL)}>
			<span
				className={cn(
					text({ role: "body" }),
					textStrong({ role: "body" }),
					FIGURES,
				)}
			>
				<Decoded
					role="figure"
					painted={painted}
					text={spanText(total, (value) => figure.format(value))}
					of={total.high}
				/>
			</span>
			{word ? <span className={text({ role: "meta" })}>{word}</span> : null}
		</div>
	);
	// A long chart keeps a bar's width and windows its bars (each with its
	// time) along x, in a scroller of its own around the plot.
	const windowed = series.length >= VIRTUAL_FROM;
	// The axis draws its ticks, which a chart of nothing (every bar zero) and a
	// waiting one have none of.
	const ticks = !painted && peak > 0;
	const scroll = useScroller();
	const bars = useRef<HTMLDivElement>(null);
	return (
		<FrameBody frame={frame}>
			<FrameLine frame={frame} />
			<div
				inert={painted || undefined}
				data-still={stillOf(frame)}
				className={cn(CHART, STACK)}
			>
				{labels.length > 0 ? (
					<div className={cn(CHART_HEAD, HEAD)}>
						{totalLine}
						<div className={cn(CHART_KEYS, KEYS)}>
							{keyTotals.map((key, at) => (
								<Key key={key.label} name={key.label} at={at}>
									<span className={cn(text({ role: "meta" }), FIGURES)}>
										<Decoded
											role="figure"
											at={at}
											painted={painted}
											text={spanText(key.value, (value) =>
												figure.format(value),
											)}
											of={key.value.high}
										/>
									</span>
								</Key>
							))}
						</div>
					</div>
				) : (
					totalLine
				)}
				<div
					className={cn(
						CHART_BODY,
						BODY,
						lineBox({ role: "meta" }),
						!ticks && NO_AXIS,
					)}
				>
					{ticks ? (
						<div aria-hidden className={cn(CHART_GRID, CHART_TICK_LANE, AXIS)}>
							{Array.from({ length: bands }, (_, index) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: a band is its index
									key={index}
									className={cn(
										chartBand({ kind: "axis", rule: band(index, bands) }),
										AXIS_BAND,
									)}
								>
									<span className={cn(text({ role: "meta" }), FIGURES, TICK)}>
										{/* A rescaled axis cross-fades its labels while its bars move together. */}
										<Swap id={tick.format(top - step * index)}>
											{tick.format(top - step * index)}
										</Swap>
									</span>
									{index === bands - 1 ? (
										<span className={cn(text({ role: "meta" }), FIGURES, ZERO)}>
											{tick.format(0)}
										</span>
									) : null}
								</div>
							))}
						</div>
					) : null}
					<div
						ref={scroll.ref}
						// A plot that scrolls is a region the keyboard scrolls too.
						{...(windowed
							? { role: "group", "aria-label": label, tabIndex: 0 }
							: {})}
						className={cn(MAIN, windowed && SCROLLS, !ticks && NO_AXIS_MAIN)}
					>
						<Scroller value={scroll}>
							<div className={cn(CHART_MAIN, PLOT_MAIN, windowed && WIDE)}>
								{painted ? (
									<div className={cn(CHART_GRID, PAINT_BOX)} />
								) : (
									<div role="img" aria-label={label} className={PLOT}>
										<div className={cn(CHART_GRID, GRID)}>
											{Array.from({ length: bands }, (_, index) => (
												<div
													// biome-ignore lint/suspicious/noArrayIndexKey: a band is its index
													key={index}
													className={cn(
														chartBand({
															kind: "grid",
															rule: band(index, bands),
														}),
														GRID_BAND,
													)}
												/>
											))}
										</div>
										<div ref={bars} className={BARS}>
											<Window
												horizontal
												count={series.length}
												keyOf={(index) => (series[index] as Bar).key}
												row={(index) => (
													<BarSlot
														key={(series[index] as Bar).key}
														bar={series[index] as Bar}
														keys={keys}
														top={top}
														wide={windowed}
													/>
												)}
												box={bars}
											/>
										</div>
									</div>
								)}
								{painted ? (
									<div aria-hidden className={TIMES}>
										{[0, 1].map((at) => (
											<span
												key={at}
												className={cn(
													text({ role: "meta" }),
													FIGURES,
													at === 1 && TIME_END,
												)}
											>
												<Painted role="word" at={at} />
											</span>
										))}
									</div>
								) : start || end ? (
									<div aria-hidden className={TIMES}>
										{start ? (
											<span
												className={cn(text({ role: "meta" }), FIGURES, TIME)}
											>
												{start}
											</span>
										) : null}
										{end ? (
											<span
												className={cn(
													text({ role: "meta" }),
													FIGURES,
													TIME,
													TIME_END,
												)}
											>
												{end}
											</span>
										) : null}
									</div>
								) : null}
							</div>
						</Scroller>
					</div>
				</div>
			</div>
		</FrameBody>
	);
}

// A legend entry: the key's dot in its mark and its name, then its figure.
function Key(props: { name: string; at: number; children: ReactNode }) {
	return (
		<span className={cn(CHART_KEY, KEY)}>
			<span
				className={cn(
					CHART_KEY_DOT,
					chartFill({ series: mark(props.at) }),
					DOT,
				)}
			/>
			<span className={text({ role: "meta" })}>{props.name}</span>
			{props.children}
		</span>
	);
}
