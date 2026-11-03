// The audio player's rules, free of any framework and of the sound: how a time is
// worded, which track comes next, and what the global keys do. A store runs them
// over the `Output` an app passes it.
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

// ── The player's store ──────────────────────────────────────────────

/** What the platform's sound reports and takes: the web's `<audio>`, the phone's expo-audio player. The store drives it only through this, so one store serves both. */
export interface Output {
	/** Puts `track`'s file in the sound, replacing the one loaded, cued at its start and paused; `undefined` unloads it and silences the sound. */
	load(track: Track | undefined): void;
	/** Starts or resumes the loaded file; a sound the platform holds back, or that fails, says so through the `PlayerReport`. */
	play(): void;
	pause(): void;
	/** Seconds into the loaded file. */
	time(): number;
	/** Seconds long, once the file has answered; `undefined` before. */
	length(): number | undefined;
	/** The file's length is known, so a seek lands now. */
	ready(): boolean;
	seek(to: number): void;
	/** The sound is not running. */
	paused(): boolean;
	/** The volume and mute the sound holds, which the system's own controls may have moved. */
	level(): { volume: number; muted: boolean };
	apply(volume: number, muted: boolean): void;
}

/** The platform's sound, made when the first track loads (so a page that never plays opens no audio session, and a server render makes none), given the store's `PlayerReport` to pass the sound's events to. An app passes one to `connect`: `audioOutput()` on the web. */
export type Engine = (report: PlayerReport) => Output;

/** What the store asks of the platform that is not sound: a viewer's volume kept from one visit to the next, and a call on each frame. */
export interface PlayerHost {
	/** The volume and mute kept, or `undefined` for none (a blocked or empty store). */
	recall(): { volume: number; muted: boolean } | undefined;
	keep(volume: number, muted: boolean): void;
	/** Calls `run` on the next frame; returns what cancels it. */
	frame(run: () => void): () => void;
}

