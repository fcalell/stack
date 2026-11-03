import type { Marker, Peaks, Track } from "@fcalell/ui-core/descriptors";
import { keyOf, neighbour, PREVIOUS_RESTART } from "@fcalell/ui-core/player";
import { useSyncExternalStore } from "react";

export type { Marker, Peaks, Track };

/** What the player holds, as `usePlayer()` reads it. */
export interface PlayerState {
	/** The loaded track: the dock stands while there is one. */
	track: Track | undefined;
	/** The tracks Next and Previous walk, as the app gave them with `play` or `load`; none walks nowhere. */
	queue: readonly Track[];
	/** The track is playing, or is to play as soon as the browser lets it. */
	playing: boolean;
	/** The browser could not play the track. */
	failed: boolean;
	/** 0..1; it holds from one visit to the next. */
	volume: number;
	muted: boolean;
	/** The track after the loaded one in the queue. */
	next: Track | undefined;
	/** The track before the loaded one in the queue. */
	previous: Track | undefined;
}

/** The player's commands: the same functions on `player` and on what `usePlayer()` returns. */
export interface PlayerCommands {
	/** Plays `track`, replacing what is loaded; a track already loaded resumes where it stands. With `queue` Next and Previous walk it (a queue is kept while its tracks are the ones played). Without a track it resumes the loaded one. Call it from a press, since a browser holds back sound that no press asked for. */
	play(track?: Track, queue?: readonly Track[]): void;
	/** Loads `track` paused, at its start (a cue). */
	load(track: Track, queue?: readonly Track[]): void;
	pause(): void;
	toggle(): void;
	/** Moves to `seconds` into the track. */
	seek(seconds: number): void;
	/** Moves by `seconds`, back when negative. */
	skip(seconds: number): void;
	/** 0..1. */
	setVolume(volume: number): void;
	/** Mutes, or with no argument toggles. */
	mute(muted?: boolean): void;
	/** Plays the next track of the queue; nothing at its end. */
	playNext(): void;
	/** Returns to the start of the track past `PREVIOUS_RESTART` seconds in, else plays the track before it. */
	playPrevious(): void;
	/** Unloads the track and puts the dock away. */
	close(): void;
}

export type PlayerView = PlayerState & PlayerCommands;

/** Where the loaded track stands. */
export interface PlayerTime {
	/** Seconds in. */
	time: number;
	/** Seconds long; the track's own `duration` until the file answers, 0 when unknown. */
	duration: number;
}

const VOLUME_KEY = "stack.player.volume";

// A viewer's volume is theirs from one visit to the next: a convenience, so a
// store that is blocked or empty falls back to full.
function remembered(): { volume: number; muted: boolean } {
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
	return { volume: 1, muted: false };
}

function remember(volume: number, muted: boolean): void {
	try {
		localStorage.setItem(VOLUME_KEY, JSON.stringify({ volume, muted }));
	} catch {}
}

let audio: HTMLAudioElement | null = null;
let track: Track | undefined;
let queue: readonly Track[] = [];
let playing = false;
let failed = false;
let { volume, muted } =
	typeof localStorage === "undefined"
		? { volume: 1, muted: false }
		: remembered();
let time: PlayerTime = { time: 0, duration: 0 };
// A start the element could not take yet (a seek before its metadata).
let pending: number | undefined;
let frame = 0;

const listeners = new Set<() => void>();
const clockListeners = new Set<() => void>();

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

function sync(): void {
	if (!audio) return;
	audio.volume = volume;
	audio.muted = muted;
}

function emit(): void {
	view = build();
	for (const listener of listeners) listener();
}

function setTime(next: PlayerTime): void {
	if (next.time === time.time && next.duration === time.duration) return;
	time = next;
	for (const listener of clockListeners) listener();
}

// While it plays, the time follows the frame, so a playhead moves smoothly
// where `timeupdate` comes a few times a second. Only a reader of the time pays.
function tick(): void {
	frame = 0;
	if (!audio || audio.paused || clockListeners.size === 0) return;
	setTime({ ...time, time: audio.currentTime });
	frame = requestAnimationFrame(tick);
}

function wake(): void {
	if (frame || !audio || audio.paused || clockListeners.size === 0) return;
	frame = requestAnimationFrame(tick);
}

function build(): PlayerView {
	return {
		track,
		queue,
		playing,
		failed,
		volume,
		muted,
		next: neighbour(queue, track, 1),
		previous: neighbour(queue, track, -1),
		...commands,
	};
}

function same(a: Track | undefined, b: Track | undefined): boolean {
	return a !== undefined && b !== undefined && keyOf(a) === keyOf(b);
}

