import { FormField } from "../../components/form-field/index.tsx";
import { Picker } from "../../components/picker/index.tsx";
import { HeldSegments } from "../../components/picker/segments.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { waitingText } from "../waiting.ts";
import { beside, isPaint } from "./painted.tsx";

const change = () => {};
const PERIODS = [
	{ value: "day", label: "Day" },
	{ value: "week", label: "Week" },
	{ value: "month", label: "Month" },
	{ value: "year", label: "Year" },
];
const SECTIONS = [
	{ label: "Overview", href: "/acme/settings" },
	{ label: "Members", href: "/acme/settings/members" },
	{ label: "Portal", href: "/acme/settings/portal" },
];
// A place's tabs that do not fit 320: the track scrolls and fades at its end.
const MANY = [
	{ label: "Variables", href: "/acme/destinations/ga4/variables" },
	{ label: "Mappings", href: "/acme/destinations/ga4/mappings" },
	{ label: "Projects", href: "/acme/destinations/ga4/projects" },
	{ label: "Notes", href: "/acme/destinations/ga4/notes" },
	{ label: "History", href: "/acme/destinations/ga4/history" },
];
const RANGES = [
	{ value: "7d", label: "7 days" },
	{ value: "30d", label: "30 days" },
	{ value: "90d", label: "90 days" },
];

// Board 41's four periods, Week chosen; the frame's state forces every
// segment, so the idle ones draw it and the chosen one its own; loading, the
// value waits and the track paints. Under it a FormField names a range switch
// with its label and describes it, and the tabs of a place are links, the one
// the location selects marked. `PAINT.kind.control` draws the switch beside its
// painted form.
export function drawSegments(frame: ShowcaseFrame) {
	if (frame.state === "error") return undefined;
	if (isPaint(frame))
		return beside(
			frame,
			<Picker
				fit="segments"
				label="Period"
				options={PERIODS}
				value="week"
				onChange={change}
			/>,
			<HeldSegments
				label="Period"
				options={PERIODS}
				value="week"
				onChange={change}
				painted
			/>,
		);
	return (
		<div className="flex flex-col items-stretch gap-section min-w-0">
			<Picker
				fit="segments"
				label="Period"
				options={PERIODS}
				value={frame.state === "loading" ? waitingText : "week"}
				onChange={change}
			/>
			<Picker fit="segments" options={SECTIONS} />
			<Picker fit="segments" options={MANY} />
			<FormField
				label="Range"
				description="API calls by day."
				segments={{ options: RANGES, value: "30d", onChange: change }}
			/>
		</div>
	);
}
