import type { CanvasPoint } from "@fcalell/ui-core/descriptors";
import {
	type MouseEvent,
	type PointerEvent,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import type { Viewport } from "./viewport.ts";

// How long a still finger holds before a node lifts, and how far it may stray
// first. A platform long press is about 400 to 500 ms, and 8 px is the touch
// slop: a finger that stays inside it is still.
export const LIFT_MS = 400;
export const SLOP = 8;

// Where a node stands after the pointer moved from `from` to `to` (client
// pixels) since it stood at `start` (flow coordinates), at zoom `zoom`.
export function carried(
	start: CanvasPoint,
	from: CanvasPoint,
	to: CanvasPoint,
	zoom: number,
): CanvasPoint {
	return {
		x: start.x + (to.x - from.x) / zoom,
		y: start.y + (to.y - from.y) / zoom,
	};
}

export interface Lift {
	// A finger holds the node, which follows it.
	lifted: boolean;
	// Spread on the node's element, beside a touch finger's own handlers.
	bind: {
		onPointerDown: (event: PointerEvent<HTMLElement>) => void;
		onPointerMove: (event: PointerEvent<HTMLElement>) => void;
		onPointerUp: (event: PointerEvent<HTMLElement>) => void;
		onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
		onClickCapture: (event: MouseEvent) => void;
		onContextMenu: (event: MouseEvent) => void;
	};
}

interface Press {
	pointer: number;
	target: HTMLElement;
	from: CanvasPoint;
	// Where the finger is, until the node lifts.
	now: CanvasPoint;
	// The finger strayed past the slop, or a second one landed: a pan or a pinch
	// is d3-zoom's, and the click that follows it selects nothing.
	moved: boolean;
	timer: number | undefined;
	// The event time at which the press has held long enough to lift.
	due: number;
	// Set when the node lifts: where it stood and where the finger was.
	hold: { start: CanvasPoint; from: CanvasPoint } | null;
	// The node's latest position while held.
	point: CanvasPoint;
	// The node dropped (a second finger landed) while this finger is still down.
	dropped: boolean;
	other: (event: globalThis.PointerEvent) => void;
}

// d3-zoom reads its filter once, at a gesture's `touchstart`, and has no cancel:
// the finger that lifts a node is already in a gesture. A lift starves that
// gesture instead, by stopping the touch events before the region's listener
// (a `document` capture listener runs first) until the lifting finger ends. A
// `touchend` is never stopped, so the gesture closes itself.
const starve = (event: Event) => event.stopPropagation();
const STARVED = ["touchmove", "touchstart"] as const;

function starving(on: boolean) {
	for (const type of STARVED) {
		if (on) document.addEventListener(type, starve, true);
		else document.removeEventListener(type, starve, true);
	}
}

// Ends a press's timer and the listeners it holds.
function unhook(state: Press) {
	window.clearTimeout(state.timer);
	document.removeEventListener("pointerdown", state.other, true);
	if (state.hold) starving(false);
}

const client = (event: { clientX: number; clientY: number }): CanvasPoint => ({
	x: event.clientX,
	y: event.clientY,
});

// A long press on a node lifts it, and the finger then carries it. A finger
// that moves first, or a second one, leaves the pan or the pinch to d3-zoom.
// Only a touch or a pen takes part: a mouse drags at once, in the node's own
// handlers. With `enabled` false the hook only keeps a pan's click from
// selecting.
export function useLift(args: {
	id: string;
	enabled: boolean;
	viewport: Viewport;
	// The canvas's one writer of a held position, `null` clearing it.
	at: (id: string, point: CanvasPoint | null) => void;
	// A release: reports the position, then clears it.
	drop: (id: string, point: CanvasPoint) => void;
	// Where the node stands now.
	place: () => CanvasPoint;
}): Lift {
	const [lifted, setLifted] = useState(false);
	const press = useRef<Press | null>(null);
	const armed = useRef(false);
	const latest = useRef(args);
	useLayoutEffect(() => {
		latest.current = args;
	});

	const finish = (state: Press) => {
		unhook(state);
		press.current = null;
		setLifted(false);
	};
	// A node held by a finger drops where it is, once.
	const settle = (state: Press, point: CanvasPoint) => {
		if (!state.hold || state.dropped) return;
		state.dropped = true;
		latest.current.drop(latest.current.id, point);
		setLifted(false);
	};

	// A page slower than the press lifts the node on its timer before it handles
	// an event the finger made earlier, and an event's `timeStamp` is the
	// input's, not the handler's: the node goes back as it stood.
	const unlift = (state: Press) => {
		if (!state.hold || state.dropped) return;
		state.target.releasePointerCapture(state.pointer);
		starving(false);
		latest.current.at(latest.current.id, null);
		state.hold = null;
		setLifted(false);
	};

	const down = (event: PointerEvent<HTMLElement>) => {
		if (event.pointerType === "mouse" || event.button !== 0 || press.current)
			return;
		armed.current = false;
		const state: Press = {
			pointer: event.pointerId,
			target: event.currentTarget,
			from: client(event),
			now: client(event),
			moved: false,
			timer: undefined,
			due: event.timeStamp + LIFT_MS,
			hold: null,
			point: client(event),
			dropped: false,
			// A second finger anywhere ends the press, or drops the node.
			other: (landing) => {
				if (landing.pointerId === state.pointer) return;
				if (landing.timeStamp < state.due) unlift(state);
				state.moved = true;
				window.clearTimeout(state.timer);
				settle(state, state.point);
			},
		};
		press.current = state;
		if (!latest.current.enabled) return;
		document.addEventListener("pointerdown", state.other, true);
		state.timer = window.setTimeout(() => {
			const { id, at, place } = latest.current;
			const start = place();
			state.hold = { start, from: state.now };
			state.point = start;
			state.target.setPointerCapture(state.pointer);
			starving(true);
			// A progressive enhancement: a pulse says the node is in hand where a device has
			// one and the page has had a user activation, without which Chrome refuses the
			// call and logs the refusal as a console error.
			if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(10);
			at(id, start);
			setLifted(true);
		}, LIFT_MS);
	};

	const move = (event: PointerEvent<HTMLElement>) => {
		const state = press.current;
		if (!state || event.pointerId !== state.pointer) return;
		const point = client(event);
		if (
			event.timeStamp < state.due &&
			Math.hypot(point.x - state.from.x, point.y - state.from.y) > SLOP
		)
			unlift(state);
		if (state.hold) {
			if (state.dropped) return;
			const { id, at, viewport } = latest.current;
			state.point = carried(
				state.hold.start,
				state.hold.from,
				point,
				viewport.get().k,
			);
			at(id, state.point);
			return;
		}
		state.now = point;
		if (Math.hypot(point.x - state.from.x, point.y - state.from.y) > SLOP) {
			state.moved = true;
			window.clearTimeout(state.timer);
		}
	};

	const up = (event: PointerEvent<HTMLElement>) => {
		const state = press.current;
		if (!state || event.pointerId !== state.pointer) return;
		if (state.hold && !state.dropped) {
			const { viewport } = latest.current;
			settle(
				state,
				carried(
					state.hold.start,
					state.hold.from,
					client(event),
					viewport.get().k,
				),
			);
		}
		armed.current = state.moved || state.hold !== null;
		finish(state);
	};

	// A cancelled hold gives the node back where it stood, reporting nothing.
	const cancel = (event: PointerEvent<HTMLElement>) => {
		const state = press.current;
		if (!state || event.pointerId !== state.pointer) return;
		if (state.hold && !state.dropped)
			latest.current.at(latest.current.id, null);
		armed.current = true;
		finish(state);
	};

	useEffect(
		() => () => {
			const state = press.current;
			if (state) unhook(state);
		},
		[],
	);

	return {
		lifted,
		bind: {
			onPointerDown: down,
			onPointerMove: move,
			onPointerUp: up,
			onPointerCancel: cancel,
			// The click that follows a lift or a pan selects nothing. A key's click
			// (`detail` 0) is never one.
			onClickCapture: (event) => {
				if (!armed.current || event.detail === 0) return;
				armed.current = false;
				event.stopPropagation();
				event.preventDefault();
			},
			// A long press raises the context menu on some platforms.
			onContextMenu: (event) => {
				if (press.current) event.preventDefault();
			},
		},
	};
}
