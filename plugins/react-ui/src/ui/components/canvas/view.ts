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

// Where a flow point stands in the pane under the transform.
export const paneOf = (
	point: CanvasPoint,
	{ x, y, k }: Transform,
): CanvasPoint => ({
	x: point.x * k + x,
	y: point.y * k + y,
});

// The box's centre, a flow point.
export const centreOf = (box: Box): CanvasPoint => ({
	x: box.x + box.width / 2,
	y: box.y + box.height / 2,
});

// The transform at scale `k` that keeps the flow point under `anchor` (a pane
// point) where it stands: the one zoom a tap, a button and a pinch share.
export function zoomAbout(
	transform: Transform,
	anchor: CanvasPoint,
	k: number,
): Transform {
	const ratio = k / transform.k;
	return {
		k,
		x: anchor.x - (anchor.x - transform.x) * ratio,
		y: anchor.y - (anchor.y - transform.y) * ratio,
	};
}

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
	// How far the part against the left edge reaches up from the pane's bottom.
	stack: number;
}

export const NO_CLEARANCE: Clearance = { left: 0, bottom: 0, stack: 0 };

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
// its own size. It is the Fit act's view and the view a graph opens at, so
// what opens is what Fit gives back.
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
