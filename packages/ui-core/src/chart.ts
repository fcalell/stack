// What a BarChart decides before it draws, free of any framework: both
// platforms read this one scale and head instead of a copy each.

// Four bands, the last one's bottom the baseline.
export const BANDS = 4;

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

// What a chart's values count: one word (`requests`), or the word at one and
// at every other count (`{ one: "flag", other: "flags" }`) for a unit that
// takes a plural.
export type ChartUnit =
	| string
	| { readonly one: string; readonly other: string };

// The unit's word at a count, so the head ("1 flag") agrees with the figure.
export function unitOf(unit: ChartUnit, count: number): string {
	if (typeof unit === "string") return unit;
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
