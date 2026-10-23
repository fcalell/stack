import {
	eased,
	mix,
	position,
	release,
	type Sample,
	SLOP,
	velocity,
} from "@fcalell/ui-core/follow";
import {
	type PointerEvent,
	type RefObject,
	useLayoutEffect,
	useRef,
} from "react";

// The `base` rung in ms as the page has it now: the root's custom property,
// which the tuning page writes and reduced motion zeroes.
function base(): number {
	return Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue(
			"--transition-duration-base",
		),
	);
}

/**
 * A move the script carries because CSS cannot: `from` to `to` on `base`
 * `in-out`, each frame handed to `apply` (the canvas viewport, whose grid and
 * layer both follow). Reduced motion lands on `to` at once. Returns the
 * cancel, which a pointer or a wheel taking over calls; a cancelled move stays
 * where it got to.
 */
export function travel<T extends Record<string, number>>(
	from: T,
	to: T,
	apply: (view: T) => void,
): () => void {
	const duration = base();
	if (!(duration > 0)) {
		apply(to);
		return () => {};
	}
	let start: number | undefined;
	let frame = 0;
	const step = (now: number) => {
		start ??= now;
		const share = Math.min(1, (now - start) / duration);
		if (share >= 1) {
			apply(to);
			return;
		}
		const along = eased("in-out", share);
		apply(
			Object.fromEntries(
				Object.keys(from).map((key) => [
					key,
					mix(from[key] ?? 0, to[key] ?? 0, along),
				]),
			) as T,
		);
		frame = requestAnimationFrame(step);
	};
	frame = requestAnimationFrame(step);
	return () => cancelAnimationFrame(frame);
}

// A press on one of these is the part's own, never the start of a drag.
const OWN = "input,textarea,select,[contenteditable='true']";

/** What a drag along one axis is for: the element it carries, and the way it leaves. */
export interface FollowArgs {
	/** The element the drag carries; its edge to edge along the axis is how far it has to go to be gone. */
	target: RefObject<HTMLElement | null>;
	axis: "x" | "y";
	/** The way it leaves along the axis: 1 toward the end, -1 toward the start, or `inline-end` (the text direction's). */
	away: 1 | -1 | "inline-end";
	/** Off, the handlers do nothing: a mouse never drags (a touch or a pen does), and a held dismissal stays. */
	enabled: boolean;
	/** The drag was released past the reach or flung: the owner closes it, and the leave takes it on from where it was let go. */
	onAway: () => void;
}

interface Drag {
	pointer: number;
	from: { x: number; y: number };
	samples: Sample[];
	// Past the slop along the axis and toward away: the element follows.
	held: boolean;
	// Went the wrong way, or across, first: the drag is not ours.
	dead: boolean;
	pulled: number;
}

const sign = (away: FollowArgs["away"], element: Element): 1 | -1 => {
	if (away !== "inline-end") return away;
	return getComputedStyle(element).direction === "rtl" ? -1 : 1;
};

const shift = (axis: "x" | "y", by: number) =>
	axis === "x" ? `translateX(${by}px)` : `translateY(${by}px)`;

/**
 * A drag with the finger (`motion.md` §3, follow): the element moves 1:1 with
 * the pointer toward `away` and never against it, with no easing; on release it
 * either settles back on `base` `out` or, past the reach or flung, leaves on
 * the layer's own leave. Spread the returned handlers on the part that is
 * grabbed (a sheet's head, a toast), whose `touch-action` must keep the
 * browser from taking the axis. Only a touch or a pen takes part.
 */
export function useFollow(args: FollowArgs) {
	const drag = useRef<Drag | null>(null);
	const latest = useRef(args);
	useLayoutEffect(() => {
		latest.current = args;
	});

	const down = (event: PointerEvent<HTMLElement>) => {
		const { enabled, target } = latest.current;
		if (
			!enabled ||
			event.pointerType === "mouse" ||
			event.button !== 0 ||
			drag.current ||
			!target.current ||
			(event.target instanceof Element && event.target.closest(OWN))
		)
			return;
		drag.current = {
			pointer: event.pointerId,
			from: { x: event.clientX, y: event.clientY },
			samples: [],
			held: false,
			dead: false,
			pulled: 0,
		};
	};
	const move = (event: PointerEvent<HTMLElement>) => {
		const state = drag.current;
		const { target, axis } = latest.current;
		const element = target.current;
		if (!state || state.dead || event.pointerId !== state.pointer || !element)
			return;
		const away = sign(latest.current.away, element);
		const along =
			axis === "x"
				? event.clientX - state.from.x
				: event.clientY - state.from.y;
		const across =
			axis === "x"
				? event.clientY - state.from.y
				: event.clientX - state.from.x;
		if (!state.held) {
			if (Math.hypot(along, across) <= SLOP) return;
			// Across first, or against the way it leaves: a scroll or a tap's wobble.
			if (Math.abs(across) >= Math.abs(along) || position(along, away) === 0) {
				state.dead = true;
				return;
			}
			state.held = true;
			event.currentTarget.setPointerCapture(event.pointerId);
		}
		state.pulled = position(along, away);
		state.samples.push({
			at: event.timeStamp,
			value: axis === "x" ? event.clientX : event.clientY,
		});
		// The element follows the pointer with no transition, whatever its class gives.
		element.style.transition = "none";
		element.style.transform = shift(axis, state.pulled * away);
	};
	const end = (event: PointerEvent<HTMLElement>) => {
		const state = drag.current;
		if (!state || event.pointerId !== state.pointer) return;
		drag.current = null;
		const { target, axis, onAway } = latest.current;
		const element = target.current;
		if (!state.held || !element) return;
		const away = sign(latest.current.away, element);
		if (event.currentTarget.hasPointerCapture(event.pointerId))
			event.currentTarget.releasePointerCapture(event.pointerId);
		const extent = axis === "x" ? element.offsetWidth : element.offsetHeight;
		const cancelled = event.type === "pointercancel";
		const goes =
			!cancelled &&
			release(
				state.pulled,
				velocity(state.samples, away, event.timeStamp),
				extent,
			) === "away";
		if (goes) {
			// The layer's own leave takes it on from here: its transition, back,
			// and the way off the edge.
			element.style.transition = "";
			element.style.transform = shift(axis, extent * away);
			onAway();
			return;
		}
		// Back to rest on `base` `out`, then the layer's own transition again.
		element.style.transition =
			"transform var(--transition-duration-base) var(--ease-out)";
		element.style.transform = "";
		const done = () => {
			element.style.transition = "";
		};
		element.addEventListener("transitionend", done, { once: true });
		element.addEventListener("transitioncancel", done, { once: true });
		// A rest that needed no travel (reduced motion, or already at rest) ends no transition.
		if (base() === 0 || state.pulled === 0) done();
	};
	return {
		onPointerDown: down,
		onPointerMove: move,
		onPointerUp: end,
		onPointerCancel: end,
	};
}
