// What a part draws while its data is not here, free of any framework: the
// filler text a slot paints, how many rows a collection paints, and how long
// a read runs before the paint shows. Both platforms run these, so a painted
// form measures the same everywhere and the same filler comes back for the
// same slot.

import { createTicker, groupZeros, kindOf, scrambles } from "./scramble.ts";
import {
	LOADING_SLOTS,
	type LoadingPaint,
	type LoadingSlot,
	MOTION_KNOBS,
	type MotionKnobName,
} from "./tokens.ts";

// The knobs' defaults (`MOTION_KNOBS` is the one source of every motion
// number), by name.
const DEFAULTS = Object.fromEntries(
	MOTION_KNOBS.map((knob) => [knob.name, knob.default]),
) as Record<MotionKnobName, number>;

// How long a read runs before its paint shows (ms): a read the local server
// answers in a few milliseconds paints nothing. Fixed, not an option: one
// rhythm for every paint of an app.
export const WAIT_DELAY = DEFAULTS.waitDelay;

// How long an act runs before its pending look shows (ms): the act is inert
// at the press, and one the server answers at once never flashes a spinner.
export const ACT_DELAY = DEFAULTS.actDelay;

// How long a read that showed its paint keeps it at least (ms): 0, so a
// read's answer lands the moment it comes.
export const WAIT_MIN = DEFAULTS.waitMin;

const listeners = new Set<() => void>();

// Tells every subscriber a knob or a loading paint moved.
function changed(): void {
	for (const listener of listeners) listener();
}

// The live tuning record, every knob of the motion contract: the phone's
// source for a number the web reads from a CSS variable, set by the bench and
// applied on the next read, as the variables are. A reader that must follow a
// change reads `tuned[name]` as a `useSyncExternalStore` snapshot over
// `subscribeMotion`, and a writer goes through `tune` so it is told.
export const tuned: Record<MotionKnobName, number> = { ...DEFAULTS };

export function tune(name: MotionKnobName, value: number): void {
	tuned[name] = value;
	changed();
}

export function subscribeMotion(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

// The paint each glyph slot's waiting form takes, set once from
// `theme.loading` (omitted, all pulse).
export const loading: Record<LoadingSlot, LoadingPaint> = Object.fromEntries(
	LOADING_SLOTS.map((slot) => [slot, "pulse"]),
) as Record<LoadingSlot, LoadingPaint>;

export function setLoading(next: Partial<Record<LoadingSlot, LoadingPaint>>) {
	Object.assign(loading, next);
	changed();
}

// Whether a role's waiting slot is scrambled, not pulsing: its kind's paint is
// the scramble and its slot is one line (a wrapping one always pulses). The
// platforms still their scramble under reduced motion.
export function scrambled(role: PaintRole): boolean {
	return loading[kindOf(role)] === "scramble" && scrambles(role);
}

// The page's one clock for every scramble and busy glyph, ticking at
// `tuned.tick`.
export const ticker = createTicker(() => tuned.tick);

// The three waits as the older bench set them: one object whose members are
// the knobs of the same names, so the two never disagree.
export const timings = {
	get waitDelay() {
		return tuned.waitDelay;
	},
	set waitDelay(value: number) {
		tune("waitDelay", value);
	},
	get actDelay() {
		return tuned.actDelay;
	},
	set actDelay(value: number) {
		tune("actDelay", value);
	},
	get waitMin() {
		return tuned.waitMin;
	},
	set waitMin(value: number) {
		tune("waitMin", value);
	},
};

// How much longer a first load's data waits (ms) when it comes `elapsed` ms
// after the fetch began: nothing while the paint has not shown, else until
// the paint has stood for `waitMin`. `QueryProvider hold` takes it.
export function holdFor(elapsed: number): number {
	if (elapsed < timings.waitDelay) return 0;
	return Math.max(0, timings.waitDelay + timings.waitMin - elapsed);
}

// Painted rows, options, messages, cells and lines of a collection or text
// block whose length is not known.
export const PAINT_ROWS = 4;

export type PaintRole =
	| "title"
	| "name"
	| "word"
	| "phrase"
	| "sentence"
	| "paragraph"
	| "figure"
	| "id";

// Lengths in characters; `at` cycles them so neighbours differ.
const LENGTHS: Record<PaintRole, readonly number[]> = {
	title: [22, 28, 16],
	name: [12, 9, 15],
	word: [6, 8, 5],
	phrase: [16, 12, 20],
	sentence: [64, 52, 72],
	paragraph: [180, 140],
	figure: [3, 4, 2],
	id: [10, 8, 12],
};

// Figures and ids are tabular or mono digits; the rest is words.
const DIGITS: ReadonlySet<PaintRole> = new Set(["figure", "id"]);

// Letters of the filler's words, so it reads as text of that length.
const LETTERS = "etaoinsrhldcumfpgwybvk";

// Words of 3 to 7 letters, spaces between, `length` characters in all and the
// same for the same arguments.
export function paintText(role: PaintRole, at = 0): string {
	const lengths = LENGTHS[role];
	const length = lengths[Math.abs(at) % lengths.length] ?? 0;
	if (DIGITS.has(role)) return "0".repeat(length);
	let seed = Math.abs(at) + 1;
	const next = (to: number) => {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		return seed % to;
	};
	let text = "";
	while (text.length < length) {
		const word = Array.from(
			{ length: 3 + next(5) },
			() => LETTERS[next(LETTERS.length)],
		).join("");
		text += text ? ` ${word}` : word;
	}
	// Cut at the length, never on a space, so the last word is whole or short.
	return text.slice(0, length).trimEnd().padEnd(length, "e");
}

// A role's filler as a scramble is shaped: `paintText` with a figure's zeros
// grouped as `locale` groups its digits, so the scrambled box is the one the
// pulse draws.
export function paintShape(role: PaintRole, at = 0, locale?: string): string {
	const text = paintText(role, at);
	return role === "figure" ? groupZeros(text, locale) : text;
}

// A row slot run over a painted item: a slot that throws on the filler (it
// reads a field the filler does not have) paints as the item itself, never
// throws the page.
export function painting<T, R>(fn: (item: T) => R, item: T): R | T {
	try {
		return fn(item);
	} catch {
		return item;
	}
}
