import type { Read } from "@fcalell/plugin-api/tanstack-query";
import type { Marker, Peaks, Track } from "@fcalell/ui-core/descriptors";
import {
	isProvider,
	keyOf,
	neighbour,
	PREVIOUS_RESTART,
	type QueueProvider,
	type TrackQueue,
} from "@fcalell/ui-core/player";
import { useSyncExternalStore } from "react";

export type { Marker, Peaks, QueueProvider, Track, TrackQueue };

/** What the player holds, as `usePlayer()` reads it. */
export interface PlayerState {
	/** The loaded track: the dock stands while there is one. */
	track: Track | undefined;
	/** The tracks Next and Previous walk, as the app gave them with `play` or `load` as a list; none walks nowhere, and a provider's queue is not a list, so it reads empty (`queued` says there is one). */
	queue: readonly Track[];
	/** Next and Previous walk a queue: a list of more than one track, or a provider. The dock draws Previous by it. */
	queued: boolean;
	/** A track follows the loaded one: the queue's next, or for a provider, until it answers that there is none (it is asked as the track loads). The dock draws Next by it. */
	hasNext: boolean;
	/** The track is playing, or is to play as soon as the browser lets it. */
	playing: boolean;
	/** The browser could not play the track. */
	failed: boolean;
	/** 0..1; it holds from one visit to the next. */
	volume: number;
	muted: boolean;
	/** The track after the loaded one in the queue; for a provider, once it has answered. */
	next: Track | undefined;
	/** The track before the loaded one in the queue; for a provider, once it has answered. */
	previous: Track | undefined;
}

