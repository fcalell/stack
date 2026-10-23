// The scramble, free of any framework: what a
// glyph slot draws instead of the pulse when the theme's `loading` says so.
// Every function is pure over the tick it is given, so both platforms draw the
// same frame for the same slot, and one ticker serves every slot of a page.

import type { PaintRole } from "./paint.ts";
import type { LoadingSlot } from "./tokens.ts";

// The paint kind of a role: titles, names and prose are text, a figure is a
// figure and an id is an id.
export function kindOf(role: PaintRole): LoadingSlot {
	if (role === "figure" || role === "id") return role;
	return "text";
}

// Roles whose slot wraps over several lines: a scrambled box is one clipped
// line, so these always pulse, each of their lines a bar.
const WRAPS: ReadonlySet<PaintRole> = new Set(["sentence", "paragraph"]);

// Whether a role's slot can be scrambled: the one-line ones.
export function scrambles(role: PaintRole): boolean {
	return !WRAPS.has(role);
}

// The characters each kind cycles through, Latin whatever the data's script:
// the scramble never meets the loaded string.
const CLASSES: Record<LoadingSlot, string> = {
	text: "abcdefghijklmnopqrstuvwxyz",
	figure: "0123456789",
	id: "0123456789abcdef",
};

const DIGIT = /\p{Nd}/u;
const LETTER = /\p{L}/u;

// A small integer hash of three numbers (an xorshift-multiply mix), so a
// place's cadence and its characters are the same for the same slot.
function mix(a: number, b: number, c: number): number {
	let h = Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b);
	h ^= Math.imul(c | 0, 0xc2b2ae35);
	h ^= h >>> 15;
	h = Math.imul(h, 0x2c1b3c6d);
	h ^= h >>> 12;
	h = Math.imul(h, 0x297a2d39);
	h ^= h >>> 15;
	return h >>> 0;
}

// A seed from a slot's identity (a React id, a key), so two slots of one role
// do not shimmer in step.
export function seedOf(id: string): number {
	let seed = 0;
	for (let at = 0; at < id.length; at++)
		seed = mix(seed, id.charCodeAt(at), at);
	return seed;
}

// The shortest and longest a place holds a character, in ticks.
export const CADENCE = { min: 1, max: 2.5 } as const;

// How many ticks place `at` of the slot `seed` holds each of its characters:
// from `CADENCE.min` to `CADENCE.max`.
export function cadence(seed: number, at: number): number {
	return (
		CADENCE.min + ((mix(seed, at, 1) % 151) / 150) * (CADENCE.max - CADENCE.min)
	);
}

// The character of a place at a tick: its own epoch (a tick shifted by the
// place's phase, over its cadence) picks it from the class.
function pick(
	kind: LoadingSlot,
	seed: number,
	at: number,
	tick: number,
): string {
	const set = CLASSES[kind];
	const phase = (mix(seed, at, 2) % 100) / 100;
	const epoch = Math.floor(
		(tick + phase * cadence(seed, at)) / cadence(seed, at),
	);
	return set[mix(seed, at, 3 + epoch) % set.length] as string;
}

// The frame of the scramble at `tick`: `shape`'s characters with every letter
// or digit replaced by one of its kind's class, each place changing on its own
// cadence; spaces and anything that is not a letter or digit (a separator, a
// unit, a prefix) stand still. It is `shape` long, so the box it fills is the
// filler's.
export function frame(
	kind: LoadingSlot,
	shape: string,
	tick: number,
	seed = 0,
): string {
	return Array.from(shape, (char, at) =>
		DIGIT.test(char) || LETTER.test(char) ? pick(kind, seed, at, tick) : char,
	).join("");
}

// How many of `length` characters have locked `elapsed` ms into a decode of
// `duration`: none at the start, all at the end.
export function lockedAt(
	elapsed: number,
	length: number,
	duration: number,
): number {
	if (duration <= 0 || elapsed >= duration) return length;
	if (elapsed <= 0) return 0;
	return Math.min(length, Math.floor((elapsed / duration) * length));
}

// A figure or id arriving: the loaded `value` revealed up to its `locked`
// characters from the reading start (the end of a right-to-left run), the rest
// a scramble of the same kind continuing beyond them. It is `value` long and a
// tabular or mono face gives every glyph one advance, so nothing after the
// slot moves while it plays; a character that is no letter or digit is the
// value's own.
export function decode(
	value: string,
	locked: number,
	tick: number,
	seed = 0,
	rtl = false,
): string {
	const chars = Array.from(value);
	return chars
		.map((char, at) => {
			const reached = rtl ? chars.length - 1 - at : at;
			if (reached < locked) return char;
			if (DIGIT.test(char)) return pick("figure", seed, at, tick);
			if (LETTER.test(char)) return pick("id", seed, at, tick);
			return char;
		})
		.join("");
}

// The busy glyph's frame at `tick`: three mono glyphs cycling, the box three
// glyphs wide.
export function busy(tick: number, seed = 0): string {
	return frame("id", "000", tick, seed);
}

// What the busy glyph stands as under reduced motion.
export const BUSY_STILL = "···";

// The shape a figure's filler takes in a locale: its zeros grouped as the
// locale groups the digits (`0,000`, `0 000`, `0.000`, or none where the
// locale groups from five digits).
export function groupZeros(zeros: string, locale?: string): string {
	if (!/^0+$/.test(zeros)) return zeros;
	const grouped = new Intl.NumberFormat(locale).format(
		Number("9".repeat(zeros.length)),
	);
	return grouped.replace(/\p{Nd}/gu, "0");
}

// The page's one clock for every scramble, started with its first listener and
// stopped with its last.
export interface Ticker {
	// Calls `listener` with the tick number on every tick; returns the
	// unsubscribe.
	subscribe(listener: (tick: number) => void): () => void;
	// The tick the clock stands at.
	now(): number;
	// How many listeners it serves.
	readonly size: number;
}

export interface Timers {
	set(run: () => void, ms: number): unknown;
	clear(handle: unknown): void;
}

const REAL: Timers = {
	set: (run, ms) => setTimeout(run, ms),
	clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

// A ticker over `interval()` ms, read at every step so a tuned `tick` reaches
// the next one. One timer runs however many slots listen: twenty scrambles
// cost one.
export function createTicker(
	interval: () => number,
	timers: Timers = REAL,
): Ticker {
	const listeners = new Set<(tick: number) => void>();
	let tick = 0;
	let handle: unknown;
	const step = () => {
		tick += 1;
		for (const listener of [...listeners]) listener(tick);
		if (listeners.size > 0) handle = timers.set(step, interval());
		else handle = undefined;
	};
	return {
		subscribe(listener) {
			listeners.add(listener);
			if (handle === undefined) handle = timers.set(step, interval());
			return () => {
				listeners.delete(listener);
				if (listeners.size === 0 && handle !== undefined) {
					timers.clear(handle);
					handle = undefined;
				}
			};
		},
		now: () => tick,
		get size() {
			return listeners.size;
		},
	};
}
