import type { BarChartProps } from "../src/ui/components/bar-chart/index.tsx";

interface Day {
	day: string;
	value: number;
}

const DAYS: Day[] = [{ day: "Mon", value: 3 }];
const label = "Requests";
const bar = {
	key: (day: Day) => day.day,
	value: (day: Day) => day.value,
};

// a BarChart takes items through bar
{
	const listed: BarChartProps<Day> = { label, items: DAYS, bar };
	// @ts-expect-error: the rows are items, never a query
	const queried: BarChartProps<Day> = { label, query: {}, bar };
	// @ts-expect-error: the bars are read through `bar`
	const unmapped: BarChartProps<Day> = { label, items: DAYS };
	// @ts-expect-error: the bars come from items, never a series
	const series: BarChartProps<Day> = { label, items: DAYS, bar, series: [] };
	void [listed, queried, unmapped, series];
}
