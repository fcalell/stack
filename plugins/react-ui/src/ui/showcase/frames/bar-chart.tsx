import { BarChart, type BarSlots } from "../../components/bar-chart/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { queryOf, Wide } from "./layout-context.tsx";

// A day's figure, its parts by service when the chart stacks.
interface Day {
	day: string;
	value: number;
	parts?: Record<string, number>;
	at?: string;
}

const BAR: BarSlots<Day> = {
	key: (day) => day.day,
	label: (day) => day.day,
	value: (day) => day.value,
	parts: (day) => day.parts,
	at: (day) => day.at,
};

// Board 54's build minutes, one a day from Sep 3, the first and last day
// timed under their bars.
const MINUTES = [
	40, 60, 70, 50, 20, 10, 50, 70, 80, 60, 70, 20, 10, 60, 90, 80, 70, 100, 30,
	20, 70, 80, 110, 90, 80, 20, 10, 60, 70, 50,
];
const DAYS: Day[] = MINUTES.map((value, index) => {
	const day = new Date(Date.UTC(2026, 8, 3 + index)).toLocaleDateString("en", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
	const end = index === 0 || index === MINUTES.length - 1;
	return { day, value, at: end ? day : undefined };
});

const SERVICES = ["api", "web", "worker", "cron", "queue", "mail"];
// Board 54's requests by service, a week of days; `wide` stacks all six
// services, so every series mark stands.
const WEEK: Array<[string, number[]]> = [
	["Mon", [5000, 3000, 1000, 600, 400, 200]],
	["Tue", [6000, 3000, 1000, 500, 300, 200]],
	["Wed", [6000, 4000, 1000, 700, 400, 300]],
	["Thu", [5000, 3000, 2000, 600, 300, 200]],
	["Fri", [4000, 3000, 1000, 500, 300, 100]],
	["Sat", [2000, 1000, 1000, 300, 200, 100]],
	["Sun", [2000, 1000, 0, 200, 100, 100]],
];

function byService(keys: readonly string[]): Day[] {
	return WEEK.map(([day, values]) => {
		const shown = values.slice(0, keys.length);
		return {
			day,
			value: shown.reduce((sum, value) => sum + value, 0),
			parts: Object.fromEntries(
				keys.map((key, index) => [key, shown[index] ?? 0]),
			),
			at: day,
		};
	});
}

// A week with nothing yet: no ticks over the empty plot, the table's value
// column named by the label for want of a unit.
const QUIET: Day[] = WEEK.map(([day]) => ({ day, value: 0, at: day }));

// Open flags per review round: a level, so the chart's head reads the last
// round and its ticks stand on whole numbers.
const FLAGS = [2, 3, 1].map(
	(value, index): Day => ({
		day: `Round ${index + 1}`,
		value,
		at: `R${index + 1}`,
	}),
);

// A `CHART_FILL.series` cell past the first stacks by service (past the
// third, by six of them); a `CHART_BAND` cell at rest adds a week of zeros;
// every other cell draws the one series. Each chart takes a query in the
// frame's state: its loaded boxes in skeleton, its failure, its empty form.
export function drawBarChart(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const wide = ["pink", "green", "red"].some((hue) => cell.endsWith(hue));
	const stacked = wide || ["violet", "amber"].some((hue) => cell.endsWith(hue));
	const quiet = cell.startsWith("CHART_BAND") && frame.state === "rest";
	const keys = SERVICES.slice(0, wide ? SERVICES.length : 3);
	return (
		<Wide>
			{stacked ? (
				<Section title="Requests" description="Per day this week, by service.">
					<BarChart
						label="Requests per day this week, by service"
						keys={keys}
						query={queryOf(frame.state, byService(keys))}
						sentence="Requests did not load."
						empty={{ sentence: "No request reached a service this week." }}
						bar={BAR}
						unit="requests"
					/>
				</Section>
			) : (
				<Section title="Build minutes" description="Per day, the last 30 days.">
					<BarChart
						label="Build minutes per day, Sep 3 to Oct 2"
						query={queryOf(frame.state, DAYS)}
						sentence="Build minutes did not load."
						empty={{ sentence: "No build ran in the last 30 days." }}
						bar={BAR}
						unit="minutes"
					/>
				</Section>
			)}
			{quiet ? (
				<Section title="Cron runs" description="Per day this week.">
					<BarChart label="Cron runs" items={QUIET} bar={BAR} />
				</Section>
			) : null}
			{quiet ? (
				<Section title="Open flags" description="At the end of each round.">
					<BarChart
						label="Open flags per round"
						items={FLAGS}
						bar={BAR}
						unit={{ one: "flag", other: "flags" }}
						level
					/>
				</Section>
			) : null}
		</Wide>
	);
}
