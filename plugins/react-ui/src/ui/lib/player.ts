import type { Peaks, Track } from "@fcalell/ui-core/descriptors";
import {
	createPlayer,
	type Output,
	type PlayerCommands,
	type PlayerHost,
	type PlayerReport,
	type PlayerState,
	type PlayerTime,
	type PlayerView,
	type QueueProvider,
	type TrackQueue,
	type WindowQueueOptions,
	windowQueue,
} from "@fcalell/ui-core/player";
import { useSyncExternalStore } from "react";

export type {
	Peaks,
	PlayerCommands,
	PlayerState,
	PlayerTime,
	PlayerView,
	QueueProvider,
	Track,
	TrackQueue,
	WindowQueueOptions,
};
export { windowQueue };

const VOLUME_KEY = "stack.player.volume";

// The web's side of the store (`createPlayer`, in ui-core): a viewer's volume is
// theirs from one visit to the next, a convenience, so a store that is blocked or
// empty falls back to full; the clock follows the animation frame.
const host: PlayerHost = {
	recall() {
		try {
			const saved = JSON.parse(localStorage.getItem(VOLUME_KEY) ?? "null");
			if (
				saved &&
				typeof saved.volume === "number" &&
				typeof saved.muted === "boolean"
			)
				return {
					volume: Math.min(1, Math.max(0, saved.volume)),
					muted: saved.muted,
				};
		} catch {}
		return undefined;
	},
	keep(volume, muted) {
		try {
			localStorage.setItem(VOLUME_KEY, JSON.stringify({ volume, muted }));
		} catch {}
	},
	frame(run) {
		const id = requestAnimationFrame(run);
		return () => cancelAnimationFrame(id);
	},
};

const store = createPlayer(host);

/** The player, from anywhere in the app (a handler, a loader): `player.play({ src, title, meta })`. The `Shell` draws the dock while a track is loaded and owns the one audio element, so the sound goes on through navigation. */
export const player: PlayerCommands = store.player;

// The dock's `<audio>` as the store's sound.
function outputOf(audio: HTMLAudioElement): Output {
	return {
		time: () => audio.currentTime,
		length: () =>
			Number.isFinite(audio.duration) ? audio.duration : undefined,
		ready: () => audio.readyState > 0,
		seek(to) {
			audio.currentTime = to;
		},
		paused: () => audio.paused,
		level: () => ({ volume: audio.volume, muted: audio.muted }),
		apply(volume, muted) {
			audio.volume = volume;
			audio.muted = muted;
		},
	};
}

/** The audio element's reports, which the dock passes from its events. Outside the package's exports. */
export const report: Omit<PlayerReport, "bind"> & {
	/** The dock's one `<audio>` mounted (`null`: gone). */
	bind(element: HTMLAudioElement | null): void;
} = {
	...store.report,
	bind: (element) => store.report.bind(element && outputOf(element)),
};

/** What the player holds and its commands, drawing again when the track, play state, volume or queue change (not each second: `usePlayerTime` is the clock). */
export function usePlayer(): PlayerView {
	return useSyncExternalStore(store.subscribe, store.view, store.view);
}

/** Where the loaded track stands, drawing again as it moves (on each frame while it plays). */
export function usePlayerTime(): PlayerTime {
	return useSyncExternalStore(store.subscribeClock, store.clock, store.clock);
}
