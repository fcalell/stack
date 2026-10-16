// How a Pane's head folds its acts, free of any framework: the head is one
// line, its title keeps a floor of two fifths of the row, and the acts that
// do not fit beside it fold into the head's more menu, the last first, and
// come back when there is room. Both platforms measure their own row (the web
// by an observer, the phone by its layout) and run this over the numbers, so
// a head folds at the same widths everywhere.

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

// How many of the head's acts stand in the row: the first this many, the rest
// folded into the more menu. The more act stands whenever one is folded, and it
// holds its place before an act does; with no room at all the title still keeps
// its floor.
export function actsShown(room: FoldRoom): number {
	const { row, fixed, overhang, unit, gap, acts, more } = room;
	const budget = row * (1 - TITLE_FLOOR) - fixed - gap + overhang;
	for (let shown = acts; shown > 0; shown--) {
		const items = shown + (shown < acts || more ? 1 : 0);
		if (items * unit + (items - 1) * gap <= budget) return shown;
	}
	return 0;
}
