// What a BarChart decides before it draws, free of any framework: both
// platforms read this one scale and head instead of a copy each.

import { leadingOf } from "./scales.ts";
import { CHART_SERIES, type Density, SIZE_PX } from "./tokens.ts";

// Four bands, the last one's bottom the baseline.
export const BANDS = 4;

// The fewest slots a plot is parted into: a week's days. A series shorter
// than that (a day's first hours near midnight, a run's first rounds) stands
// in the first of them, each bar in a slot as wide as it would have among
// seven, the rest of the plot its gridlines alone, so a lone bar is never a
// slab across the plot. A series of more fills the plot, one slot a bar.
export const CHART_SLOTS = 7;

export function chartSlots(bars: number): number {
	return Math.max(bars, CHART_SLOTS);
}

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
	// The axis top, `bands` steps over the floor.
	readonly top: number;
	// The baseline's value: zero for a flow, whose bar's length is its value;
	// for a level, a step under its lowest reading (`levelScale`).
	readonly floor: number;
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
		return { step: 1, bands, top: bands, floor: 0 };
	}
	return { step, bands: BANDS, top: step * BANDS, floor: 0 };
}

function stepOf(peak: number): number {
	return niceOf(peak / BANDS);
}

const magnitudeOf = (value: number) => 10 ** Math.floor(Math.log10(value));

// The first whole multiple of a value's own magnitude at or over it.
function niceOf(raw: number): number {
	const magnitude = magnitudeOf(raw);
	return tidy(Math.ceil(raw / magnitude) * magnitude);
}

// A sum of decimal steps, rid of the float's tail (17.900000000000002).
const tidy = (value: number) => Number(value.toPrecision(12));

// The axis of a level (a reading each hour, a share): `BANDS` even steps
// around its readings, not over zero, since a level's bars from zero stand
// near one height and flatten the swing the chart is for (a day of 18.2–21°C
// on a 0–24 axis). The step is the first whole multiple of its magnitude that
// spans the readings in one band fewer than are drawn; the floor is a whole
// step under the lowest reading and the top over the highest, so neither
// reading stands on the plot's edge, the readings centred between them as the
// steps allow. Readings that never go under zero keep a floor at zero or over
// it. A level of whole numbers (open flags) steps by 1 at least, so no tick
// reads a part of one. A flat series (one reading) reads against a step a
// tenth of its own magnitude.
export function levelScale(figures: readonly number[]): ChartScale {
	if (figures.length === 0) return chartScale([]);
	const low = Math.min(...figures);
	const high = Math.max(...figures);
	const span = high - low;
	const whole = figures.every(Number.isInteger);
	const flat = Math.max(Math.abs(high), Math.abs(low)) || 1;
	let step = span > 0 ? niceOf(span / (BANDS - 1)) : magnitudeOf(flat) / 10;
	if (whole && step < 1) step = 1;
	for (;;) {
		const middle = (low + high) / 2;
		// The floor is the whole step nearest the centred one; where that is
		// the lowest reading or over it, it drops a step.
		let floor = tidy(Math.round((middle - (BANDS * step) / 2) / step) * step);
		if (floor >= low) floor = tidy(floor - step);
		if (low >= 0 && floor < 0) floor = 0;
		const top = tidy(floor + BANDS * step);
		if (top > high) return { step, bands: BANDS, top, floor };
		step = tidy(step + magnitudeOf(step));
	}
}

// Where a value stands on its axis: its share of the floor-to-top run.
export function chartShare(
	value: number,
	scale: Pick<ChartScale, "floor" | "top">,
): number {
	const run = scale.top - scale.floor;
	return run > 0 ? (value - scale.floor) / run : 0;
}

// The strides a time line labels its bars at, finest first: each a multiple
// of the one before, so a time that stands at a wide stride stands at every
// narrower one, and the labels stay evenly spaced as more of them fit. Past
// the last, each doubles (a day's hours by 2, 6 and 12; a month's days by 6
// and 12).
const TIME_STRIDES = [1, 2, 6, 12];
const TIME_STRIDE_LAST = 12;

// A time stands where its room holds this many of the longest time's width:
// itself and a time's width clear, so no two times touch and a time next to
// the first or the last (which stand whole at the plot's edge) clears it.
export const TIME_ROOM = 2;

// The room a bar's time between the first and the last stands in, in slots:
// the widest stride it falls on (its index a multiple of it), short of the
// last bar where that stands nearer. The time draws when that room holds
// `TIME_ROOM` times the longest time, so each stride's times appear together
// as the plot widens. None for the first bar and the last, whose times always
// stand.
export function timeRoom(index: number, count: number): number | undefined {
	if (index <= 0 || index >= count - 1) return undefined;
	let stride = 1;
	for (let at = 1; ; at += 1) {
		const past = at - TIME_STRIDES.length + 1;
		const next = TIME_STRIDES[at] ?? TIME_STRIDE_LAST * 2 ** past;
		if (next > index || index % next !== 0) break;
		stride = next;
	}
	return Math.min(stride, count - 1 - index);
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

// A level's figure that is one reading, its span's ends written alike (one
// bar, a flat day): the thing's own reading, which its record already says, so
// the head draws no figure for it.
export function spanFlat(
	span: ChartSpan,
	write: (value: number) => string,
): boolean {
	return write(span.low) === write(span.high);
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
