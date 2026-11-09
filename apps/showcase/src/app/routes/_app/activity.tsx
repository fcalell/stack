import {
	BarChart,
	type BarSlots,
} from "@fcalell/plugin-react-ui/components/bar-chart";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { createFileRoute } from "@tanstack/react-router";
import type { AppRouter } from "../../../../.stack/worker";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/activity")({
	component: Activity,
});

type Week = AppRouter["activity"]["weeks"]["__output"][number];
type Hour = AppRouter["activity"]["hours"]["__output"][number];

// A bucket is named by its week: every bar carries its name when the names fit
// under the plot and every second, third... one when they would touch.
const WEEK: BarSlots<Week> = {
	key: (week) => week.week,
	value: (week) => week.count,
	label: (week) => week.week,
};

const HOUR: BarSlots<Hour> = {
	key: (hour) => hour.hour,
	value: (hour) => hour.count,
	label: (hour) => hour.hour,
};

// Categories, not a timeline: the tasks closed by week, and by hour of the day.
function Activity() {
	const weeks = orpc.activity.weeks.read();
	const hours = orpc.activity.hours.read();
	return (
		<Pane>
			<Section
				title="By week"
				description="Tasks closed per week, 1 to 24."
				read={weeks}
			>
				<BarChart
					label="Tasks closed per week"
					items={weeks}
					bar={WEEK}
					unit="tasks"
				/>
			</Section>
			<Section
				title="By hour"
				description="Tasks closed per time of day."
				read={hours}
			>
				<BarChart
					label="Tasks closed per time of day"
					items={hours}
					bar={HOUR}
					unit="tasks"
				/>
			</Section>
		</Pane>
	);
}