/** The player's commands: the same functions on `player` and on what `usePlayer()` returns. */
export interface PlayerCommands {
	/** Plays `track`, replacing what is loaded; a track already loaded resumes where it stands. With `queue` (a list, or a provider for a list too long to hold: `windowQueue`) Next and Previous walk it; a queue is kept while the tracks played are the ones it gave. Without a track it resumes the loaded one. Call it from a press, since a browser holds back sound that no press asked for. */
	play(track?: Track, queue?: TrackQueue): void;
	/** Loads `track` paused, at its start (a cue). */
	load(track: Track, queue?: TrackQueue): void;
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
// A queue that answers for the loaded track's neighbours, in place of a list.
let provider: QueueProvider | undefined;
// What the provider said of the loaded track's neighbours: `settled` once its
// answer is in (`track` then holds it, `undefined` at an end of the queue).
interface Ahead {
	settled: boolean;
	track: Track | undefined;
	answer: Promise<Track | undefined>;
}
let ahead: { next: Ahead; previous: Ahead } | undefined;
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

// Asks the provider for the loaded track's neighbours, once; an answer that
// lands after the track changed is dropped. A provider that throws has none.
function ask(): void {
	ahead = undefined;
	if (!provider || !track) return;
	const asked = provider;
	const current = track;
	const one = (way: "next" | "previous"): Ahead => {
		const entry: Ahead = {
			settled: false,
			track: undefined,
			answer: Promise.resolve().then(() => asked[way](current)),
		};
		entry.answer = entry.answer
			.catch(() => undefined)
			.then((found) => {
				if (provider === asked && track === current) {
					entry.settled = true;
					entry.track = found;
					emit();
				}
				return found;
			});
		return entry;
	};
	ahead = { next: one("next"), previous: one("previous") };
}

function build(): PlayerView {
	const next = provider ? ahead?.next.track : neighbour(queue, track, 1);
	return {
		track,
		queue,
		queued: provider !== undefined || queue.length > 1,
		hasNext: provider
			? ahead?.next.settled !== true || next !== undefined
			: next !== undefined,
		playing,
		failed,
		volume,
		muted,
		next,
		previous: provider ? ahead?.previous.track : neighbour(queue, track, -1),
		...commands,
	};
}

function same(a: Track | undefined, b: Track | undefined): boolean {
	return a !== undefined && b !== undefined && keyOf(a) === keyOf(b);
}

// Whether `next` is a track the provider gave for the loaded one.
function given(next: Track): boolean {
	return (
		same(ahead?.next.track, next) ||
		same(ahead?.previous.track, next) ||
		same(track, next)
	);
}

function open(next: Track, tracks: TrackQueue | undefined, play: boolean) {
	// The queue stays while the track played is one of it; a track outside it
	// plays alone.
	const before = track;
	if (tracks) {
		if (isProvider(tracks)) {
			queue = [];
			provider = tracks;
		} else {
			queue = tracks;
			provider = undefined;
		}
	} else if (provider) {
		if (!given(next)) provider = undefined;
	} else if (!neighbour(queue, next, 0)) queue = [];
	if (!same(track, next)) {
		track = next;
		failed = false;
		pending = undefined;
		time = { time: 0, duration: next.duration ?? 0 };
		for (const listener of clockListeners) listener();
	} else track = next;
	playing = play;
	// The neighbours are asked for a new track, or a new provider.
	if (provider && (tracks || !same(before, next))) ask();
	else if (!provider) ahead = undefined;
	emit();
}

// Plays the track `way` from the loaded one, a provider's once it has answered.
async function step(
	way: "next" | "previous",
	none?: () => void,
): Promise<void> {
	if (!provider) return;
	const current = track;
	const answer = await ahead?.[way].answer;
	if (!provider || track !== current) return;
	if (answer) open(answer, undefined, true);
	else none?.();
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
		if (provider) {
			void step("next");
			return;
		}
		const next = neighbour(queue, track, 1);
		if (next) open(next, undefined, true);
	},
	playPrevious() {
		if (provider) {
			// Past the restart point, or with no track before it, it restarts.
			if (time.time > PREVIOUS_RESTART) commands.seek(0);
			else void step("previous", () => commands.seek(0));
			return;
		}
		const before = neighbour(queue, track, -1);
		if (time.time > PREVIOUS_RESTART || !before) commands.seek(0);
		else open(before, undefined, true);
	},
	close() {
		track = undefined;
		queue = [];
		provider = undefined;
		ahead = undefined;
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
		if (provider) {
			const current = track;
			void ahead?.next.answer.then((found) => {
				if (track !== current || !provider) return;
				if (found) open(found, undefined, true);
				else {
					playing = false;
					emit();
				}
			});
			return;
		}
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

export interface WindowQueueOptions<Row> {
	/** The `Track` a row of the read plays. */
	track: (row: Row) => Track;
	/** Where the track being played stands in the read's order: its row's index among all the rows the query matches (`useWindow(read).rows.findIndex((row) => row?.id === id)`). */
	at: number;
}

/** A queue over a window read (`orpc.x.list.window(input)`), so Next and Previous walk a list too long to hold: they fetch the rows beside the playing one through the read's own pages, in the read's order and filter, and a page is fetched once. It is the order at the moment it was made; a changed query is a new queue. `player.play(track(row), windowQueue(read, { track, at }))`. */
export function windowQueue<Row>(
	read: Read<readonly Row[], unknown>,
	options: WindowQueueOptions<Row>,
): QueueProvider {
	const { page } = read;
	if (!page) throw new Error("windowQueue takes a window read");
	// The pages fetched, by the index of their first row, and where each track is.
	const blocks = new Map<number, Promise<readonly Row[]>>();
	const indexes = new Map<string, number>();
	const rows = new Map<number, Track>();
	let size = 0;
	let total = Number.POSITIVE_INFINITY;

	const fetched = (start: number): Promise<readonly Row[]> => {
		let block = blocks.get(start);
		if (!block) {
			block = page(start).then((answer) => {
				size = Math.max(size, answer.data.length);
				total = answer.total;
				answer.data.forEach((row, at) => {
					const made = options.track(row as Row);
					rows.set(start + at, made);
					indexes.set(keyOf(made), start + at);
				});
				return answer.data as readonly Row[];
			});
			// A failed page is asked for again by the next press.
			block.catch(() => blocks.delete(start));
			blocks.set(start, block);
		}
		return block;
	};

	const at = async (index: number): Promise<Track | undefined> => {
		if (index < 0) return undefined;
		const known = rows.get(index);
		if (known || index >= total) return known;
		// Backwards, the page ends at the row asked for.
		const start =
			index < options.at && size > 0 ? Math.max(0, index - size + 1) : index;
		await fetched(start);
		return rows.get(index);
	};

	// The playing row's own page, which tells the page size and the total.
	const beside = async (current: Track, way: 1 | -1) => {
		await fetched(options.at);
		const index = indexes.get(keyOf(current));
		return index === undefined ? undefined : at(index + way);
	};
	return {
		next: (current) => beside(current, 1),
		previous: (current) => beside(current, -1),
	};
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
