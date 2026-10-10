import {
	BODY_SIZE,
	MEASURE_CHARACTERS,
	SANS_ADVANCE,
	SIZE_PX,
	TYPE_SCALE,
} from "@fcalell/ui-core/tokens";
import type { Box } from "./geometry.ts";
import { EXTENT } from "./view.ts";

// A node's smallest text is the caption role, and its size is the text floor:
// the same number, so a node draws its words from zoom 1 up and its glyph alone
// below. Both are read from the type scale at the desktop body size.
export const TEXT_FLOOR = Math.round(
	BODY_SIZE.desktop * TYPE_SCALE.caption.size,
);

// Between the full node (zoom 1 and up) and the glyph alone, a node under zoom 1
// is its overview: the glyph with its name beside it, at the floor size. This is
// the lowest zoom the overview stands at before a graph raises it; under it a
// node is its glyph alone. Raised, never lowered, by `overviewFloorFor`.
export const OVERVIEW_FLOOR = 0.5;

// The variable the region keeps at `1 / zoom`, and the style that holds a part
// of the layer at its own size on screen: a coordinate of the layer, known at
// run time, written outside React.
export const UNZOOM_VAR = "--canvas-unzoom";
export const UNZOOM = { scale: `var(${UNZOOM_VAR})` };

// Whether text of `text` px at zoom 1 renders under `floor` px at `zoom`.
export function belowFloor(zoom: number, text: number, floor: number): boolean {
	return zoom * text < floor;
}

// A glyph's size on screen: the `control` role at the density.
export function glyphSize(touch: boolean): number {
	return SIZE_PX[touch ? "touch" : "desktop"].control;
}

// The lowest zoom at which no two glyphs of `glyph` px stand closer than `2 * pair`
// px, with every route between two of them as long as that gap: the glyph and the
// gap over the smallest distance between two node centres, measured as the
// larger of the two axes' gaps (two squares touch when both gaps are under their
// size). A route runs between the nodes' routing boxes (`routeSide`), each up to
// `pair` flow units wider than its glyph, so the distance counts less that
// rounding and the edges between glyphs keep a stretch to draw.
export function minZoomFor(
	boxes: readonly Box[],
	glyph: number,
	pair: number,
): number {
	const [lowest] = EXTENT;
	let nearest = Number.POSITIVE_INFINITY;
	boxes.forEach((one, index) => {
		for (const two of boxes.slice(index + 1))
			nearest = Math.min(
				nearest,
				Math.max(
					Math.abs(one.x + one.width / 2 - (two.x + two.width / 2)),
					Math.abs(one.y + one.height / 2 - (two.y + two.height / 2)),
				),
			);
	});
	const room = nearest - pair;
	if (room <= 0) return 1;
	return Math.min(1, Math.max(lowest, (glyph + 2 * pair) / room));
}

// The widest a node's name stands on screen at the density: the short measure in
// characters of the caption, at the sans advance. It is the cap, not the name's
// own width, so the floor a graph needs does not move with its words.
export function nameCap(touch: boolean): number {
	const caption = Math.round(
		BODY_SIZE[touch ? "touch" : "desktop"] * TYPE_SCALE.caption.size,
	);
	return Math.ceil(
		MEASURE_CHARACTERS["measure-short"] * SANS_ADVANCE * caption,
	);
}

// The zoom under which a graph's nodes are their glyphs alone: the overview's
// floor, at least `OVERVIEW_FLOOR` and the lowest zoom at which no two overview
// forms stand closer than `air`. A form is its glyph, the `gap` after it and
// its name at the cap, `width` px wide in all, `glyph` px high; on screen two
// forms clear each other when their centres stand `width + air` apart across or
// `glyph + air` apart down, and each pair asks the nearer of the two zooms
// that reach one of them. A pair whose centres coincide, or a floor of 1 or more,
// leaves the graph no overview: the floor is then 1, the full node's own.
export function overviewFloorFor(
	boxes: readonly Box[],
	glyph: number,
	width: number,
	air: number,
): number {
	let need = 0;
	boxes.forEach((one, index) => {
		for (const two of boxes.slice(index + 1)) {
			const across = Math.abs(one.x + one.width / 2 - (two.x + two.width / 2));
			const down = Math.abs(one.y + one.height / 2 - (two.y + two.height / 2));
			need = Math.max(
				need,
				Math.min(
					across === 0 ? Number.POSITIVE_INFINITY : (width + air) / across,
					down === 0 ? Number.POSITIVE_INFINITY : (glyph + air) / down,
				),
			);
		}
	});
	return Math.min(1, Math.max(OVERVIEW_FLOOR, need));
}

// The side, in flow units, of the box a node's edges and frames route to under
// the floor: its glyph's size on screen over the zoom, rounded up to a multiple
// of `step` so a wheel tick between two multiples routes nothing again. Above
// the floor it is 0 and a node routes to its card.
export function routeSide(zoom: number, glyph: number, step: number): number {
	if (!belowFloor(zoom, TEXT_FLOOR, TEXT_FLOOR)) return 0;
	return Math.ceil(glyph / zoom / step) * step;
}

// Each box as a square of `side`, on the same centre: where its glyph stands.
export function glyphBoxes(
	boxes: ReadonlyMap<string, Box>,
	side: number,
): Map<string, Box> {
	return new Map(
		[...boxes].map(([id, box]) => [
			id,
			{
				x: box.x + box.width / 2 - side / 2,
				y: box.y + box.height / 2 - side / 2,
				width: side,
				height: side,
			},
		]),
	);
}
