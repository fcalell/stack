// The audio player's rules, free of any framework and of the audio element: how a
// time is worded, which track comes next, and what the global keys do. The web's
// store runs them over one `<audio>`.
import type { Track } from "./descriptors.ts";
import { SEEK } from "./waveform.ts";

// Past this many seconds in, Previous returns to the track's start; before it,
// it goes to the track before.
export const PREVIOUS_RESTART = 3;

// A time as the dock draws it: `3:07`, and `1:02:03` from an hour.
export function trackTime(seconds: number): string {
	const whole = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
	const hours = Math.floor(whole / 3600);
	const minutes = Math.floor((whole % 3600) / 60);
	const rest = String(whole % 60).padStart(2, "0");
	return hours > 0
		? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
		: `${minutes}:${rest}`;
}

export const keyOf = (track: Track): string => track.key ?? track.src;

// The track `delta` places from `track` in the queue, none past either end (and
// none for a track the queue does not hold).
export function neighbour(
	queue: readonly Track[],
	track: Track | undefined,
	delta: number,
): Track | undefined {
	if (!track) return undefined;
	const at = queue.findIndex((each) => keyOf(each) === keyOf(track));
	return at < 0 ? undefined : queue[at + delta];
}

/** A queue that is not a list in hand: the track after and the track before `current`, each `undefined` at an end of the queue, either answered now or later (a window read's page that is yet to load). Next and Previous ask it for the loaded track, once per track and in advance, so the dock knows whether a next exists before it is pressed. */
export interface QueueProvider {
	next(current: Track): Track | undefined | Promise<Track | undefined>;
	previous(current: Track): Track | undefined | Promise<Track | undefined>;
}

/** What Next and Previous walk: the tracks in order, or a provider. */
export type TrackQueue = readonly Track[] | QueueProvider;

export const isProvider = (queue: TrackQueue): queue is QueueProvider =>
	!Array.isArray(queue);

export type Shortcut = { to: "toggle" } | { to: "skip"; by: number };

// What a key does anywhere on the page that is not typing or pressing: Space
// toggles, the horizontal arrows skip by the seek step (Shift: the fine one).
export function shortcut(key: string, shift: boolean): Shortcut | undefined {
	if (key === " ") return { to: "toggle" };
	if (key === "ArrowLeft")
		return { to: "skip", by: -(shift ? SEEK.fine : SEEK.step) };
	if (key === "ArrowRight")
		return { to: "skip", by: shift ? SEEK.fine : SEEK.step };
	return undefined;
}
