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
import { Missing } from "../empty-state/missing.tsx";
import type { ListEmpty } from "../list/index.tsx";
import type { QueryLike } from "../query-boundary/index.tsx";

const STACK = "flex flex-col min-w-0";
const TOTAL = "flex items-baseline";
const HEAD = "flex flex-col";
const KEYS = "flex flex-wrap";
const KEY = "inline-flex items-center";
const DOT = "shrink-0";
const BODY = "flex items-start";
const AXIS = "flex flex-col shrink-0";
const AXIS_BAND = "flex justify-end flex-1";
// A tick centres on its gridline.
const TICK = "-translate-y-1/2";
const MAIN = "flex flex-col grow min-w-0";
const PLOT = "relative";
const GRID = "flex flex-col";
const GRID_BAND = "flex-1";
const BARS = "absolute inset-0 flex";
const SLOT = "flex flex-col justify-end items-center flex-1 min-w-0";
const PART = "shrink-0";
const TABLE = "sr-only";
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
function formatter(top: number): Intl.NumberFormat {
	return formatterFor(
		"number",
		undefined,
		top >= 10_000
			? { notation: "compact", maximumFractionDigits: 1 }
			: { maximumFractionDigits: 1 },
	);
}

function band(index: number) {
	return index === BANDS - 1 ? "both" : "top";
}

/** One function per bar slot, each called with a loaded item. */
export interface BarSlots<T> {
	/** The item's React key, unique in the chart. */
	key: (item: T) => string;
	/** The bar's period, naming its row in the values' table. */
	label: (item: T) => string;
	/** The bar's total. */
	value: (item: T) => number;
	/** The bar's parts' values by the chart's `keys`; a key it lacks is 0. */
	parts?: (item: T) => Readonly<Record<string, number>> | undefined;
	/** The time drawn under the bar. */
	at?: (item: T) => string | undefined;
}

/** Where a chart's bars come from. */
type ChartSource<T> =
	| {
			/** The query whose items the bars draw, oldest first. */
			query: QueryLike<readonly T[]>;
			/** What failed to load, over the retry act. */
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
		/** What the chart counts, which names the plot and captions its table. */
		label: string;
		/** The names a bar's parts stack by, bottom first: present, the chart is stacked and draws them as its legend in every form, each name holding its series mark. */
		keys?: readonly string[];
		/** The bar slots, read from each item. */
		bar: BarSlots<T>;
		/** What the values count (`requests`, `minutes`), drawn after the total. */
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

/** The total at body 500 with its unit, the parts' keys under it, then the axis beside the plot, its four gridlines a hairline, the columns in the chip marks by part, a time under each bar that has one; the values reach assistive tech as a visually hidden table. It draws its collection's four states: while its query is pending, `loading` is set or a loading Section around it waits, its boxes in skeleton at their loaded size with the keys standing (a Section around a pending query busy); a query that answers not found draws the rest EmptyState saying it no longer exists with Back (never Retry), a failed query the failed EmptyState with `sentence` and Retry, and no item `empty`, each at the chart's loaded height; then one bar per item. */
export function BarChart<T>(props: BarChartProps<T>) {
	const { label, keys, unit } = props;
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
				<Missing fill />
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
	// The table gives assistive tech the figures the plot cannot: in full.
	const full = formatterFor("number");
	const total = series.reduce((sum, bar) => sum + bar.value, 0);
	const keyTotals = labels.map((label) => ({
		label,
		value: series.reduce((sum, bar) => sum + part(bar, label), 0),
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
			{unit ? <span className={text({ role: "meta" })}>{unit}</span> : null}
		</div>
	);
	const summary = [
		unit ? `${figure.format(total)} ${unit}` : figure.format(total),
		...keyTotals.map((key) => `${key.label} ${figure.format(key.value)}`),
	].join(", ");
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
			<div className={cn(CHART_BODY, BODY)}>
				<div aria-hidden className={cn(CHART_GRID, CHART_TICK_LANE, AXIS)}>
					{Array.from({ length: BANDS }, (_, index) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: a band is its index
							key={index}
							className={cn(
								chartBand({ kind: "axis", rule: band(index) }),
								AXIS_BAND,
							)}
						>
							{peak > 0 ? (
								<span className={cn(text({ role: "meta" }), FIGURES, TICK)}>
									{figure.format(top - step * index)}
								</span>
							) : null}
						</div>
					))}
				</div>
				<div className={cn(CHART_MAIN, MAIN)}>
					<div role="img" aria-label={`${label}: ${summary}`} className={PLOT}>
						<div className={cn(CHART_GRID, GRID)}>
							{Array.from({ length: BANDS }, (_, index) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: a band is its index
									key={index}
									className={cn(
										chartBand({ kind: "grid", rule: band(index) }),
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
					<div className={TABLE}>
						<table>
							<caption>{label}</caption>
							<thead>
								<tr>
									<th scope="col">{words.time}</th>
									<th scope="col">{unit ?? label}</th>
									{labels.map((label) => (
										<th key={label} scope="col">
											{label}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{series.map((bar) => (
									<tr key={bar.key}>
										<th scope="row">{bar.label}</th>
										<td>{full.format(bar.value)}</td>
										{labels.map((label) => (
											<td key={label}>{full.format(part(bar, label))}</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
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
			<div className={cn(CHART_BODY, BODY)}>
				<div className={cn(CHART_GRID, CHART_TICK_LANE, AXIS)}>
					{Array.from({ length: BANDS }, (_, index) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: a band is its index
							key={index}
							className={cn(
								chartBand({ kind: "axis", rule: band(index) }),
								AXIS_BAND,
							)}
						>
							<span className={cn(lineBox({ role: "meta" }), LINE, BAR, TICK)}>
								<span className={cn(skeleton({ kind: "line" }), BAR)} />
							</span>
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
