import { preload, useMutation } from "@fcalell/plugin-api/tanstack-query";
import {
	BarChart,
	type BarSlots,
} from "@fcalell/plugin-react-ui/components/bar-chart";
import { Comparison } from "@fcalell/plugin-react-ui/components/comparison";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { confirm } from "@fcalell/plugin-react-ui/lib/confirm";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import { createFileRoute } from "@tanstack/react-router";
import type { AppRouter } from "../../../../.stack/worker";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/usage")({
	loader: () =>
		preload(
			orpc.usage.meters.read(),
			orpc.usage.requests.read(),
			orpc.usage.minutes.read(),
			orpc.usage.cron.read(),
			orpc.usage.plan.read(),
		),
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

// Each section reads its own query and holds it as its frame, so a failure
// stays in its section.
function Usage() {
	const meters = orpc.usage.meters.read();
	const requests = orpc.usage.requests.read();
	const minutes = orpc.usage.minutes.read();
	const cron = orpc.usage.cron.read();
	const plan = orpc.usage.plan.read();
	const upgrade = useMutation(orpc.usage.upgrade.mutationOptions());
	return (
		<Place>
			<Pane title="Usage">
				<Section
					title="This month"
					description="Team plan, resets on Oct 31."
					read={meters}
					failed="The meters did not load."
					empty={{
						title: "No limits",
						sentence: "This plan meters nothing.",
					}}
				>
					<Group
						list={{
							items: meters,
							meter: {
								key: (meter) => meter.label,
								label: (meter) => meter.label,
								value: (meter) => meter.value,
								max: (meter) => meter.max,
								meta: (meter) => meter.meta,
							},
						}}
					/>
				</Section>
				<Section
					title="Requests"
					description="Per day this week, by project."
					read={requests}
					failed="Requests did not load."
					empty={{ sentence: "No request reached a project this week." }}
				>
					<BarChart
						label="Requests per day this week, by project"
						keys={PROJECTS}
						items={requests}
						bar={BAR}
						unit="requests"
					/>
				</Section>
				<Section
					title="Build minutes"
					description="Per day, the last 30 days."
					read={minutes}
					failed="Build minutes did not load."
					empty={{ sentence: "No build ran in the last 30 days." }}
				>
					<BarChart
						label="Build minutes per day, Sep 3 to Oct 2"
						items={minutes}
						bar={BAR}
						unit="minutes"
					/>
				</Section>
				<Section
					title="Cron runs"
					description="Per day this week."
					read={cron}
					failed="Cron runs did not load."
					empty={{ sentence: "Nothing ran on a schedule this week." }}
				>
					<BarChart
						label="Cron runs per day this week"
						items={cron}
						bar={BAR}
						unit="runs"
					/>
				</Section>
				<Section
					title="Plan"
					description="What moving to Business changes."
					read={plan}
					failed="The plan change did not load."
					empty={{ sentence: "Moving to Business changes nothing." }}
					act={{
						label: "Move to Business",
						onAct: () =>
							confirm({
								title: "Move to Business?",
								sentence:
									"The new limits apply at once. You are billed $480 a month from Oct 14.",
								act: {
									label: "Move to Business",
									failed: "The plan was not changed.",
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
						items={plan}
						row={{
							key: (fact) => fact.label,
							label: (fact) => fact.label,
							values: (fact) => fact.values,
						}}
					/>
				</Section>
			</Pane>
		</Place>
	);
}
