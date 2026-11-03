import type { Engine } from "@fcalell/ui-core/player";
import { useEffect } from "react";
import { Dock } from "../../components/dock/index.tsx";
import { connectOutput, player } from "../../lib/player.ts";
import type { ShowcaseFrame } from "../cells.ts";
import { MADE_DURATION, madePeaks, silence } from "../peaks.ts";
import { SCREEN } from "./image.tsx";
import { Column } from "./place.tsx";

// An address that is no picture, so the load fails.
const BROKEN = "data:image/png;base64,AAAA";

// A sound that holds nothing, which fails when it is told to play if `failing`.
const still =
	(failing: boolean): Engine =>
	(report) => ({
		load: () => {},
		play: () => {
			if (failing) report.failed();
		},
		pause: () => {},
		time: () => 0,
		length: () => undefined,
		ready: () => false,
		seek: () => {},
		paused: () => true,
		level: () => ({ volume: 1, muted: false }),
		apply: () => {},
	});

/** A track is loaded, paused a third in (`failing`: told to play and failed), for a dock to stand with; the player is the page's, so the frame puts it away when it goes. */
export function useLoadedTrack(options: { image?: string; failing?: boolean }) {
	const { image, failing = false } = options;
	useEffect(() => {
		const src = silence(MADE_DURATION);
		const track = {
			src,
			title: "Midnight Run (Extended Mix)",
			line: "Kollektiv Turm",
			image,
			duration: MADE_DURATION,
			peaks: madePeaks(),
		};
		const queue = [track, { ...track, src: `${src}#next`, title: "Low Tide" }];
		connectOutput(still(failing));
		if (failing) player.play(track, queue);
		else {
			player.load(track, queue);
			player.seek(MADE_DURATION / 3);
		}
		return () => {
			player.close();
			URL.revokeObjectURL(src);
		};
	}, [image, failing]);
}

function Standing(props: { image?: string; failing?: boolean }) {
	useLoadedTrack(props);
	return (
		<Column>
			<Dock />
		</Column>
	);
}

// The dock under a place's column with a track loaded: `rest` paused with no
// picture (the tile's failed form holds the name's place), `error` told to play
// and failed. The picture's cell (`IMAGE.fit.mini`) draws it with a picture, and
// in `error` with an address that is no picture. The other cells are drawn
// inside these.
export function drawDock(frame: ShowcaseFrame) {
	const failing = frame.state === "error";
	if (frame.cell.name === "DOCK") return <Standing failing={failing} />;
	if (frame.cell.name === "IMAGE.fit.mini")
		return <Standing image={failing ? BROKEN : SCREEN} />;
	return undefined;
}
