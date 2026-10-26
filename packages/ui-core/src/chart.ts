// What a BarChart decides before it draws, free of any framework: both
// platforms read this one scale and head instead of a copy each.

import { leadingOf } from "./scales.ts";
import { CHART_SERIES, type Density, SIZE_PX } from "./tokens.ts";

// Four bands, the last one's bottom the baseline.
export const BANDS = 4;

// How far the top tick, centred on the plot's top edge, reaches above it:
// half a meta line. The web reads it as `1lh / 2` of the body's meta line;
// the phone, with no `lh` unit, as this number of px.
export function tickReach(density: Density): number {
	return leadingOf(density, "meta") / 2;
}

// How far a fact of a Pane's record head that acts reaches past the facts line's
// text line above and below it: its hit box stands at the target height and
// the line at the meta line's, so the line keeps one height whichever kinds
// of fact it holds. The web reads it as `(target - 1lh) / 2`; the phone, with
// no `lh` unit, as this number of px.
export function factReach(density: Density): number {
	return (SIZE_PX[density].target - leadingOf(density, "meta")) / 2;
}

export interface ChartScale {
	// One band's value.
	readonly step: number;
	// The bands drawn: `BANDS`, or fewer for a small whole-number chart.
	readonly bands: number;
	// The axis top, `bands` steps over zero.
	readonly top: number;
}

// The axis scale: four even steps over the largest bar (`peaks`, each bar's
// stacked height), each step the first whole multiple of its own magnitude.
// When every figure the chart draws (`figures`, the bars' values and parts)
// is a whole number and that step falls under 1, the step is 1 and the bands
// are the peak rounded up, so no tick reads 0.8 of a flag and none stands
// above what the bars reach.
export function chartScale(
	peaks: readonly number[],
	figures: readonly number[] = peaks,
): ChartScale {
	const peak = Math.max(0, ...peaks);
	const step = peak <= 0 ? 1 : stepOf(peak);
	if (step < 1 && figures.every(Number.isInteger)) {
		const bands = Math.max(1, Math.ceil(peak));
		return { step: 1, bands, top: bands };
	}
	return { step, bands: BANDS, top: step * BANDS };
}

function stepOf(peak: number): number {
	const raw = peak / BANDS;
	const magnitude = 10 ** Math.floor(Math.log10(raw));
	return Math.ceil(raw / magnitude) * magnitude;
}

// What a chart's values count: one word (`requests`), the word at one and at
// every other count (`{ one: "flag", other: "flags" }`) for a unit that takes
// a plural, or money (`{ currency: "USD" }`), whose figures carry the symbol
// and no word follows.
export type ChartUnit =
	| string
	| { readonly one: string; readonly other: string }
	| { readonly currency: string };

// The currency a unit counts in, none for a word.
export function currencyOf(unit: ChartUnit | undefined): string | undefined {
	return typeof unit === "object" && "currency" in unit
		? unit.currency
		: undefined;
}

// The unit's word at a count, so the head ("1 flag") agrees with the figure;
// none for a currency.
export function unitOf(unit: ChartUnit, count: number): string | undefined {
	if (typeof unit === "string") return unit;
	if ("currency" in unit) return undefined;
	return count === 1 ? unit.one : unit.other;
}

// A unit whose figures never add up across bars: a share (`%`, `‰`) or a
// temperature (`°C`, `°F`, any `°`). A chart counting in one is a level
// whatever its `level` leaves unsaid, so a day of readings never heads with
// their sum.
export function levelUnit(unit: ChartUnit | undefined): boolean {
	if (typeof unit !== "string") return false;
	const word = unit.trim();
	return word === "%" || word === "‰" || word.startsWith("°");
}

// The symbol a head figure carries against itself, as Intl writes "21°C" and
// "40%": a share's or a temperature's. A word ("1–3 flags") stands apart.
export function unitSymbol(unit: ChartUnit | undefined): string | undefined {
	return typeof unit === "string" && levelUnit(unit) ? unit.trim() : undefined;
}

interface HeadBar {
	readonly value: number;
	readonly parts?: Readonly<Record<string, number>>;
}

// A figure of the head: one value (`low` and `high` the same), or a level's
// span over the bars, its lowest to its highest.
export interface ChartSpan {
	readonly low: number;
	readonly high: number;
}

export interface ChartHead {
	// The head's figure.
	readonly total: ChartSpan;
	// Each key's figure, in the keys' order.
	readonly parts: readonly ChartSpan[];
}

const one = (value: number): ChartSpan => ({ low: value, high: value });

function spanOf(values: readonly number[]): ChartSpan {
	if (values.length === 0) return one(0);
	return { low: Math.min(...values), high: Math.max(...values) };
}

// The figures a chart's head draws: the sum of its bars (a flow, counts per
// day), or with `level` their span, the lowest bar to the highest, and each
// key's span the same way (a level, a reading each hour, open flags per
// round). A level's sum means nothing, and its last bar is the thing's own
// reading, which its record already says: the span is what only the chart
// knows, and the bars, standing on zero, flatten it.
export function chartHead(
	series: readonly HeadBar[],
	keys: readonly string[],
	level: boolean,
): ChartHead {
	const part = (bar: HeadBar, key: string) => bar.parts?.[key] ?? 0;
	if (level)
		return {
			total: spanOf(series.map((bar) => bar.value)),
			parts: keys.map((key) => spanOf(series.map((bar) => part(bar, key)))),
		};
	return {
		total: one(series.reduce((sum, bar) => sum + bar.value, 0)),
		parts: keys.map((key) =>
			one(series.reduce((sum, bar) => sum + part(bar, key), 0)),
		),
	};
}

// A head figure's text: the one value, or the span's ends an en dash apart
// ("18.2–21"), each written by `write`.
export function spanText(
	span: ChartSpan,
	write: (value: number) => string,
): string {
	const high = write(span.high);
	const low = write(span.low);
	return low === high ? high : `${low}–${high}`;
}

// The unit's word after a head figure: at the one value, and the plural after
// a span ("1–3 flags"); none for a currency or a symbol, which the figure
// carries.
export function spanUnit(unit: ChartUnit, span: ChartSpan): string | undefined {
	if (unitSymbol(unit)) return undefined;
	if (span.low !== span.high && typeof unit === "object" && "other" in unit)
		return unit.other;
	return unitOf(unit, span.high);
}

// How many clear lines (the 1 px gaps between a stack's parts) each part of a
// stack stands over: one for each part under it that draws. A part of 0 draws
// nothing and takes no gap, so the bars of a chart with series at zero stand on
// the baseline.
export function lifts(values: readonly number[]): number[] {
	let drawn = 0;
	return values.map((value) => {
		const under = drawn;
		if (value > 0) drawn += 1;
		return under;
	});
}

export function band(index: number, bands: number) {
	return index === bands - 1 ? "both" : "top";
}

// A key's series mark by its place in the keys.
export function mark(at: number) {
	return CHART_SERIES[at % CHART_SERIES.length] ?? CHART_SERIES[0];
}

// One bar, read from its item.
export interface Bar {
	key: string;
	value: number;
	parts?: Readonly<Record<string, number>>;
}
