// Drag and drop, free of any framework: when a press becomes a drag, which side
// of a row a pointer is on, where a move lands in an order, the speed a
// scroller is carried at near its edge, how long a hold opens a branch and
// which drop a drag is accepted by.
// The web runs it over pointer events (`lib/drag` of react-ui); the arithmetic
// is here so it is tested without a DOM.

import type { Moved } from "./descriptors.ts";

// The distance (px) a mouse or pen moves with the button down before the press
// is a drag; below it the press is a click.
export const DRAG_SLOP = 4;

// A finger holds this long (ms) on a row, without moving past `HOLD_SLOP`
// (px), before the press is a drag: a finger that moves sooner is scrolling
// the page.
export const DRAG_HOLD = 400;
export const HOLD_SLOP = 8;

// The band (px) inside a scroller's edge where a drag carries it, and the most
// (px a frame) it carries it at, at the edge itself and beyond.
export const SCROLL_EDGE = 48;
export const SCROLL_MAX = 24;

// An accepted drag held this long (ms) over a folded branch opens it.
export const DROP_HOLD = 600;

export type Pointer = "mouse" | "pen" | "touch";

/** What a press that has moved `distance` px is: still a press (`wait`), a drag, or a scroll the page keeps (`cancel`, a finger that moved before it was held). `held` is whether the finger's hold has run. */
export function pressed(
	pointer: string,
	distance: number,
	held: boolean,
): "wait" | "drag" | "cancel" {
	if (pointer === "touch") {
		if (held) return "drag";
		return distance > HOLD_SLOP ? "cancel" : "wait";
	}
	return distance >= DRAG_SLOP ? "drag" : "wait";
}

/** The side of a row (`top`, `height`) a pointer at `y` is on: the drop lands before the row on its upper half and after it on its lower. */
export function sideOf(
	y: number,
	top: number,
	height: number,
): "before" | "after" {
	return y < top + height / 2 ? "before" : "after";
}

/** Where `id` stands once moved to `index` of the order `ids` (the order with `id` taken out and put back at `index`): its place and its neighbours there. A neighbour that is not loaded (a hole in a window) has no id to hand, so the move is `undefined` there. */
export function movedTo(
	ids: readonly (string | undefined)[],
	id: string,
	index: number,
): Moved | undefined {
	const from = ids.indexOf(id);
	if (from < 0 || index < 0 || index >= ids.length) return undefined;
	const rest = ids.filter((_, at) => at !== from);
	const prev = index === 0 ? null : rest[index - 1];
	const next = index >= rest.length ? null : rest[index];
	if (prev === undefined || next === undefined) return undefined;
	return { index, after: prev, before: next };
}

/** The move a drop on `side` of the row `over` makes of `id`; `undefined` where it changes nothing (the row dropped on itself or beside its own place) or a neighbour is not loaded. */
export function moveOf(
	ids: readonly (string | undefined)[],
	id: string,
	over: string,
	side: "before" | "after",
): Moved | undefined {
	const from = ids.indexOf(id);
	const to = ids.indexOf(over);
	if (from < 0 || to < 0) return undefined;
	const slot = side === "before" ? to : to + 1;
	if (slot === from || slot === from + 1) return undefined;
	return movedTo(ids, id, slot > from ? slot - 1 : slot);
}

export type Step = "up" | "down" | "first" | "last";

/** The move a key or a menu entry makes of `id`: one place up or down, or to the first or last place; `undefined` where it is already there. */
export function stepOf(
	ids: readonly (string | undefined)[],
	id: string,
	step: Step,
): Moved | undefined {
	const from = ids.indexOf(id);
	if (from < 0) return undefined;
	const last = ids.length - 1;
	const to =
		step === "up"
			? from - 1
			: step === "down"
				? from + 1
				: step === "first"
					? 0
					: last;
	if (to === from || to < 0 || to > last) return undefined;
	return movedTo(ids, id, to);
}

/** A list with the entry at `from` moved to `to`, the others keeping their order. */
export function moveEntry<T>(
	list: readonly T[],
	from: number,
	to: number,
): T[] {
	const next = [...list];
	const [entry] = next.splice(from, 1);
	next.splice(to, 0, entry as T);
	return next;
}

/** How far (px) a drag at `at` carries a scroller whose view runs from `start` to `end`: negative toward the start, positive toward the end, nothing in the middle, growing to `SCROLL_MAX` at the edge and beyond it. */
export function edgeSpeed(at: number, start: number, end: number): number {
	const edge = Math.min(SCROLL_EDGE, (end - start) / 2);
	if (edge <= 0) return 0;
	if (at < start + edge) {
		return -Math.round(SCROLL_MAX * Math.min(1, (start + edge - at) / edge));
	}
	if (at > end - edge) {
		return Math.round(SCROLL_MAX * Math.min(1, (at - (end - edge)) / edge));
	}
	return 0;
}

/** Whether a drop that `accepts` a kind (one, or several) takes what is dragged: a drag of no kind (a reorder alone) is taken by none. */
export function accepts(
	accepted: string | readonly string[],
	kind: string | undefined,
): boolean {
	if (kind === undefined) return false;
	return typeof accepted === "string"
		? accepted === kind
		: accepted.includes(kind);
}
