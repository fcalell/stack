import type { Box, Size } from "./geometry.ts";

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

function centred(bounds: Box, pane: Size, k: number): Transform {
	return {
		k,
		x: pane.width / 2 - (bounds.x + bounds.width / 2) * k,
		y: pane.height / 2 - (bounds.y + bounds.height / 2) * k,
	};
}

// The transform that stands the bounds whole in the pane, centred, at the
// scale that fits and never above 1: a small graph keeps its own size.
export function fitTransform(
	bounds: Box,
	pane: Size,
	inset: number,
): Transform {
	const k = Math.min(
		1,
		(pane.width - 2 * inset) / bounds.width,
		(pane.height - 2 * inset) / bounds.height,
	);
	return centred(bounds, pane, k);
}

// What a graph opens at: centred at scale 1 when it fits there, else at scale
// 1 with the first node's top centre on the pane's centre line, `inset` below
// its top.
export function openTransform(
	bounds: Box,
	first: Box | undefined,
	pane: Size,
	inset: number,
): Transform {
	const fits =
		bounds.width <= pane.width - 2 * inset &&
		bounds.height <= pane.height - 2 * inset;
	if (fits || !first) return centred(bounds, pane, 1);
	return {
		k: 1,
		x: pane.width / 2 - (first.x + first.width / 2),
		y: inset - first.y,
	};
}
