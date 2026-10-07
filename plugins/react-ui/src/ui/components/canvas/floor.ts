import { BODY_SIZE, SIZE_PX, TYPE_SCALE } from "@fcalell/ui-core/tokens";
import type { Box } from "./geometry.ts";
import { EXTENT } from "./view.ts";

// A node's smallest text is the caption role, and its size is the text floor:
// the same number, so a node draws its words from zoom 1 up and its glyph alone
// below. Both are read from the type scale at the desktop body size.
export const TEXT_FLOOR = Math.round(
	BODY_SIZE.desktop * TYPE_SCALE.caption.size,
);

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
// px: the glyph and that gap over the smallest distance between two node
// centres, measured as the larger of the two axes' gaps (two squares touch when
// both gaps are under their size). The gap leaves the edges between glyphs a
// stretch to draw.
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
	return Math.min(1, Math.max(lowest, (glyph + 2 * pair) / nearest));
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
