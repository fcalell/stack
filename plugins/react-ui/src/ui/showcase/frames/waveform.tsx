import type { Marker } from "@fcalell/ui-core/descriptors";
import { useState } from "react";
import { Waveform } from "../../components/waveform/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { MADE_DURATION, madePeaks } from "../peaks.ts";

const PEAKS = madePeaks();

const MARKERS: Marker[] = [
	{ at: 0, label: "Intro", family: "teal" },
	{ at: 18, label: "Build", family: "amber" },
	{ at: 69, label: "Drop", family: "red" },
	{ at: 128, label: "Break", family: "green" },
	{ at: 150, label: "Second drop", family: "red" },
	{ at: 205, label: "Outro" },
];

// Seekable, so a story is tried by pointer and keys.
function Seekable(props: {
	fit: "bar" | "record";
	markers?: Marker[];
	label: string;
}) {
	const [at, seek] = useState(MADE_DURATION * 0.35);
	return (
		<Waveform
			fit={props.fit}
			label={props.label}
			peaks={PEAKS}
			duration={MADE_DURATION}
			at={at}
			onSeek={seek}
			markers={props.markers}
		/>
	);
}

// The waveform at the control's height as the dock draws it, and at record
// height with cues: played and unplayed ink, the playhead, the flags in their
// hues and their labels.
export function drawWaveform(_frame: ShowcaseFrame) {
	return (
		<div className="flex flex-col gap-section w-full max-w-dialog">
			<Seekable fit="bar" label="Seek" />
			<Seekable fit="record" label="Seek the track" />
			<Seekable fit="record" label="Seek with cues" markers={MARKERS} />
		</div>
	);
}
