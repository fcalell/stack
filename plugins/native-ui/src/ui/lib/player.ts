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

// The phone's side of the store (`createPlayer`, in ui-core): the device's own
// buttons set the volume, so the store keeps none, and the clock follows the
// frame.
const host: PlayerHost = {
	recall: () => undefined,
	keep: () => {},
	frame(run) {
		const id = requestAnimationFrame(run);
		return () => cancelAnimationFrame(id);
	},
};

const store = createPlayer(host);

/** The player, from anywhere in the app (a handler, a loader): `player.play({ src, title, line })`. It plays through the output `connectOutput` was given, and a `Dock` in the `Shell`'s `foot` draws it; the store is the app's, so the sound goes on through navigation. */
export const player: PlayerCommands = store.player;

/** Passes the player its sound: `connectOutput(audioOutput())` once, before the app renders, with `audioOutput` of `@fcalell/plugin-native-ui/audio/expo`. */
export const connectOutput: (engine: Engine) => void = store.connect;

/** What the player holds and its commands, drawing again when the track, play state, volume or queue change (not each second: `usePlayerTime` is the clock). */
export function usePlayer(): PlayerView {
	return useSyncExternalStore(store.subscribe, store.view, store.view);
}

/** Where the loaded track stands, drawing again as it moves (on each frame while it plays). */
export function usePlayerTime(): PlayerTime {
	return useSyncExternalStore(store.subscribeClock, store.clock, store.clock);
}
