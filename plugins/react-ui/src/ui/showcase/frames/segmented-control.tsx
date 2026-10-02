import { FormField } from "../../components/form-field/index.tsx";
import { SegmentedControl } from "../../components/segmented-control/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";

const change = () => {};
const PERIODS = [
	{ value: "day", label: "Day" },
	{ value: "week", label: "Week" },
	{ value: "month", label: "Month" },
	{ value: "year", label: "Year" },
];
const RANGES = [
	{ value: "7d", label: "7 days" },
	{ value: "30d", label: "30 days" },
	{ value: "90d", label: "90 days" },
];

// Board 41's four periods, Week chosen; the frame's state forces every
// segment, so the idle ones draw it and the chosen one its own. Under it a
// FormField names a range switch with its label and describes it.
export function drawSegmentedControl(_frame: ShowcaseFrame) {
	return (
		<div className="flex flex-col items-start gap-sections">
			<SegmentedControl
				label="Period"
				options={PERIODS}
				value="week"
				onChange={change}
			/>
			<FormField label="Range" description="API calls by day.">
				<SegmentedControl
					label="Range"
					options={RANGES}
					value="30d"
					onChange={change}
				/>
			</FormField>
		</div>
	);
}
