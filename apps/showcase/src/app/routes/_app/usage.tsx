import { useMutation, useQuery } from "@fcalell/plugin-api/tanstack-query";
import {
	BarChart,
	type BarSlots,
} from "@fcalell/plugin-react-ui/components/bar-chart";
import { Comparison } from "@fcalell/plugin-react-ui/components/comparison";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { confirm } from "@fcalell/plugin-react-ui/lib/confirm";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import { createFileRoute } from "@tanstack/react-router";
import type { AppRouter } from "../../../../.stack/worker";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/usage")({
	component: Usage,
});

// A day's figure, its parts by project when the chart stacks.
type Day = AppRouter["usage"]["requests"]["__output"][number];

const BAR: BarSlots<Day> = {
	key: (day) => day.day,
	value: (day) => day.value,
	parts: (day) => day.parts,
	at: (day) => day.at,
};

// The projects a week's requests are split by.
const PROJECTS = ["acme-web", "acme-api", "acme-docs"];

// Each section reads its own query and its collection draws that query's
// states, so a failure stays in its section.
function Usage() {
	const meters = useQuery(orpc.usage.meters.queryOptions());
	const requests = useQuery(orpc.usage.requests.queryOptions());
	const minutes = useQuery(orpc.usage.minutes.queryOptions());
	const cron = useQuery(orpc.usage.cron.queryOptions());
	const plan = useQuery(orpc.usage.plan.queryOptions());
	const upgrade = useMutation(orpc.usage.upgrade.mutationOptions());
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
				act={{
					label: "Move to Business",
					onAct: () =>
						confirm({
							title: "Move to Business?",
							sentence:
								"The new limits apply at once. You are billed $480 a month from Oct 14.",
							act: {
								label: "Move to Business",
								onAct: async () => {
									await upgrade.mutateAsync();
									toast("Acme is on Business", { state: "done" });
								},
							},
						}),
				}}
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
