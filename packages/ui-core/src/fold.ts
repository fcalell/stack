import { sizeOf, spacingOf } from "./scales.ts";
import { MEASURE_CHARACTERS, SANS_ADVANCE } from "./tokens.ts";

// How a Pane's head folds its acts and a list row its marks, free of any
// framework: the head is one line, its title keeps a floor of two fifths of
// the row, and the acts that do not fit beside it fold into the head's more
// menu, the last first, and come back when there is room. A row's text group
// keeps the same floor and its marks fold the same way, with no menu to go to;
// its labelled act folds whole into the row's more menu (`actStands`).
// Both platforms measure their own row (the web by an observer, the phone by
// its layout) and run this over the numbers, so a row folds at the same
// widths everywhere.

// The share of the row the title keeps (a structural fraction, never a width):
// `PAGE_TITLE_FLOOR` says it as the class.
export const TITLE_FLOOR = 2 / 5;

// What the head measured, in one unit of length.
export interface FoldRoom {
	// The row's width.
	row: number;
	// What the row's other items take: the back act or the switcher before the
	// title and the close act after the acts, each with the gap beside it.
	fixed: number;
	// How far the acts reach past the row's end (a touch bar's acts reach the
	// page inset by their end).
	overhang: number;
	// One act's width; the more act is the same box.
	unit: number;
	// The gap between the acts, and between the title and the first.
	gap: number;
	// How many acts the head is given.
	acts: number;
	// Whether the head has a more menu of its own, so the more act stands even
	// when every act fits.
	more: boolean;
}

// What a fold decides over: the room the items and their more item may take,
// each item's own width and the gap between them.
export interface FoldItems {
	budget: number;
	widths: readonly number[];
	gap: number;
	// The width of the more item that stands whenever one of the items folds,
	// the last first; absent when folded items have nowhere to go (a row's
	// marks), and then none stands for them.
	more?: number;
	// Whether the more item stands though every item fits (a head's own menu).
	holds?: boolean;
	// How many never fold: a row's first mark.
	least?: number;
	// The narrowest each item can be cut to, in order: the glyph a lock keeps
	// when it yields its label. The items `least` keeps are cut to it before a
	// later item folds, so they count at it, not at their whole width; an item
	// with none, or past `least`, counts whole.
	floors?: readonly (number | undefined)[];
}

// How many of the items stand: the first this many, the rest folded, and they
// come back as the room grows. It is the one rule both folds run: a head's
// acts (`actsShown`) and a row's marks (`marksShown`). An item folds whole,
// never cut to fit, and the more item holds its place before an item does;
// one the `least` keeps is cut only where it alone is wider than the room.
export function itemsShown(items: FoldItems): number {
	const { budget, gap, more, holds = false, least = 0, floors } = items;
	// A kept item that can be cut counts at its floor: whether a later item
	// stands never depends on how much room the kept one happens to hold.
	const widths = items.widths.map((one, at) => {
		const floor = at < least ? floors?.[at] : undefined;
		return floor === undefined ? one : Math.min(one, floor);
	});
	const total = widths.length;
	let width = widths.reduce((sum, one) => sum + one, 0);
	for (let shown = total; shown > least; shown--) {
		const extra = more !== undefined && (shown < total || holds);
		const count = shown + (extra ? 1 : 0);
		const take = width + (extra ? more : 0) + (count - 1) * gap;
		if (take <= budget) return shown;
		width -= widths[shown - 1] ?? 0;
	}
	return Math.min(least, total);
}

// How many of the head's acts stand in the row: the first this many, the rest
// folded into the more menu. The more act stands whenever one is folded, and it
// holds its place before an act does; with no room at all the title still keeps
// its floor.
export function actsShown(room: FoldRoom): number {
	const { row, fixed, overhang, unit, gap, acts, more } = room;
	return itemsShown({
		budget: row * (1 - TITLE_FLOOR) - fixed - gap + overhang,
		widths: Array<number>(acts).fill(unit),
		gap,
		more: unit,
		holds: more,
	});
}

// What a list row measured, in one unit of length.
export interface MarksRoom {
	// The row's width inside its padding.
	row: number;
	// What the row holds besides its text group and the column the marks stand
	// in: the leading parts, the other end items, each with the gap beside it.
	fixed: number;
	// The marks' own widths, whole, in order.
	widths: readonly number[];
	// The narrowest each mark can be cut to (`FoldItems.floors`); the first
	// mark, which never folds, is cut to it before a later one folds.
	floors?: readonly (number | undefined)[];
	// The gap between marks.
	gap: number;
	// How many never fold: the first (the default), or none where another end
	// item (a pick) is the one thing the end must say, so every mark folds
	// before the text group drops under its floor.
	least?: number;
}

