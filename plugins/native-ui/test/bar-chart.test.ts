import assert from "node:assert/strict";
import { test } from "node:test";
import { rosterEntries } from "@fcalell/ui-core/roster";
import type { BarChartProps } from "../src/ui/components/bar-chart/index.tsx";

interface Day {
	day: string;
	value: number;
}

const DAYS: Day[] = [{ day: "Mon", value: 3 }];
const label = "Requests";
const bar = {
	key: (day: Day) => day.day,
	label: (day: Day) => day.day,
	value: (day: Day) => day.value,
};
const refetch = () => {};
const query = { data: DAYS, isPending: false, isError: false, refetch };
const sentence = "Requests did not load.";
const empty = { sentence: "No request this week." };

test("a BarChart takes a query with sentence and empty, or items, through bar", () => {
	const queried: BarChartProps<Day> = { label, query, sentence, empty, bar };
	const listed: BarChartProps<Day> = { label, items: DAYS, loading: true, bar };
	// @ts-expect-error: a query names what failed
	const unsaid: BarChartProps<Day> = { label, query, empty, bar };
	// @ts-expect-error: a query names its empty form
	const unfilled: BarChartProps<Day> = { label, query, sentence, bar };
	// @ts-expect-error: the bars are read through `bar`
	const unmapped: BarChartProps<Day> = { label, items: DAYS };
	// @ts-expect-error: the bars come from items, never a series
	const series: BarChartProps<Day> = { label, items: DAYS, bar, series: [] };
	assert.ok([queried, listed, unsaid, unfilled, unmapped, series]);
});

test("the roster's BarChart takes data and lists its failed and empty states", () => {
	const entry = rosterEntries().find(([, name]) => name === "BarChart")?.[2];
	assert.ok(entry);
	for (const prop of ["query", "items", "bar", "sentence", "empty", "level"])
		assert.ok(entry.props.includes(prop), prop);
	assert.ok(!entry.props.includes("series"));
	assert.ok(entry.states.includes("error"));
	assert.ok(entry.states.includes("empty"));
});
