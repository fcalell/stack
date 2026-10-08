import {
	BANDS,
	type ChartUnit,
	chartHead,
	chartScale,
	currencyOf,
	unitOf,
} from "@fcalell/ui-core/chart";
import { cn } from "@fcalell/ui-core/cn";
import { formatterFor } from "@fcalell/ui-core/format";
import { listBusy, listState, retryOf } from "@fcalell/ui-core/list-state";
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
import { type ReactNode, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { SectionContext } from "../../lib/section.ts";
import { useWords } from "../../lib/words.tsx";
import { EmptyStateBase } from "../empty-state/base.tsx";
import type { ListEmpty } from "../list/index.tsx";
import { MissingBase } from "../missing/base.tsx";
import type { QueryLike } from "../query-boundary/index.tsx";

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
const AXIS_BAND = "relative flex-1";
// A tick centres on its gridline; the last band's bottom is the baseline,
// whose tick is the zero.
const TICK = "absolute end-0 top-0 -translate-y-1/2";
const ZERO = "absolute end-0 bottom-0 translate-y-1/2";
const MAIN = "flex flex-col grow min-w-0";
const PLOT = "relative";
const GRID = "flex flex-col";
const GRID_BAND = "flex-1";
const BARS = "absolute inset-0 flex";
const SLOT = "flex flex-col justify-end items-center flex-1 min-w-0";
const PART = "shrink-0";
const TIMES = "flex";
const TIME = "flex justify-center flex-1 min-w-0";
const TIME_TEXT = "whitespace-nowrap";
const LINE = "flex items-center h-lh";
const TIMES_WAIT = "flex justify-between";
const BAR = "w-full";
// A failed or empty chart's EmptyState stands over the loaded boxes, held
// unseen, so it takes the chart's loaded height, its frame filling it.
const STAND = "grid";
const LAYER = "col-start-1 row-start-1";
const HELD = "invisible";
const OVER = "flex flex-col";

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

function band(index: number, bands: number) {
	return index === bands - 1 ? "both" : "top";
}

/** One function per bar slot, each called with a loaded item. */
export interface BarSlots<T> {
	/** The item's React key, unique in the chart. */
	key: (item: T) => string;
	/** The bar's total. */
	value: (item: T) => number;
	/** The bar's parts' values by the chart's `keys`; a key it lacks is 0. */
	parts?: (item: T) => Readonly<Record<string, number>> | undefined;
	/** The time drawn under the bar (a word; never wraps). */
	at?: (item: T) => string | undefined;
}

/** Where a chart's bars come from. */
type ChartSource<T> =
	| {
			/** The query whose items the bars draw, oldest first. */
			query: QueryLike<readonly T[]>;
			/** What failed to load, over the retry act (a sentence; wraps). */
			sentence: string;
			/** What the chart draws when the query answers with no item. */
			empty: ListEmpty;
			items?: never;
			loading?: never;
	  }
	| {
			/** The items the bars draw, oldest first. */
			items: readonly T[];
			/** The items are on their way (a compound body's loading form): the chart waits. */
			loading?: boolean;
			/** What the chart draws with no item; without it an empty chart draws its empty plot. */
			empty?: ListEmpty;
			query?: never;
			sentence?: never;
	  };

/** Columns over time: one bar per item, stacked by one dimension when `keys` names its parts. */
export type BarChartProps<T = unknown> = Closed &
	ChartSource<T> & {
		/** What the chart counts, which names the plot (a short phrase; read aloud, never drawn). */
		label: string;
		/** The names a bar's parts stack by, bottom first (each a word; the legend wraps between names): present, the chart is stacked and draws them as its legend in every form, each name holding its series mark. */
		keys?: readonly string[];
		/** The bar slots, read from each item. */
		bar: BarSlots<T>;
		/** What the values count (`requests`, `minutes`), drawn after the total; a unit that takes a plural is `{ one, other }` (`{ one: "flag", other: "flags" }`), the form chosen by the figure it follows; money is `{ currency: "USD" }`, its figures written in the currency with no word after them. */
		unit?: ChartUnit;
		/** The bars are a level, not a flow (open flags per round, not requests per day): the head draws the last bar's value, and each key the last bar's part, never their sum. */
		level?: boolean;
	};

// One bar, read from its item.
interface Bar {
	key: string;
	value: number;
	parts?: Readonly<Record<string, number>>;
	at?: string;
}

/** The total (the last bar with `level`) at body 500 with its unit, the parts' keys under it, then the axis beside the plot, its four gridlines a hairline each with its tick centred on it and the baseline with its 0, the columns in the chip marks by part, a time under each bar that has one. It draws its collection's four states: while its query is pending, `loading` is set or a loading Section around it waits, its boxes in skeleton at their loaded size with the keys standing (a Section around a pending query busy); a query that answers not found draws the rest EmptyState saying it no longer exists with Back (never Retry), a failed query the failed EmptyState with `sentence` and Retry, and no item `empty`, each at the chart's loaded height; then one bar per item. */
export function BarChart<T>(props: BarChartProps<T>) {
	const { label, keys, unit, level } = props;
	const words = useWords();
	const base = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: use(LoadingContext),
		inSection: false,
		hasEmpty: props.empty !== undefined,
	};
	const input = { ...base, inSection: use(SectionContext) };
	const state = listState(input);
	if (state === "pending")
		return <Loading keys={keys} busy={listBusy(input)} />;
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
		<div className={cn(CHART_TOTAL, TOTAL)}>
			<span
				className={cn(
					text({ role: "body" }),
					textStrong({ role: "body" }),
					FIGURES,
				)}
			>
				{figure.format(total)}
			</span>
			{word ? <span className={text({ role: "meta" })}>{word}</span> : null}
		</div>
	);
	const height = (value: number) => ({ height: `${(value / top) * 100}%` });
	return (
		<div className={cn(CHART, STACK)}>
			{labels.length > 0 ? (
				<div className={cn(CHART_HEAD, HEAD)}>
					{totalLine}
					<div className={cn(CHART_KEYS, KEYS)}>
						{keyTotals.map((key, at) => (
							<Key key={key.label} name={key.label} at={at}>
								<span className={cn(text({ role: "meta" }), FIGURES)}>
									{figure.format(key.value)}
								</span>
							</Key>
						))}
					</div>
				</div>
			) : (
				totalLine
			)}
			<div className={cn(CHART_BODY, BODY, lineBox({ role: "meta" }))}>
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
							{peak > 0 ? (
								<span className={cn(text({ role: "meta" }), FIGURES, TICK)}>
									{tick.format(top - step * index)}
								</span>
							) : null}
							{peak > 0 && index === bands - 1 ? (
								<span className={cn(text({ role: "meta" }), FIGURES, ZERO)}>
									{tick.format(0)}
								</span>
							) : null}
						</div>
					))}
				</div>
				<div className={cn(CHART_MAIN, MAIN)}>
					<div role="img" aria-label={label} className={PLOT}>
						<div className={cn(CHART_GRID, GRID)}>
							{Array.from({ length: bands }, (_, index) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: a band is its index
									key={index}
									className={cn(
										chartBand({ kind: "grid", rule: band(index, bands) }),
										GRID_BAND,
									)}
								/>
							))}
						</div>
						<div className={BARS}>
							{series.map((bar) => (
								<div key={bar.key} className={SLOT}>
									{keys ? (
										// The first part stands on the baseline, each next one
										// over it, split from it by a clear line.
										keys
											.map((key, at) => (
												<div
													key={key}
													className={cn(
														chartFill({ series: mark(at) }),
														at > 0 && CHART_PART_SPLIT,
														"w-2/3",
														PART,
													)}
													style={height(part(bar, key))}
												/>
											))
											.reverse()
									) : (
										<div
											className={cn(
												chartFill({ series: CHART_SERIES[0] }),
												"w-2/3",
											)}
											style={height(bar.value)}
										/>
									)}
								</div>
							))}
						</div>
					</div>
					<div aria-hidden className={TIMES}>
						{series.map((bar) => (
							<div key={bar.key} className={TIME}>
								{bar.at ? (
									<span
										className={cn(text({ role: "meta" }), FIGURES, TIME_TEXT)}
									>
										{bar.at}
									</span>
								) : null}
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

// A key's series mark by its place in the keys.
function mark(at: number) {
	return CHART_SERIES[at % CHART_SERIES.length] ?? CHART_SERIES[0];
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

// A failed, missing or empty chart: its EmptyState over the loaded boxes,
// held unseen.
function Stand(props: { keys?: readonly string[]; children: ReactNode }) {
	return (
		<div className={STAND}>
			<div className={cn(LAYER, HELD)}>
				<Loading keys={props.keys} busy={false} />
			</div>
			<div className={cn(LAYER, OVER)}>{props.children}</div>
		</div>
	);
}

// The loaded boxes: the total's line (with the keys under it, each figure
// waiting in a lane four figures wide, so the legend wraps as the loaded one
// does), a tick's lane on each gridline, the plot's box, a time's lane at
// each end of the plot.
function Loading(props: { keys?: readonly string[]; busy: boolean }) {
	const total = (
		<div className={cn(lineBox({ role: "body" }), LINE)}>
			<span className={cn(skeleton({ kind: "line" }), "w-1/4")} />
		</div>
	);
	return (
		<div aria-busy={props.busy || undefined} className={cn(CHART, STACK)}>
			{props.keys ? (
				<div className={cn(CHART_HEAD, HEAD)}>
					{total}
					<div className={cn(CHART_KEYS, KEYS)}>
						{props.keys.map((key, at) => (
							<Key key={key} name={key} at={at}>
								<span
									className={cn(
										lineBox({ role: "meta" }),
										LINE,
										CHART_TICK_LANE,
									)}
								>
									<span className={cn(skeleton({ kind: "line" }), BAR)} />
								</span>
							</Key>
						))}
					</div>
				</div>
			) : (
				total
			)}
			<div className={cn(CHART_BODY, BODY, lineBox({ role: "meta" }))}>
				<div className={cn(CHART_GRID, CHART_TICK_LANE, AXIS)}>
					{Array.from({ length: BANDS }, (_, index) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: a band is its index
							key={index}
							className={cn(
								chartBand({ kind: "axis", rule: band(index, BANDS) }),
								AXIS_BAND,
							)}
						>
							<span className={cn(lineBox({ role: "meta" }), LINE, BAR, TICK)}>
								<span className={cn(skeleton({ kind: "line" }), BAR)} />
							</span>
							{index === BANDS - 1 ? (
								<span
									className={cn(lineBox({ role: "meta" }), LINE, BAR, ZERO)}
								>
									<span className={cn(skeleton({ kind: "line" }), BAR)} />
								</span>
							) : null}
						</div>
					))}
				</div>
				<div className={cn(CHART_MAIN, MAIN)}>
					<div className={skeleton({ kind: "chart" })} />
					<div className={TIMES_WAIT}>
						{[0, 1].map((end) => (
							<span
								key={end}
								className={cn(lineBox({ role: "meta" }), LINE, "w-1/12")}
							>
								<span className={cn(skeleton({ kind: "line" }), BAR)} />
							</span>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
