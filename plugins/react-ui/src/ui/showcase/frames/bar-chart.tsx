import type { BarSeries } from "@fcalell/ui-core/descriptors";
import { BarChart } from "../../components/bar-chart/index.tsx";
import { Section } from "../../components/section/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { Wide } from "./layout-context.tsx";

// Board 54's build minutes, one a day from Sep 3, the first and last day
// timed under their bars.
const MINUTES = [
	40, 60, 70, 50, 20, 10, 50, 70, 80, 60, 70, 20, 10, 60, 90, 80, 70, 100, 30,
	20, 70, 80, 110, 90, 80, 20, 10, 60, 70, 50,
];
const DAYS: BarSeries[] = MINUTES.map((value, index) => {
	const day = new Date(Date.UTC(2026, 8, 3 + index)).toLocaleDateString("en", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
	const end = index === 0 || index === MINUTES.length - 1;
	return { label: day, value, at: end ? day : undefined };
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

function byService(keys: readonly string[]): BarSeries[] {
	return WEEK.map(([day, values]) => {
		const shown = values.slice(0, keys.length);
		return {
			label: day,
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
const QUIET: BarSeries[] = WEEK.map(([day]) => ({
	label: day,
	value: 0,
	at: day,
}));

// A `CHART_FILL.series` cell past the first stacks by service (past the
// third, by six of them); a `CHART_BAND` cell adds an empty week; every
// other cell draws the one series; loading draws the loaded boxes.
export function drawBarChart(frame: ShowcaseFrame) {
	const cell = frame.cell.name;
	const wide = ["pink", "green", "red"].some((hue) => cell.endsWith(hue));
	const stacked = wide || ["violet", "amber"].some((hue) => cell.endsWith(hue));
	const loading = frame.state === "loading";
	const empty = cell.startsWith("CHART_BAND") && !loading;
	const keys = SERVICES.slice(0, wide ? SERVICES.length : 3);
	return (
		<Wide>
			{stacked ? (
				<Section title="Requests" description="Per day this week, by service.">
					<BarChart
						label="Requests per day this week, by service"
						keys={keys}
						series={byService(keys)}
						unit="requests"
						loading={loading}
					/>
				</Section>
			) : (
				<Section title="Build minutes" description="Per day, the last 30 days.">
					<BarChart
						label="Build minutes per day, Sep 3 to Oct 2"
						series={DAYS}
						unit="minutes"
						loading={loading}
					/>
				</Section>
			)}
			{empty ? (
				<Section title="Cron runs" description="Per day this week.">
					<BarChart label="Cron runs" series={QUIET} />
				</Section>
			) : null}
		</Wide>
	);
}