// A pill word is never cut (voice 12, 14): a chip keeps its whole width where
// it stands, the first mark included, and on touch the text group's floor
// yields to the marks that stand (the name truncates or wraps before a pill
// does); only the other first marks (a status's word, a warning, a lock) are
// cut as below.
// How many of a row's marks stand in its end group: the text group keeps its
// two fifths (`TITLE_FLOOR`), and the marks that do not fit whole in the rest
// fold away, the last first. They have no menu to go to, so they are not drawn;
// the first never folds, as the row's one thing the end must say, and is cut
// only where it alone is wider than the room (a row composed for more than its
// width; a status then stands as its dot, `firstFits`) or where a later mark
// would otherwise fold: a lock yields its label to its glyph before the chip
// beside it goes (`markFloors`; a warning is cut after the chip folds); beside
// a pick, which says it, none is kept.
export function marksShown(room: MarksRoom): number {
	const { row, fixed, widths, floors, gap, least = 1 } = room;
	return itemsShown({
		budget: row * (1 - TITLE_FLOOR) - fixed,
		widths,
		floors,
		gap,
		least,
	});
}

// The marks of a list row, in the order they stand.
export type MarkKind = "status" | "warning" | "lock" | "chip" | "mark";

// The one mark that yields its label to its glyph so a later mark can stand: a
// lock (`marksShown`'s `floors`). Every other mark, a warning whose label also
// stops at its glyph included, is cut only where it alone is wider than the
// room, so the mark after it folds first.
const YIELDS: readonly MarkKind[] = ["lock"];

// The floors a row's marks declare (the glyph each box keeps), kept only for
// the marks that yield.
export function markFloors(
	kinds: readonly MarkKind[],
	declared: readonly (number | undefined)[],
): (number | undefined)[] {
	return kinds.map((kind, at) =>
		YIELDS.includes(kind) ? declared[at] : undefined,
	);
}

// Whether the first mark stands whole in the room the marks have. A status that
// does not falls back to its dot alone (the word kept as its name), never a
// word cut to a letter; the marks after it have folded already.
export function firstFits(room: MarksRoom): boolean {
	const { row, fixed, widths } = room;
	return (widths[0] ?? 0) <= row * (1 - TITLE_FLOOR) - fixed;
}

// What a list row with a labelled act measured, in one unit of length.
export interface RowActRoom {
	// The row's width inside its padding.
	row: number;
	// What the row holds besides its text group and the act: the leading parts,
	// the end group's other items (its marks whole, its value counting nothing:
	// it is cut to the room the others leave) and its own more act, each with
	// the gap beside it.
	fixed: number;
	// The act's width, whole.
	act: number;
}

// Whether a row's labelled act stands in its end group: the text group keeps
// its two fifths (`TITLE_FLOOR`), and an act that does not fit whole in the
// rest folds into the row's more menu, coming back when there is room. It is
// the head's rule for one act: never cut to fit.
export function actStands(room: RowActRoom): boolean {
	const { row, fixed, act } = room;
	return (
		itemsShown({
			budget: row * (1 - TITLE_FLOOR) - fixed,
			widths: [act],
			gap: 0,
		}) === 1
	);
}

// The narrowest a row's content can be for its one-line form: the name, one meta
// and the end group's marks, each at the desktop set's figures (the touch set
// is the two-line form already). A name and a meta are the short measure each
// (20 characters, `ROW_TEXT_FLOOR`'s text) and stand in the text group at its
// floor of `TITLE_FLOOR` of the row, a gap between them; the end group, the
// rest of the row, holds a chip and a status pill, each a short-measure word at
// the caption size, and the gap between them, whole. The row is as wide as the
// wider of the two needs (765 px; the name and meta bind), whatever the
// device or the viewport: a row in a narrower container takes the two-line
// form (voice 14) rather than cut its meta.
const CHARACTERS = MEASURE_CHARACTERS["measure-short"] * SANS_ADVANCE;
const ONE_LINE_TEXT =
	CHARACTERS * (sizeOf("desktop", "body") + sizeOf("desktop", "meta")) +
	spacingOf("desktop", "gap");
const ONE_LINE_END =
	2 * CHARACTERS * sizeOf("desktop", "caption") + spacingOf("desktop", "gap");
export const ROW_ONE_LINE = Math.ceil(
	Math.max(ONE_LINE_TEXT / TITLE_FLOOR, ONE_LINE_END / (1 - TITLE_FLOOR)),
);

// Whether a row of this content width (inside its padding) stands in one line.
export function rowStandsOneLine(row: number): boolean {
	return row >= ROW_ONE_LINE;
}
