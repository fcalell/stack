// How a long collection windows, free of any framework: from how many loaded
// rows it draws only those near the scroller's view, how far past each edge
// the view it keeps rows, and the arithmetic that turns the rows a virtualizer
// placed into the children of the box (rows and the spacers that stand in for
// the rest). The web runs it over TanStack Virtual; the arithmetic is here so
// it is tested without a DOM.

// Loaded rows from which a collection windows, under a scroller. Fewer
// always draw whole, so a painted form (PAINT_ROWS) never windows. Fifty is
// about two screens of rows, one frame's mount work on a normal machine, so a
// shorter collection keeps find in page and a longer one pays only for its view.
export const VIRTUAL_FROM = 50;

// Rows mounted past each edge of the scroller's view, so a fast scroll meets
// drawn rows before measured ones.
export const OVERSCAN = 8;

// A mounted row as the virtualizer places it: box-relative pixels.
export interface Placed {
	index: number;
	start: number;
	end: number;
}

// One child of the box: a row, or the space of the unmounted rows before row
// `before` (the count, at the end).
export type Slot = { row: number } | { space: number; before: number };

// The box's children in order: each mounted row, and a spacer for each run of
// unmounted ones. The box's own gap stands between neighbours, a spacer
// included, so each spacer gives back the gaps its neighbours already add:
// one at the top and the bottom, two between runs. A zero height is omitted.
export function slotsOf(
	placed: readonly Placed[],
	count: number,
	total: number,
	gap: number,
): Slot[] {
	const slots: Slot[] = [];
	const space = (height: number, before: number) => {
		if (height > 0) slots.push({ space: height, before });
	};
	if (placed.length === 0) {
		space(total, count);
		return slots;
	}
	let last: Placed | undefined;
	for (const row of placed) {
		if (!last) space(row.start - gap, row.index);
		else if (row.index > last.index + 1) {
			space(row.start - last.end - 2 * gap, row.index);
		}
		slots.push({ row: row.index });
		last = row;
	}
	if (last && last.index < count - 1) space(total - last.end - gap, count);
	return slots;
}

// The indices to mount: TanStack's range with its overscan, plus the rows kept
// whatever the scroll (the focused row, a table's cursor). Sorted, unique and
// within the count; a kept index outside it is ignored.
export function ranged(
	range: {
		startIndex: number;
		endIndex: number;
		overscan: number;
		count: number;
	},
	keep: readonly (number | undefined)[],
): number[] {
	const { startIndex, endIndex, overscan, count } = range;
	const set = new Set<number>();
	for (
		let i = Math.max(0, startIndex - overscan);
		i <= Math.min(count - 1, endIndex + overscan);
		i++
	) {
		set.add(i);
	}
	for (const i of keep) {
		if (i !== undefined && Number.isInteger(i) && i >= 0 && i < count) {
			set.add(i);
		}
	}
	return [...set].sort((a, b) => a - b);
}
