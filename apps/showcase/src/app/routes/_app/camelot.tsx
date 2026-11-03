import {
	BarChart,
	type BarSlots,
} from "@fcalell/plugin-react-ui/components/bar-chart";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { createFileRoute } from "@tanstack/react-router";
import type { AppRouter } from "../../../../.stack/worker";
import { orpc } from "../../lib/api.ts";

export const Route = createFileRoute("/_app/camelot")({
	component: Camelot,
});

type Key = AppRouter["camelot"]["keys"]["__output"][number];
type Hour = AppRouter["camelot"]["hours"]["__output"][number];

// A bucket is named by its key: every bar carries its name when the names fit
// under the plot and every second, third... one when they would touch.
const KEY: BarSlots<Key> = {
	key: (key) => key.key,
	value: (key) => key.count,
	label: (key) => key.key,
};

const HOUR: BarSlots<Hour> = {
	key: (hour) => hour.hour,
	value: (hour) => hour.count,
	label: (hour) => hour.hour,
};

// Categories, not a timeline: the library by Camelot key, and by hour of the
// day it was played.
function Camelot() {
	const keys = orpc.camelot.keys.read();
	const hours = orpc.camelot.hours.read();
	return (
		<Pane title="Keys">
			<Section
				title="By key"
				description="Tracks per Camelot key, 1A to 12B."
				read={keys}
			>
				<BarChart
					label="Tracks per Camelot key"
					items={keys}
					bar={KEY}
					unit="tracks"
				/>
			</Section>
			<Section
				title="By hour"
				description="Plays per time of day."
				read={hours}
			>
				<BarChart
					label="Plays per time of day"
					items={hours}
					bar={HOUR}
					unit="plays"
				/>
			</Section>
		</Pane>
	);
}