/** What the player holds, as a reader sees it. */
export interface PlayerState {
	/** The loaded track: the dock stands while there is one. */
	track: Track | undefined;
	/** The tracks Next and Previous walk, as the app gave them with `play` or `load` as a list; none walks nowhere, and a provider's queue is not a list, so it reads empty (`queued` says there is one). */
	queue: readonly Track[];
	/** Next and Previous walk a queue: a list of more than one track, or a provider. The dock draws Previous by it. */
	queued: boolean;
	/** A track follows the loaded one: the queue's next, or for a provider, until it answers that there is none (it is asked as the track loads). The dock draws Next by it. */
	hasNext: boolean;
	/** The track is playing, or is to play as soon as the platform lets it. */
	playing: boolean;
	/** The platform could not play the track. */
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
	/** Plays `track`, replacing what is loaded; a track already loaded resumes where it stands. With `queue` (a list, or a provider for a list too long to hold: `windowQueue`) Next and Previous walk it; a queue is kept while the tracks played are the ones it gave. Without a track it resumes the loaded one. On the web call it from a press, since a browser holds back sound that no press asked for. */
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

/** The platform's reports to the store, which its `Engine` passes from the sound's events. */
export interface PlayerReport {
	time(): void;
	metadata(): void;
	state(isPlaying: boolean): void;
	volume(): void;
	ended(): void;
	failed(): void;
	/** The platform held the sound back (no press asked for it): the track waits paused. */
	blocked(): void;
}

export interface PlayerStore {
	player: PlayerCommands;
	/** Passes the platform's sound; the store makes it when a track first loads, and replaces one already made. Loading or playing a track before one is passed throws. */
	connect(engine: Engine): void;
	/** The store as an external store: `subscribe` and `view` for the state, `subscribeClock` and `clock` for the time (it draws again on each frame while it plays). */
	subscribe(listener: () => void): () => void;
	view(): PlayerView;
	subscribeClock(listener: () => void): () => void;
	clock(): PlayerTime;
}

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const same = (a: Track | undefined, b: Track | undefined): boolean =>
	a !== undefined && b !== undefined && keyOf(a) === keyOf(b);

// What a provider said of the loaded track's neighbours: `settled` once its
// answer is in (`track` then holds it, `undefined` at an end of the queue).
interface Ahead {
	settled: boolean;
	track: Track | undefined;
	answer: Promise<Track | undefined>;
}

/** One player: the track, its queue (a list or a provider), the play state, the volume and the clock, and the rules that move them, over a platform's `Output`. The web's `player` and the phone's are each one, differing only in the engine an app connects. */
export function createPlayer(host: PlayerHost): PlayerStore {
	let engine: Engine | undefined;
	let output: Output | null = null;
	// The track the sound holds, and whether it was told to run.
	let loaded: Track | undefined;
	let running = false;
	let track: Track | undefined;
	let queue: readonly Track[] = [];
	// A queue that answers for the loaded track's neighbours, in place of a list.
	let provider: QueueProvider | undefined;
	let ahead: { next: Ahead; previous: Ahead } | undefined;
	let playing = false;
	let failed = false;
	let { volume, muted } = host.recall() ?? { volume: 1, muted: false };
	let time: PlayerTime = { time: 0, duration: 0 };
	// A start the sound could not take yet (a seek before its metadata).
	let pending: number | undefined;
	let cancelFrame: (() => void) | undefined;

	const listeners = new Set<() => void>();
	const clockListeners = new Set<() => void>();

	const sync = () => output?.apply(volume, muted);

	// Puts the sound where the state says: the loaded track's file, running or not.
	const drive = () => {
		if (!engine) return;
		if (!track) {
			if (output && loaded) output.load(undefined);
			loaded = undefined;
			running = false;
			return;
		}
		if (!output) {
			output = engine(report);
			output.apply(volume, muted);
		}
		if (!same(loaded, track)) {
			output.load(track);
			loaded = track;
			running = false;
		}
		if (playing === running) return;
		running = playing;
		if (playing) output.play();
		else output.pause();
	};

	const emit = () => {
		drive();
		view = build();
		for (const listener of listeners) listener();
	};

	const setTime = (next: PlayerTime) => {
		if (next.time === time.time && next.duration === time.duration) return;
		time = next;
		for (const listener of clockListeners) listener();
	};

	// While it plays, the time follows the frame, so a playhead moves smoothly
	// where a platform reports a few times a second. Only a reader of the time pays.
	const tick = () => {
		cancelFrame = undefined;
		if (!output || output.paused() || clockListeners.size === 0) return;
		setTime({ ...time, time: output.time() });
		cancelFrame = host.frame(tick);
	};

	const wake = () => {
		if (cancelFrame || !output || output.paused() || clockListeners.size === 0)
			return;
		cancelFrame = host.frame(tick);
	};

	// Asks the provider for the loaded track's neighbours, once; an answer that
	// lands after the track changed is dropped. A provider that throws has none.
	const ask = () => {
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
	};

	const build = (): PlayerView => {
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
	};

	// Whether `next` is a track the provider gave for the loaded one.
	const given = (next: Track): boolean =>
		same(ahead?.next.track, next) ||
		same(ahead?.previous.track, next) ||
		same(track, next);

	const open = (next: Track, tracks: TrackQueue | undefined, play: boolean) => {
		if (!engine)
			throw new Error(
				"The player has no output: call connectOutput(...) before playing a track.",
			);
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
	};

	// Plays the track `way` from the loaded one, a provider's once it has answered.
	const step = async (
		way: "next" | "previous",
		none?: () => void,
	): Promise<void> => {
		if (!provider) return;
		const current = track;
		const answer = await ahead?.[way].answer;
		if (!provider || track !== current) return;
		if (answer) open(answer, undefined, true);
		else none?.();
	};

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
			const length =
				time.duration > 0 ? time.duration : Number.POSITIVE_INFINITY;
			const to = clamp(seconds, 0, length);
			if (output?.ready()) output.seek(to);
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
			host.keep(volume, muted);
			emit();
		},
		mute(next) {
			muted = next ?? !muted;
			sync();
			host.keep(volume, muted);
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

	const durationOf = (): number => output?.length() ?? track?.duration ?? 0;

	const report: PlayerReport = {
		time() {
			if (!output) return;
			setTime({ time: output.time(), duration: durationOf() });
		},
		metadata() {
			if (output && pending !== undefined) {
				output.seek(pending);
				pending = undefined;
			}
			report.time();
		},
		state(isPlaying) {
			// The sound is the truth about whether it is running: the platform or
			// the system's media keys may pause it.
			if (isPlaying) wake();
			if (playing === isPlaying) return;
			playing = isPlaying;
			emit();
		},
		volume() {
			if (!output) return;
			const held = output.level();
			if (held.volume === volume && held.muted === muted) return;
			volume = held.volume;
			muted = held.muted;
			host.keep(volume, muted);
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
		blocked() {
			if (!playing) return;
			playing = false;
			emit();
		},
	};

	return {
		player: commands,
		connect(next) {
			if (output) {
				output.load(undefined);
				output = null;
			}
			loaded = undefined;
			running = false;
			engine = next;
			drive();
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		view: () => view,
		subscribeClock(listener) {
			clockListeners.add(listener);
			wake();
			return () => clockListeners.delete(listener);
		},
		clock: () => time,
	};
}

/** The shape of a window read `windowQueue` walks: its page at an offset (a plugin-api `Read` of a `paginated: "window"` procedure). */
export interface WindowRead {
	readonly page?: (
		offset: number,
	) => Promise<{ data: readonly unknown[]; total: number }>;
}

export interface WindowQueueOptions<Row> {
	/** The `Track` a row of the read plays, or a promise of it: an app that signs an address per track does it here, once for each row of a page as the page loads (a page is fetched once). A promise that rejects fails the page, which the next press asks for again. */
	track: (row: Row) => Track | Promise<Track>;
	/** Where the track being played stands in the read's order: its row's index among all the rows the query matches (`useWindow(read).rows.findIndex((row) => row?.id === id)`). */
	at: number;
}

/** A queue over a window read (`orpc.x.list.window(input)`), so Next and Previous walk a list too long to hold: they fetch the rows beside the playing one through the read's own pages, in the read's order and filter, and a page is fetched once. It is the order at the moment it was made; a changed query is a new queue. `player.play(track(row), windowQueue(read, { track, at }))`. */
export function windowQueue<Row>(
	read: WindowRead,
	options: WindowQueueOptions<Row>,
): QueueProvider {
	const { page } = read;
	if (!page) throw new Error("windowQueue takes a window read");
	// The pages fetched, by the index of their first row, and where each track is.
	const blocks = new Map<number, Promise<readonly unknown[]>>();
	const indexes = new Map<string, number>();
	const rows = new Map<number, Track>();
	let size = 0;
	let total = Number.POSITIVE_INFINITY;

	const fetched = (start: number): Promise<readonly unknown[]> => {
		let block = blocks.get(start);
		if (!block) {
			block = page(start).then(async (answer) => {
				const made = await Promise.all(
					answer.data.map((row) => options.track(row as Row)),
				);
				size = Math.max(size, answer.data.length);
				total = answer.total;
				made.forEach((track, at) => {
					rows.set(start + at, track);
					indexes.set(keyOf(track), start + at);
				});
				return answer.data;
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
