import type { BarSeries, ComparisonRow } from "@fcalell/ui-core/descriptors";
import { BarChart } from "../../components/bar-chart/index.tsx";
import { Comparison } from "../../components/comparison/index.tsx";
import { Group } from "../../components/group/index.tsx";
import { Meter, type MeterProps } from "../../components/meter/index.tsx";
import { Place } from "../../components/place/index.tsx";
import { QueryBoundary } from "../../components/query-boundary/index.tsx";
import { Section } from "../../components/section/index.tsx";
import { confirm } from "../../lib/confirm.ts";
import { toast } from "../../lib/toast.ts";
import { settle, useFixture } from "./here.ts";

// Build minutes a day, the last 30 days, the first and last day timed.
const MINUTES = [
	140, 160, 170, 150, 120, 110, 150, 170, 180, 160, 170, 120, 110, 160, 190,
	180, 170, 200, 130, 120, 170, 180, 210, 190, 180, 120, 110, 160, 170, 150,
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
const REQUESTS: BarSeries[] = WEEK.map(([day, values]) => ({
	label: day,
	value: values.reduce((sum, value) => sum + value, 0),
	parts: Object.fromEntries(
		PROJECTS.map((project, index) => [project, values[index] ?? 0]),
	),
	at: day,
}));

function change(label: string, current: string, next: string): ComparisonRow {
	return {
		label,
		cells: [
			{ label: "Team, now", value: current },
			{ label: "Business", value: next },
		],
	};
}

const PLAN_CHANGE: ComparisonRow[] = [
	change("Requests", "1M a month", "10M a month"),
	change("Build minutes", "6,000 a month", "25,000 a month"),
	change("Storage", "10 GB", "100 GB"),
	{
		...change("Audit log", "Not included", "Kept 90 days"),
		chips: [{ label: "New" }],
	},
	change("Billed", "$120 a month", "$480 a month, from Oct 14"),
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

const USAGE = {
	meters: METERS,
	minutes: DAYS,
	requests: REQUESTS,
	plan: PLAN_CHANGE,
};

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

// The page's sections over the usage, each body in its loading form until
// the usage lands.
function Sections(props: { usage?: typeof USAGE }) {
	const { usage } = props;
	return (
		<>
			<Section title="This month" description="Team plan, resets on Oct 31.">
				<Group>
					{(usage?.meters ?? METERS).map((meter) => (
						<Meter key={meter.label} {...meter} loading={!usage} />
					))}
				</Group>
			</Section>
			<Section title="Requests" description="Per day this week, by project.">
				<BarChart
					label="Requests per day this week, by project"
					keys={PROJECTS}
					series={usage?.requests ?? []}
					unit="requests"
					loading={!usage}
				/>
			</Section>
			<Section title="Build minutes" description="Per day, the last 30 days.">
				<BarChart
					label="Build minutes per day, Sep 3 to Oct 2"
					series={usage?.minutes ?? []}
					unit="minutes"
					loading={!usage}
				/>
			</Section>
			<Section
				title="Plan"
				description="What moving to Business changes."
				act={{ label: "Move to Business", onAct: upgrade }}
			>
				<Comparison
					label="Plan change"
					rows={usage?.plan ?? []}
					loading={!usage}
				/>
			</Section>
		</>
	);
}

// One query answers the page: one boundary, so a failure is one frame with
// one Retry.
export function Usage() {
	const query = useFixture(USAGE);
	return (
		<Place title="Usage">
			<QueryBoundary
				query={query}
				sentence="Usage did not load."
				loading={<Sections />}
			>
				{(usage) => <Sections usage={usage} />}
			</QueryBoundary>
		</Place>
	);
}
