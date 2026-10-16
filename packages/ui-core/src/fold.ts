// How a Pane's head folds its acts and a list row its marks, free of any
// framework: the head is one line, its title keeps a floor of two fifths of
// the row, and the acts that do not fit beside it fold into the head's more
// menu, the last first, and come back when there is room. A row's text group
// keeps the same floor and its marks fold the same way, with no menu to go to.
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
	// How many stand whatever the room says: a row's first mark.
	least?: number;
}

// How many of the items stand: the first this many, the rest folded, and they
// come back as the room grows. It is the one rule both folds run: a head's
// acts (`actsShown`) and a row's marks (`marksShown`). An item is never cut,
// so it stands whole or folds away; the more item holds its place before an
// item does.
export function itemsShown(items: FoldItems): number {
	const { budget, widths, gap, more, holds = false, least = 0 } = items;
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
	// The gap between marks.
	gap: number;
}

// How many of a row's marks stand in its end group: the text group keeps its
// two fifths (`TITLE_FLOOR`), and the marks that do not fit whole in the rest
// fold away, the last first. They have no menu to go to, so they are not drawn;
// the first stands whatever the room, as the row's one thing the end must say.
export function marksShown(room: MarksRoom): number {
	const { row, fixed, widths, gap } = room;
	return itemsShown({
		budget: row * (1 - TITLE_FLOOR) - fixed,
		widths,
		gap,
		least: 1,
	});
}
