import { BarChart, type BarSlots } from "../../components/bar-chart/index.tsx";
import { Comparison } from "../../components/comparison/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { List } from "../../components/list/index.tsx";
import type { MeterProps } from "../../components/meter/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { confirm } from "../../lib/confirm.ts";
import { toast } from "../../lib/toast.ts";
import { settle, useFixture } from "./here.ts";

// A day's figure, its parts by project when the chart stacks.
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

// Build minutes a day, the last 30 days, the first and last day timed.
const MINUTES = [
	140, 160, 170, 150, 120, 110, 150, 170, 180, 160, 170, 120, 110, 160, 190,
	180, 170, 200, 130, 120, 170, 180, 210, 190, 180, 120, 110, 160, 170, 150,
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

// Requests a day this week, by project.
const PROJECTS = ["acme-web", "acme-api", "acme-docs"];
const WEEK: Array<[string, number[]]> = [
	["Mon", [52_000, 31_000, 9_000]],
	["Tue", [61_000, 33_000, 8_000]],
	["Wed", [64_000, 41_000, 11_000]],
	["Thu", [58_000, 36_000, 14_000]],
	["Fri", [47_000, 30_000, 7_000]],
	["Sat", [21_000, 12_000, 4_000]],
	["Sun", [19_000, 10_000, 3_000]],
];
const REQUESTS: Day[] = WEEK.map(([day, values]) => ({
	day,
	value: values.reduce((sum, value) => sum + value, 0),
	parts: Object.fromEntries(
		PROJECTS.map((project, index) => [project, values[index] ?? 0]),
	),
	at: day,
}));

// What moving from Team to Business changes, a fact a row.
interface PlanFact {
	label: string;
	values: [string, string];
}

const PLAN_CHANGE: PlanFact[] = [
	{ label: "Requests", values: ["1M a month", "10M a month"] },
	{ label: "Build minutes", values: ["6,000 a month", "25,000 a month"] },
	{ label: "Storage", values: ["10 GB", "100 GB"] },
	{ label: "Audit log", values: ["Not included", "Kept 90 days"] },
	{ label: "Billed", values: ["$120 a month", "$480 a month, from Oct 14"] },
];

// This month's use against the plan: under, near and over its limits.
const METERS: MeterProps[] = [
	{
		label: "Requests",
		value: 412_000,
		max: 1_000_000,
		unit: "requests",
		meta: "412,000 of 1M requests",
	},
	{
		label: "Build minutes",
		value: 5_640,
		max: 6_000,
		unit: "minutes",
		meta: "5,640 of 6,000 minutes, 360 left",
	},
	{
		label: "Storage",
		value: 11.8,
		max: 10,
		unit: "GB",
		meta: "1.8 GB over, billed at the end of the month",
	},
];

// Cron runs a day this week: none ran.
const CRON_RUNS: Day[] = [];

const upgrade = () =>
	confirm({
		title: "Move to Business?",
		sentence:
			"The new limits apply at once. You are billed $480 a month from Oct 14.",
		act: {
			label: "Move to Business",
			onAct: async () => {
				await settle();
				toast("Acme is on Business", { state: "done" });
			},
		},
	});

// Each section reads its own query and its collection draws that query's
// states, so a failure stays in its section.
export function Usage() {
	const meters = useFixture(METERS);
	const requests = useFixture(REQUESTS);
	const minutes = useFixture(DAYS);
	const cron = useFixture(CRON_RUNS);
	const plan = useFixture(PLAN_CHANGE);
	return (
		<Place title="Usage">
			<Section title="This month" description="Team plan, resets on Oct 31.">
				<Group>
					<List
						query={meters}
						sentence="The meters did not load."
						empty={{
							title: "No limits",
							sentence: "This plan meters nothing.",
						}}
						meter={{
							key: (meter) => meter.label,
							label: (meter) => meter.label,
							value: (meter) => meter.value,
							max: (meter) => meter.max,
							unit: (meter) => meter.unit,
							meta: (meter) => meter.meta,
						}}
					/>
				</Group>
			</Section>
			<Section title="Requests" description="Per day this week, by project.">
				<BarChart
					label="Requests per day this week, by project"
					keys={PROJECTS}
					query={requests}
					sentence="Requests did not load."
					empty={{ sentence: "No request reached a project this week." }}
					bar={BAR}
					unit="requests"
				/>
			</Section>
			<Section title="Build minutes" description="Per day, the last 30 days.">
				<BarChart
					label="Build minutes per day, Sep 3 to Oct 2"
					query={minutes}
					sentence="Build minutes did not load."
					empty={{ sentence: "No build ran in the last 30 days." }}
					bar={BAR}
					unit="minutes"
				/>
			</Section>
			<Section title="Cron runs" description="Per day this week.">
				<BarChart
					label="Cron runs per day this week"
					query={cron}
					sentence="Cron runs did not load."
					empty={{ sentence: "Nothing ran on a schedule this week." }}
					bar={BAR}
					unit="runs"
				/>
			</Section>
			<Section
				title="Plan"
				description="What moving to Business changes."
				act={{ label: "Move to Business", onAct: upgrade }}
			>
				<Comparison
					label="Plan change"
					columns={["Team, now", "Business"]}
					query={plan}
					sentence="The plan change did not load."
					empty={{ sentence: "Moving to Business changes nothing." }}
					row={{
						key: (fact) => fact.label,
						label: (fact) => fact.label,
						values: (fact) => fact.values,
					}}
				/>
			</Section>
		</Place>
	);
}
