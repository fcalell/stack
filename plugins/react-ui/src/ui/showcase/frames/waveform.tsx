import { useState } from "react";
import { Waveform } from "../../components/waveform/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { MADE_DURATION, madePeaks } from "../peaks.ts";

const PEAKS = madePeaks();

// Seekable, so a story is tried by pointer and keys.
function Seekable(props: { fit: "bar" | "record"; label: string }) {
	const [at, seek] = useState(MADE_DURATION * 0.35);
	return (
		<Waveform
			fit={props.fit}
			label={props.label}
			peaks={PEAKS}
			duration={MADE_DURATION}
			at={at}
			onSeek={seek}
		/>
	);
}

// The waveform at the control's height as the dock draws it, and at record
// height: played and unplayed ink and the playhead.
export function drawWaveform(_frame: ShowcaseFrame) {
	return (
		<div className="flex flex-col gap-section w-full max-w-dialog">
			<Seekable fit="bar" label="Seek" />
			<Seekable fit="record" label="Seek the track" />
		</div>
	);
}
