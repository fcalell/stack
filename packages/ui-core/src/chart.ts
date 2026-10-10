// What a BarChart decides before it draws, free of any framework: both
// platforms read this one scale and head instead of a copy each.

import { leadingOf } from "./scales.ts";
import { type Density, SIZE_PX } from "./tokens.ts";

// Four bands, the last one's bottom the baseline.
export const BANDS = 4;

// How far the top tick, centred on the plot's top edge, reaches above it:
// half a meta line. The web reads it as `1lh / 2` of the body's meta line;
// the phone, with no `lh` unit, as this number of px.
export function tickReach(density: Density): number {
	return leadingOf(density, "meta") / 2;
}

// How far a fact of an ItemHeader that acts reaches past the facts line's
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

interface HeadBar {
	readonly value: number;
	readonly parts?: Readonly<Record<string, number>>;
}

export interface ChartHead {
	// The head's figure.
	readonly total: number;
	// Each key's figure, in the keys' order.
	readonly parts: readonly number[];
}

// The figures a chart's head draws: the sum of its bars (a flow, counts per
// day), or with `level` the last bar's own value and parts (a level, open
// flags per round), never their sum.
export function chartHead(
	series: readonly HeadBar[],
	keys: readonly string[],
	level: boolean,
): ChartHead {
	const drawn = level ? series.slice(-1) : series;
	return {
		total: drawn.reduce((sum, bar) => sum + bar.value, 0),
		parts: keys.map((key) =>
			drawn.reduce((sum, bar) => sum + (bar.parts?.[key] ?? 0), 0),
		),
	};
}
