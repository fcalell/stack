import type { Peaks, Track } from "@fcalell/ui-core/descriptors";
import {
	createPlayer,
	type Engine,
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
	Engine,
	Output,
	Peaks,
	PlayerCommands,
	PlayerReport,
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

/** The player, from anywhere in the app (a handler, a loader): `player.play({ src, title, line })`. It plays through the output `connectOutput` was given, and a `Dock` in the `Shell`'s `foot` draws it; the store is the page's, so the sound goes on through navigation. */
export const player: PlayerCommands = store.player;

/** Passes the player its sound: `connectOutput(audioOutput())` once, before the app renders. The output is the app's, not the `Shell`'s, so a screen that plays without a `Dock` takes the same one. */
export const connectOutput: (engine: Engine) => void = store.connect;

/** The browser's audio element as the player's sound: one `Audio`, made when the first track loads and kept, so the sound goes on through navigation. */
export function audioOutput(): Engine {
	return (report) => {
		const audio = new Audio();
		audio.preload = "metadata";
		audio.addEventListener("timeupdate", report.time);
		audio.addEventListener("durationchange", report.time);
		audio.addEventListener("loadedmetadata", report.metadata);
		audio.addEventListener("play", () => report.state(true));
		audio.addEventListener("pause", () => {
			// A pause while the file loads is the element reloading, not a pause.
			if (audio.readyState > 0) report.state(false);
		});
		audio.addEventListener("volumechange", report.volume);
		audio.addEventListener("ended", report.ended);
		audio.addEventListener("error", report.failed);
		return {
			load(track) {
				if (track) audio.src = track.src;
				else {
					audio.pause();
					audio.removeAttribute("src");
					audio.load();
				}
			},
			// The browser holds back sound that no press asked for: the track waits
			// paused.
			play() {
				audio.play().catch((error: unknown) => {
					const name = error instanceof DOMException ? error.name : "";
					if (name === "NotAllowedError") report.blocked();
					else if (name !== "AbortError") report.failed();
				});
			},
			pause: () => audio.pause(),
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
	};
}

/** What the player holds and its commands, drawing again when the track, play state, volume or queue change (not each second: `usePlayerTime` is the clock). */
export function usePlayer(): PlayerView {
	return useSyncExternalStore(store.subscribe, store.view, store.view);
}

/** Where the loaded track stands, drawing again as it moves (on each frame while it plays). */
export function usePlayerTime(): PlayerTime {
	return useSyncExternalStore(store.subscribeClock, store.clock, store.clock);
}
