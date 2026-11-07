import { type ReactNode, useEffect, useRef } from "react";
import { FormField } from "../../components/form-field/index.tsx";
import { Picker } from "../../components/picker/index.tsx";
import { HeldSegments } from "../../components/picker/segments.tsx";
import { ListedRoute } from "../../lib/navigate.ts";
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
// A place's tabs that do not fit 320 with the last one the location's: the
// strip opens scrolled so it is whole, the one before it not the one in view.
const LATE = [
	{ label: "Overview", href: "/acme/inventory" },
	{ label: "Documented", href: "/acme/inventory/documented" },
	{ label: "Tagged", href: "/acme/inventory/tagged" },
	{ label: "Unowned", href: "/acme/inventory/unowned" },
	{ label: "Undocumented", href: "/acme/inventory/undocumented" },
	{ label: "Imports", href: "/acme/inventory/imports" },
];
// Tabs that do not fit 320 with the last one chosen: the track opens scrolled
// to it, so the chosen tab is whole, never the one cut ("Unpla").
const STATES = [
	{ value: "all", label: "All" },
	{ value: "passing", label: "Passing" },
	{ value: "failing", label: "Failing" },
	{ value: "skipped", label: "Skipped" },
	{ value: "unplanned", label: "Unplanned" },
];
const RANGES = [
	{ value: "7d", label: "7 days" },
	{ value: "30d", label: "30 days" },
	{ value: "90d", label: "90 days" },
];

// The frames below judge their tracks' scroll and log an error where it breaks:
// a track scrolls no further than its chosen segment needs (one that stands
// whole at the track's start leaves the track at the start, the segments before
// it in view), and fades at each edge that has more, so a segment at an edge is
// never cut with nothing to say so.
const SETTLE = 30;
const FADES =
	typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");
function trackFaults(host: Element): string[] {
	const faults: string[] = [];
	for (const track of host.querySelectorAll<HTMLElement>(
		'[class*="scroll-fade-x"]',
	)) {
		if (track.scrollWidth <= track.clientWidth) continue;
		const room = track.getBoundingClientRect();
		const chosen = track
			.querySelector<HTMLElement>(
				'[aria-checked="true"], [aria-current="page"]',
			)
			?.getBoundingClientRect();
		if (
			chosen &&
			(chosen.left < room.left - 1 || chosen.right > room.right + 1)
		)
			faults.push(
				`${track.getAttribute("aria-label") ?? "a tab strip"} has its chosen segment cut by its edge`,
			);
		const name = track.getAttribute("aria-label") ?? "a tab strip";
		if (chosen && track.scrollLeft > 0) {
			const needs = chosen.right - room.left + track.scrollLeft;
			if (needs <= track.clientWidth)
				faults.push(
					`${name} is scrolled ${Math.round(track.scrollLeft)} px past its start, where its chosen segment stands whole without it`,
				);
		}
		if (!FADES) continue;
		const fade = (edge: string) =>
			Number.parseFloat(getComputedStyle(track).getPropertyValue(edge));
		if (track.scrollLeft > 1 && !(fade("--fade-start") > 0))
			faults.push(`${name} has more before its start and no fade there`);
		const more = track.scrollWidth - track.clientWidth - track.scrollLeft > 1;
		if (more && !(fade("--fade-end") > 0))
			faults.push(`${name} has more after its end and no fade there`);
	}
	return faults;
}

// Frames the tracks stand in, judged once they have stood still for a while.
function Judged({ children }: { children: ReactNode }) {
	const host = useRef<HTMLDivElement>(null);
	useEffect(() => {
		let frame = 0;
		let seen = 0;
		const watch = () => {
			if (++seen < SETTLE) {
				frame = requestAnimationFrame(watch);
				return;
			}
			if (host.current)
				for (const fault of trackFaults(host.current))
					console.error(`Segments: ${fault}`);
		};
		frame = requestAnimationFrame(watch);
		return () => cancelAnimationFrame(frame);
	}, []);
	return (
		<div ref={host} className="min-w-0">
			{children}
		</div>
	);
}

// Board 41's four periods, Week chosen; the frame's state forces every
// segment, so the idle ones draw it and the chosen one its own; loading, the
// value waits and the track paints. Under it a FormField names a range switch
// with its label and describes it, and the tabs of a place are links, the one
// the location selects marked. `PAINT.kind.control` draws the switch beside its
// painted form. The tabs that outrun 320 open with the chosen one in view, and
// a strip that fits (the periods, the ranges) has no fade on either side.
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
		<Judged>
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
				<ListedRoute value="/acme/inventory/imports">
					<Picker fit="segments" options={LATE} />
				</ListedRoute>
				<Picker
					fit="segments"
					label="State"
					options={STATES}
					value="unplanned"
					onChange={change}
				/>
				<FormField
					label="Range"
					description="API calls by day."
					segments={{ options: RANGES, value: "30d", onChange: change }}
				/>
			</div>
		</Judged>
	);
}