function open(
	next: Track,
	tracks: readonly Track[] | undefined,
	play: boolean,
) {
	// The queue stays while the track played is one of it; a track outside it
	// plays alone.
	if (tracks) queue = tracks;
	else if (!neighbour(queue, next, 0)) queue = [];
	if (!same(track, next)) {
		track = next;
		failed = false;
		pending = undefined;
		time = { time: 0, duration: next.duration ?? 0 };
		for (const listener of clockListeners) listener();
	} else track = next;
	playing = play;
	emit();
}

const commands: PlayerCommands = {
	play(next, tracks) {
		if (!next) {
			if (track) {
				playing = true;
				failed = false;
				emit();
			}
			return;
		}
		open(next, tracks, true);
	},
	load(next, tracks) {
		open(next, tracks, false);
	},
	pause() {
		if (!playing) return;
		playing = false;
		emit();
	},
	toggle() {
		if (!track) return;
		if (playing) commands.pause();
		else commands.play();
	},
	seek(seconds) {
		if (!track) return;
		const length = time.duration > 0 ? time.duration : Number.POSITIVE_INFINITY;
		const to = clamp(seconds, 0, length);
		if (audio && audio.readyState > 0) audio.currentTime = to;
		else pending = to;
		setTime({ ...time, time: to });
	},
	skip(seconds) {
		commands.seek(time.time + seconds);
	},
	setVolume(next) {
		volume = clamp(next, 0, 1);
		if (volume > 0) muted = false;
		sync();
		remember(volume, muted);
		emit();
	},
	mute(next) {
		muted = next ?? !muted;
		sync();
		remember(volume, muted);
		emit();
	},
	playNext() {
		const next = neighbour(queue, track, 1);
		if (next) open(next, undefined, true);
	},
	playPrevious() {
		const before = neighbour(queue, track, -1);
		if (time.time > PREVIOUS_RESTART || !before) commands.seek(0);
		else open(before, undefined, true);
	},
	close() {
		track = undefined;
		queue = [];
		playing = false;
		failed = false;
		pending = undefined;
		time = { time: 0, duration: 0 };
		for (const listener of clockListeners) listener();
		emit();
	},
};

let view: PlayerView = build();

/** The audio element's reports, which the dock passes from its events. Outside the package's exports. */
export const report = {
	/** The dock's one `<audio>` mounted (`null`: gone). */
	bind(element: HTMLAudioElement | null) {
		audio = element;
		sync();
		wake();
	},
	time() {
		if (!audio) return;
		setTime({ time: audio.currentTime, duration: durationOf() });
	},
	metadata() {
		if (audio && pending !== undefined) {
			audio.currentTime = pending;
			pending = undefined;
		}
		report.time();
	},
	state(isPlaying: boolean) {
		// The element is the truth about whether sound is running: the browser or the
		// system's media keys may pause it.
		if (isPlaying) wake();
		if (playing === isPlaying) return;
		playing = isPlaying;
		emit();
	},
	volume() {
		if (!audio) return;
		if (audio.volume === volume && audio.muted === muted) return;
		volume = audio.volume;
		muted = audio.muted;
		remember(volume, muted);
		emit();
	},
	ended() {
		const next = neighbour(queue, track, 1);
		if (next) {
			open(next, undefined, true);
			return;
		}
		playing = false;
		emit();
	},
	failed() {
		failed = true;
		playing = false;
		emit();
	},
	/** The browser held the sound back (no press asked for it): the track waits paused. */
	blocked() {
		if (!playing) return;
		playing = false;
		emit();
	},
};

function durationOf(): number {
	const length = audio?.duration;
	return length !== undefined && Number.isFinite(length)
		? length
		: (track?.duration ?? 0);
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function subscribeClock(listener: () => void): () => void {
	clockListeners.add(listener);
	wake();
	return () => clockListeners.delete(listener);
}

/** The player, from anywhere in the app (a handler, a loader): `player.play({ src, title, meta })`. The `Shell` draws the dock while a track is loaded and owns the one audio element, so the sound goes on through navigation. */
export const player: PlayerCommands = commands;

/** What the player holds and its commands, drawing again when the track, play state, volume or queue change (not each second: `usePlayerTime` is the clock). */
export function usePlayer(): PlayerView {
	return useSyncExternalStore(
		subscribe,
		() => view,
		() => view,
	);
}

/** Where the loaded track stands, drawing again as it moves (on each frame while it plays). */
export function usePlayerTime(): PlayerTime {
	return useSyncExternalStore(
		subscribeClock,
		() => time,
		() => time,
	);
}
