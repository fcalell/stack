import { BarChart, type BarSlots } from "../../components/bar-chart/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { isFirstCell, type ShowcaseFrame } from "../cells.ts";
import { endedAt, itemsAt } from "../waiting.ts";
import { Wide } from "./layout-context.tsx";
import { isPaint } from "./painted.tsx";

// A day's figure, its parts by service when the chart stacks.
interface Day {
	day: string;
	value: number;
	parts?: Record<string, number>;
	at?: string;
}

const BAR: BarSlots<Day> = {
	key: (day) => day.day,
	value: (day) => day.value,
	parts: (day) => day.parts,
	at: (day) => day.at,
};

// Board 54's build minutes, one a day from Sep 3, each day timed: the time
// line draws the first and the last, and the days between as its width holds
// them.
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
	return { day, value, at: day };
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

// Open flags per review round: a level, so the chart's head reads the rounds'
// span ("1–3 flags") and its ticks stand on whole numbers.
const FLAGS = [2, 3, 1].map(
	(value, index): Day => ({
		day: `Round ${index + 1}`,
		value,
		at: `R${index + 1}`,
	}),
);

// An hour's time, "07:00".
const hour = (at: number) => `${String(at).padStart(2, "0")}:00`;

// A room's temperature every two hours: `°C` never sums, so the chart is a
// level with no `level` given: its head reads the day's span, 18.2–21°C, and
// each reading is a dot against an axis around the span (18–22), not a bar
// from zero.
const READINGS = [
	18.4, 18.2, 18.3, 18.9, 19.6, 20.2, 20.8, 21, 20.7, 20.5, 20.1, 19.8,
].map(
	(value, index): Day => ({ day: hour(index * 2), value, at: hour(index * 2) }),
);

// The same room each hour since midnight, to 15:00: sixteen readings, the
// swing of 18.3–21.2°C read against its own range, and the hours between
// the ends labelled as the width holds them.
const HOURLY = [
	18.6, 18.5, 18.4, 18.3, 18.3, 18.4, 18.7, 19.2, 19.8, 20.3, 20.7, 21, 21.2,
	21.1, 20.9, 20.6,
].map((value, index): Day => ({ day: hour(index), value, at: hour(index) }));

// The room's humidity each hour since midnight: a share, `%`, is a level too.
const HUMIDITY = [
	48, 49, 50, 51, 52, 53, 55, 57, 58, 56, 54, 52, 50, 49, 47, 46,
].map((value, index): Day => ({ day: hour(index), value, at: hour(index) }));

// The same room just past midnight: one reading, which is the room's own and
// its record says, so the head draws none; the bar stands in the first of the
// plot's slots with its time under it.
const MIDNIGHT: Day[] = [{ day: "00:00", value: 18.6, at: "00:00" }];

// Spend per day in dollars, a total of $30.97: the head reads the cents and
// the axis whole dollars.
const SPEND = [3.2, 4.15, 5.1, 6, 4.27, 3.5, 4.75].map(
	(value, index): Day => ({
		day: WEEK[index]?.[0] ?? "",
		value,
		at: WEEK[index]?.[0],
	}),
);

// A `CHART_FILL.series` cell past the first stacks by service (past the
// third, by six of them); a `CHART_BAND` cell at rest adds a week of zeros,
// a week of spend in dollars, a day of temperatures, the same room each hour
// since midnight, its humidity, its first hour alone and the open flags;
// every other cell draws the one series. Each chart reads in a Section in the
// frame's state: its painted form, its loaded one; a `PAINT` cell draws the
// chart loaded beside the same chart painted.
function Chart(props: {
	id: string;
	state: ShowcaseFrame["state"];
	stacked: boolean;
	keys: readonly string[];
}) {
	const { id, state, keys } = props;
	const requests = itemsAt(`${id}/requests`, state, byService(keys));
	const minutes = itemsAt(`${id}/minutes`, state, DAYS);
	if (props.stacked)
		return (
			<Section
				title="Requests"
				description="Per day this week, by service."
				read={requests}
			>
				<BarChart
					label="Requests per day this week, by service"
					keys={keys}
					items={requests}
					bar={BAR}
					unit="requests"
				/>
			</Section>
		);
	return (
		<Section
			title="Build minutes"
			description="Per day, the last 30 days."
			read={minutes}
		>
			<BarChart
				label="Build minutes per day, Sep 3 to Oct 2"
				items={minutes}
				bar={BAR}
				unit="minutes"
			/>
		</Section>
	);
}

// The empty and error states, on the first cell, draw the minutes over a read
// that answers none, fails and answers not found, in Sections that hold none
// of them: the chart draws its own form.
export function drawBarChart(frame: ShowcaseFrame) {
	if (frame.state === "empty" || frame.state === "error")
		return isFirstCell(frame) ? (
			<Wide>
				{endedAt<Day>(frame.id, frame.state).map(({ title, items }) => (
					<Section key={title} title={title}>
						<BarChart
							label={`Build minutes, ${title}`}
							items={items}
							bar={BAR}
							unit="minutes"
						/>
					</Section>
				))}
			</Wide>
		) : undefined;
	const cell = frame.cell.name;
	const wide = ["pink", "green", "red"].some((hue) => cell.endsWith(hue));
	const stacked = wide || ["violet", "amber"].some((hue) => cell.endsWith(hue));
	const quiet = cell.startsWith("CHART_BAND") && frame.state === "rest";
	const keys = SERVICES.slice(0, wide ? SERVICES.length : 3);
	if (isPaint(frame)) {
		if (frame.state !== "rest") return undefined;
		return (
			<Wide>
				<Chart id={`${frame.id}/loaded`} state="rest" stacked keys={keys} />
				<Chart id={`${frame.id}/painted`} state="loading" stacked keys={keys} />
				<Chart
					id={`${frame.id}/plain`}
					state="rest"
					stacked={false}
					keys={keys}
				/>
				<Chart
					id={`${frame.id}/plain-painted`}
					state="loading"
					stacked={false}
					keys={keys}
				/>
			</Wide>
		);
	}
	return (
		<Wide>
			<Chart id={frame.id} state={frame.state} stacked={stacked} keys={keys} />
			{quiet ? (
				<Section title="Cron runs" description="Per day this week.">
					<BarChart label="Cron runs" items={QUIET} bar={BAR} />
				</Section>
			) : null}
			{quiet ? (
				<Section title="Spend" description="Per day this week.">
					<BarChart
						label="Spend per day this week"
						items={SPEND}
						bar={BAR}
						unit={{ currency: "USD" }}
					/>
				</Section>
			) : null}
			{quiet ? (
				<Section title="Temperature" description="Every two hours today.">
					<BarChart
						label="Temperature every two hours today"
						items={READINGS}
						bar={BAR}
						unit="°C"
					/>
				</Section>
			) : null}
			{quiet ? (
				<Section title="Temperature" description="Each hour since midnight.">
					<BarChart
						label="Temperature each hour since midnight"
						items={HOURLY}
						bar={BAR}
						unit="°C"
					/>
				</Section>
			) : null}
			{quiet ? (
				<Section title="Humidity" description="Each hour since midnight.">
					<BarChart
						label="Humidity each hour since midnight"
						items={HUMIDITY}
						bar={BAR}
						unit="%"
					/>
				</Section>
			) : null}
			{quiet ? (
				<Section title="Temperature" description="Just past midnight.">
					<BarChart
						label="Temperature just past midnight"
						items={MIDNIGHT}
						bar={BAR}
						unit="°C"
					/>
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
