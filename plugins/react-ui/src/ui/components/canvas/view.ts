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

// Where a span of `size` starting at `start` stands within a pane's `extent`,
// inset on both ends: moved just enough to stand whole, or to the near end when
// it is longer than the room.
function clamp(start: number, size: number, extent: number, inset: number) {
	if (start < inset || extent - 2 * inset < size) return inset;
	return Math.min(start, extent - inset - size);
}

// The transform shifted just enough that the box (a box of the flow) stands whole
// in the pane, inset on every side; unchanged when it already does. A box larger
// than the pane keeps its top left in view.
export function shiftInto(
	box: Box,
	transform: Transform,
	pane: Size,
	inset: number,
): Transform {
	const { k } = transform;
	const left = box.x * k + transform.x;
	const top = box.y * k + transform.y;
	return {
		k,
		x: transform.x + clamp(left, box.width * k, pane.width, inset) - left,
		y: transform.y + clamp(top, box.height * k, pane.height, inset) - top,
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

// The scale a fit never goes under: the one at which a node draws its title
// and its line, its own size (`ZOOM_TO_NODE`, the text floor). A graph that
// holds only under it is fitted at it and cut at the far edge, so the words stay
// readable and the reader pans for the rest; a zoom by hand still goes under.
export const FIT_FLOOR = ZOOM_TO_NODE;

// Where a span of `size` stands on one axis of a room of `extent` from `origin`,
// as the offset the transform adds: centred when it fits, else its start
// (`start`, the span's own offset) at the room's start; and, with a `centre`
// (the graph's start node's, as an offset in the span), that centre on the
// room's, held so the span still covers the room's ends.
function framed(
	span: { start: number; size: number },
	room: { origin: number; extent: number },
	k: number,
	centre?: number,
): number {
	const size = span.size * k;
	if (size <= room.extent)
		return room.origin + (room.extent - size) / 2 - span.start * k;
	const first = room.origin - span.start * k;
	if (centre === undefined) return first;
	const wanted = room.origin + room.extent / 2 - centre * k;
	// The span's start may not pass the room's, nor its end stop short of it.
	return Math.max(
		room.origin + room.extent - (span.start + span.size) * k,
		Math.min(first, wanted),
	);
}

// What a graph holds that a framed view keeps in view or clear: its nodes' boxes
// (kept clear of the zoom stack's corner) and its group frames (each head, which
// starts at its frame's left, kept in view).
export interface Parts {
	nodes: readonly Box[];
	frames: readonly Box[];
}

// The offset `x` of a framed graph (scale `k`, offset `y` down) moved where the
// parts ask: every group head in view, its frame's start at the inset, as far as
// the start node allows (whole in the room, or against the room's start where it
// is wider than the room); then clear of the chrome's corner, no node's box
// meeting the zoom stack's, whichever of the offsets the graph may stand at
// (`lo` to `hi`: its far end at the room's, its start at the room's) is nearest.
// Where none is clear, the offset stays.
function kept(
	x: number,
	view: { k: number; y: number; lo: number; hi: number },
	room: { area: Box; inset: number; pane: Size; clear: Clearance },
	parts: Parts,
	start?: Box,
): number {
	const { k, y, lo, hi } = view;
	const { area, inset, pane, clear } = room;
	let at = x;
	if (start) {
		const cap =
			start.width * k > area.width
				? area.x - start.x * k
				: area.x + area.width - (start.x + start.width) * k;
		const need = Math.max(...parts.frames.map((frame) => inset - frame.x * k));
		at = Math.max(x, Math.min(need, cap, hi));
	}
	// The offsets that put a node in the corner: the stack's columns, over the
	// rows it reaches up the pane.
	const top = pane.height - clear.stack;
	const meets = parts.nodes
		.filter(
			(node) =>
				(node.y + node.height) * k + y > top && pane.height > node.y * k + y,
		)
		.map(
			(node) => [-(node.x + node.width) * k, clear.left - node.x * k] as const,
		);
	const free = (offset: number) =>
		meets.every(([from, to]) => from >= offset || offset >= to);
	if (free(at)) return at;
	const options = [lo, hi, ...meets.flat()].filter(
		(offset) => Math.min(hi, Math.max(lo, offset)) === offset && free(offset),
	);
	return options.length === 0
		? at
		: options.reduce((best, one) =>
				Math.abs(best - at) > Math.abs(one - at) ? one : best,
			);
}

// The transform that stands the bounds whole in the room the pane leaves,
// centred there, at the scale that fits and never above 1: a small graph keeps
// its own size. It is the Fit act's view and the view a graph opens at, so
// what opens is what Fit gives back. The scale never falls under `FIT_FLOOR`:
// a graph that holds only under it is framed at its start instead, its top at
// the room's top and `start` (the box of the graph's first node), when it is
// wider than the room, at the room's middle, so a graph narrower than the room
// stays centred across. With the graph's `parts`, a framed view also keeps every
// group head in view and no node under the zoom stack's corner (`kept`).
export function fitTransform(
	bounds: Box,
	pane: Size,
	inset: number,
	clear: Clearance = NO_CLEARANCE,
	start?: Box,
	parts?: Parts,
): Transform {
	const area = room(pane, inset, clear);
	const fits = Math.min(
		1,
		area.width / bounds.width,
		area.height / bounds.height,
	);
	const k = Math.max(FIT_FLOOR, fits);
	if (k === fits) {
		const centre = centredTransform(bounds, k, area);
		return { k, x: centre.x + area.x, y: centre.y + area.y };
	}
	const y = framed(
		{ start: bounds.y, size: bounds.height },
		{ origin: area.y, extent: area.height },
		k,
	);
	const x = framed(
		{ start: bounds.x, size: bounds.width },
		{ origin: area.x, extent: area.width },
		k,
		start && start.x + start.width / 2,
	);
	if (!parts) return { k, x, y };
	return {
		k,
		x: kept(
			x,
			{
				k,
				y,
				lo: area.x + area.width - (bounds.x + bounds.width) * k,
				hi: area.x - bounds.x * k,
			},
			{ area, inset, pane, clear },
			parts,
			start,
		),
		y,
	};
}
