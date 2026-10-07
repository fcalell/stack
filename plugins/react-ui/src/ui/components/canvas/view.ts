import type { CanvasNode, CanvasPoint } from "@fcalell/ui-core/descriptors";
import type { Box, Size } from "./geometry.ts";

export const ORIGIN: CanvasPoint = { x: 0, y: 0 };

// The places a node's position can come from besides its own: a drag's live
// one, a landing's, and the layout's.
export interface Places {
	live: ReadonlyMap<string, CanvasPoint>;
	landed: ReadonlyMap<string, CanvasPoint>;
	computed?: ReadonlyMap<string, CanvasPoint>;
}

// Where a node stands: what the pointer holds beats what the consumer gave,
// which beats a landing, which beats the layout, which beats the origin.
export function place(
	node: Pick<CanvasNode, "id" | "position">,
	{ live, landed, computed }: Places,
): CanvasPoint {
	return (
		live.get(node.id) ??
		node.position ??
		landed.get(node.id) ??
		computed?.get(node.id) ??
		ORIGIN
	);
}

// The position whose box of `size` is centred on `centre`.
export function landAt(centre: CanvasPoint, size: Size): CanvasPoint {
	return { x: centre.x - size.width / 2, y: centre.y - size.height / 2 };
}

// Pure maths of the view: where the layer stands for a graph and a pane. A
// transform maps a flow point `p` to the pane point `p * k + (x, y)`.
export interface Transform {
	x: number;
	y: number;
	k: number;
}

// Whether a box of the flow stands whole inside the pane under the transform,
// inset by `inset` on every side.
export function inside(
	box: Box,
	transform: Transform,
	pane: Size,
	inset: number,
): boolean {
	const left = box.x * transform.k + transform.x;
	const top = box.y * transform.k + transform.y;
	return (
		left >= inset &&
		top >= inset &&
		left + box.width * transform.k <= pane.width - inset &&
		top + box.height * transform.k <= pane.height - inset
	);
}

// A transform stands at whole pixels, so a stroke at a pixel's centre (`crisp`),
// a node's border and a dot of the grid stay solid at scale 1. The viewport
// applies it to every transform the canvas sets itself.
export const whole = ({ x, y, k }: Transform): Transform => ({
	k,
	x: Math.round(x),
	y: Math.round(y),
});

// The scale a pan or zoom stays within; the lower end rises with the graph
// (`minZoomFor`).
export const EXTENT: readonly [number, number] = [0.1, 2];

// A node at its own size: the one zoom its tokens are drawn for, and the text
// floor's threshold.
export const ZOOM_TO_NODE = 1;

// The transform that puts the box's centre on the pane's centre at scale `k`.
export function centredTransform(box: Box, k: number, pane: Size): Transform {
	return {
		k,
		x: pane.width / 2 - (box.x + box.width / 2) * k,
		y: pane.height / 2 - (box.y + box.height / 2) * k,
	};
}

// How far the canvas's own chrome reaches in from the pane's left and bottom
// edges (the zoom stack and the act): a fitted graph stays outside it.
export interface Clearance {
	left: number;
	bottom: number;
}

export const NO_CLEARANCE: Clearance = { left: 0, bottom: 0 };

// The part of the pane a fit may fill: inset on every side, and past the
// chrome on the left and the bottom.
function room(pane: Size, inset: number, clear: Clearance): Box {
	const x = Math.max(inset, clear.left);
	const bottom = Math.max(inset, clear.bottom);
	return {
		x,
		y: inset,
		width: pane.width - inset - x,
		height: pane.height - inset - bottom,
	};
}

// The transform that stands the bounds whole in the room the pane leaves,
// centred there, at the scale that fits and never above 1: a small graph keeps
// its own size.
export function fitTransform(
	bounds: Box,
	pane: Size,
	inset: number,
	clear: Clearance = NO_CLEARANCE,
): Transform {
	const area = room(pane, inset, clear);
	const k = Math.min(1, area.width / bounds.width, area.height / bounds.height);
	const centre = centredTransform(bounds, k, area);
	return { k, x: centre.x + area.x, y: centre.y + area.y };
}

// What a graph opens at, in the room the pane leaves (as a fit does): centred
// at scale 1 when it fits there, else at scale 1 with the first node's top
// centre on the room's centre line, `inset` below its top.
export function openTransform(
	bounds: Box,
	first: Box | undefined,
	pane: Size,
	inset: number,
	clear: Clearance = NO_CLEARANCE,
): Transform {
	const area = room(pane, inset, clear);
	const fits = bounds.width <= area.width && bounds.height <= area.height;
	if (fits || !first) {
		const centre = centredTransform(bounds, 1, area);
		return { k: 1, x: centre.x + area.x, y: centre.y + area.y };
	}
	return {
		k: 1,
		x: area.x + area.width / 2 - (first.x + first.width / 2),
		y: area.y - first.y,
	};
}
