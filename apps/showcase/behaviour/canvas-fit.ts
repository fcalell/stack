import { BODY_SIZE, TYPE_SCALE } from "@fcalell/ui-core/tokens";
import { px, rect, viewport } from "./canvas-support.ts";

// What a canvas opens at, read off the DOM (003-189 round 2, with 003-291's
// loop frames): the text floor first, so a node's text is never under the
// floor at the first view, and the first node and its group stand whole in the
// pane. Each check throws with the measure that failed.

// The smallest text a node draws is the caption role at the desktop body size.
export const FLOOR = Math.round(BODY_SIZE.desktop * TYPE_SCALE.caption.size);

// How far a box reaches past the pane, in px, on its worst edge: 0 when whole.
export function clipped(box: DOMRect, pane: DOMRect): number {
	return Math.max(
		0,
		pane.left - box.left,
		box.right - pane.right,
		pane.top - box.top,
		box.bottom - pane.bottom,
	);
}

export const frameOf = (region: Element, id: string): HTMLElement => {
	const found = region.querySelector<HTMLElement>(`[data-group="${id}"]`);
	if (!found) throw new Error(`no frame for the group ${id}`);
	return found;
};

// The first view stands at the node's own size: its text is at the floor or
// above (zoom 1 and up), and no node is drawn as its glyph alone.
export function atTheFloor(region: Element, label: string) {
	const { scale } = viewport(region);
	if (scale < 1 - 1e-6)
		throw new Error(`${label} opens at scale ${scale}, under the text floor`);
	if (region.querySelector("[data-layer] > div:not([data-group]) > button"))
		throw new Error(`${label} draws a glyph at the first view`);
}

// Each box stands whole in the pane.
export function whole(region: Element, label: string, ...boxes: Element[]) {
	const pane = rect(region);
	for (const element of boxes) {
		const out = clipped(rect(element), pane);
		if (out > 0.5)
			throw new Error(
				`${label}: ${element.textContent?.slice(0, 24)} reaches ${out.toFixed(1)} px past the pane`,
			);
	}
}

// No group frame that stands in the pane has its bottom under the zoom stack:
// where a frame is over the stack's columns its bottom keeps `air` above its top.
export function clearOfTheStack(region: Element, label: string, air = 8) {
	const stack = region.querySelector("[data-clear='left']");
	if (!stack) throw new Error(`${label} has no zoom stack`);
	const under = rect(stack);
	const pane = rect(region);
	for (const frame of region.querySelectorAll("[data-group]")) {
		const box = rect(frame);
		if (box.right <= pane.left || box.left >= pane.right) continue;
		if (box.right <= under.left || box.left >= under.right) continue;
		if (box.top >= under.bottom) continue;
		if (box.bottom > under.top - air + 0.5)
			throw new Error(
				`${label}: the group ${frame.getAttribute("data-group")} ends ${(box.bottom - under.top).toFixed(1)} px under the zoom stack's top (needs ${air} px clear)`,
			);
	}
}

// Everything the graph draws stands in the pane (where it all fits at the floor).
export function allInside(region: Element, label: string) {
	whole(
		region,
		label,
		...region.querySelectorAll("[data-layer] > button, [data-group]"),
	);
}

// The text of an `empty` canvas: at the floor size, whole, a `pair` under the node.
export function captionHeld(region: Element, text: Element, node: Element) {
	const size = Number.parseFloat(getComputedStyle(text).fontSize);
	if (size < FLOOR - 0.01)
		throw new Error(`the empty text is ${size} px, under the floor ${FLOOR}`);
	whole(region, "the empty canvas", text, node);
	const gap = rect(text).top - rect(node).bottom;
	if (gap < px("pair") - 0.5)
		throw new Error(`the empty text is ${gap.toFixed(1)} px under the node`);
}
