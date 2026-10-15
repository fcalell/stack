// What a part draws while its data is not here, free of any framework: the
// filler text a slot paints, how many rows a collection paints, and how long
// a read runs before the paint shows. Both platforms run these, so a painted
// form measures the same everywhere and the same filler comes back for the
// same slot.

// How long a read runs before its paint shows (ms): a read the local server
// answers in a few milliseconds paints nothing. Fixed, not an option: one
// rhythm for every paint of an app.
export const WAIT_DELAY = 400;

// How long an act runs before its pending look shows (ms): the act is inert
// at the press, and one the server answers at once never flashes a spinner.
export const ACT_DELAY = 300;

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

// A row slot run over a painted item: a slot that throws on the filler (it
// reads a field the filler does not have) paints as the item itself, never
// throws the page.
export function painting<T, R>(fn: (item: T) => R, item: T): R | T {
	try {
		return fn(item);
	} catch (error) {
		if (
			typeof process !== "undefined" &&
			process.env?.NODE_ENV !== "production"
		) {
			console.warn(
				"A slot threw over a painted item; it paints instead.",
				error,
			);
		}
		return item;
	}
}
