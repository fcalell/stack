import type { CanvasPoint } from "@fcalell/ui-core/descriptors";
import { select } from "d3-selection";
import { type D3ZoomEvent, zoom, zoomIdentity } from "d3-zoom";
import {
	type RefObject,
	useEffect,
	useState,
	useSyncExternalStore,
} from "react";
import { travel } from "../../lib/follow.ts";
import { spacing } from "../../lib/media.ts";
import type { Box } from "./geometry.ts";
import {
	type Clearance,
	centredTransform,
	centreOf,
	clearOfStack,
	EXTENT,
	inside,
	NO_CLEARANCE,
	paneOf,
	shiftInto,
	type Transform,
	whole,
	zoomAbout,
} from "./view.ts";

// The canvas's viewport: pan, wheel, pinch and the zoom stack over one layer.
// The rest of the canvas reaches the pan and zoom only through this object.
export interface Viewport {
	get(): Transform;
	// Every transform change, for a part that reads the zoom.
	subscribe(listener: () => void): () => void;
	// A step of the scale about a node's box, whose centre stays where it stands
	// in the pane until the node would pass the pane's edge, when the view shifts
	// just enough to hold it whole and clear of the zoom stack; the pane's
	// centre without one. It travels.
	zoomIn(about?: Box): void;
	zoomOut(about?: Box): void;
	// The scale (within its extent) about a box, as a step does.
	zoomTo(k: number, about?: Box): void;
	// Instant, within the scale extent.
	set(transform: Transform): void;
	// The view travels to the transform (within the scale extent) on `base`
	// `in-out`, by the script's frames; a pan, a wheel or a pinch taking over
	// ends it where it got to.
	go(transform: Transform): void;
	// What the canvas's own chrome takes from the pane, which a fit and the opening view stay clear of.
	clearance(): Clearance;
	// Pans only, at the zoom it has, and nothing when the box is already in
	// view; given a zoom it always moves, to that zoom, the box centred. It
	// travels.
	centreOn(box: Box, zoom?: number): void;
	// Raises the lowest scale, and a scale already under it to it.
	limit(lowest: number): void;
	// A pointer's client position as a flow point.
	screenToFlow(point: CanvasPoint): CanvasPoint;
}

const STEP = 1.2;
// One wheel event moves the scale by at most the zoom stack's step, in d3's
// log2 measure; a trackpad pinch's small deltas stay proportional below it.
const MOST = Math.log2(STEP);
// The DOM's own approximation of a line in a wheel's `deltaMode`: Chrome and
// Firefox report pixels for a trackpad, so a line count comes from a mouse.
const LINE = 16;
// The dot grid, in the pattern page's range: a 16 px pitch of 1 px dots.
export const PITCH = 16;
export const DOT = 0.5;

// d3-zoom's own scale of a wheel's delta by its mode; a Ctrl or Cmd wheel (a
// trackpad pinch is a Ctrl wheel) zooms ten times faster.
const scaleOf = (event: WheelEvent): number => {
	if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return 0.05;
	return event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 1 : 0.002;
};

const pixels = (event: WheelEvent, page: number): number => {
	if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return LINE;
	return event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? page : 1;
};

// A pan starts anywhere but on a part that carries its own drag (`data-no-pan`),
// and a wheel zooms with Ctrl or Cmd, which a trackpad pinch sends as Ctrl.
const pans = (event: MouseEvent | TouchEvent | WheelEvent): boolean => {
	if (event instanceof WheelEvent) return event.ctrlKey || event.metaKey;
	if (event.ctrlKey) return false;
	if (event instanceof MouseEvent && event.button) return false;
	return !(
		event.target instanceof Element && event.target.closest("[data-no-pan]")
	);
};

// What the canvas's own chrome takes from the pane: a part marked
// `data-clear` with the edge it stands against, `left` or `bottom`, and
// a `pair` of air beyond it.
export function clearanceOf(element: HTMLElement | null): Clearance {
	if (!element) return NO_CLEARANCE;
	const pane = element.getBoundingClientRect();
	const pair = spacing("gap");
	const out = { left: 0, bottom: 0, stack: 0 };
	for (const part of element.querySelectorAll<HTMLElement>("[data-clear]")) {
		const box = part.getBoundingClientRect();
		if (part.dataset.clear === "left") {
			out.left = Math.max(out.left, box.right - pane.left + pair);
			out.stack = Math.max(out.stack, pane.bottom - box.top + pair);
		} else out.bottom = Math.max(out.bottom, pane.bottom - box.top + pair);
	}
	return out;
}

function make(region: RefObject<HTMLElement | null>) {
	const listeners = new Set<() => void>();
	let current: Transform = { x: 0, y: 0, k: 1 };
	let layer: HTMLElement | null = null;
	let pattern: SVGPatternElement | null = null;

	// The layer and the grid move by script, so a pan renders no React tree.
	const apply = (transform: Transform) => {
		current = { x: transform.x, y: transform.y, k: transform.k };
		const { x, y, k } = current;
		if (layer) layer.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
		if (pattern) {
			const pitch = PITCH * k;
			pattern.setAttribute("x", String(x));
			pattern.setAttribute("y", String(y));
			pattern.setAttribute("width", String(pitch));
			pattern.setAttribute("height", String(pitch));
			// A dot's centre stands on a pixel's centre where the layer sits at whole
			// pixels (scale 1), or it smears over four.
			const dot = pattern.firstElementChild;
			dot?.setAttribute("cx", String(Math.floor(x + pitch / 2) + 0.5 - x));
			dot?.setAttribute("cy", String(Math.floor(y + pitch / 2) + 0.5 - y));
			dot?.setAttribute("r", String(DOT * k));
		}
		for (const listener of listeners) listener();
	};

	const behaviour = zoom<HTMLElement, unknown>()
		.scaleExtent([...EXTENT])
		.filter(pans)
		.wheelDelta((event: WheelEvent) => {
			const raw =
				-event.deltaY *
				scaleOf(event) *
				(event.ctrlKey || event.metaKey ? 10 : 1);
			return Math.max(-MOST, Math.min(MOST, raw));
		})
		.on("zoom", (event: D3ZoomEvent<HTMLElement, unknown>) =>
			apply(event.transform),
		);

	const on = () => {
		const element = region.current;
		return element ? select(element) : null;
	};
	const pane = () => ({
		width: region.current?.clientWidth ?? 0,
		height: region.current?.clientHeight ?? 0,
	});

	// The view that travels, if one does, and where it is headed; whatever sets
	// the view or takes the pointer ends it. A step asked for while one travels
	// is a step from where it is headed, so quick presses add up.
	let travelling = () => {};
	let heading: Transform | null = null;
	const stop = () => {
		travelling();
		travelling = () => {};
		heading = null;
	};
	const base = (): Transform => heading ?? current;

	// The scale moves to `target` about the centre of the box `about`, else the
	// pane's centre, and that point stays where it stands; a box is then kept
	// whole in the pane and clear of the zoom stack (`clearOfStack`). A zoom that only clamps the scale (`limit`) is not a
	// move: it lands at once.
	const zoomTo = (target: number, about?: Box, move: "go" | "set" = "go") => {
		const [low, high] = behaviour.scaleExtent();
		const size = pane();
		const k = Math.min(high, Math.max(low, target));
		if (!about) {
			viewport[move](
				zoomAbout(base(), { x: size.width / 2, y: size.height / 2 }, k),
			);
			return;
		}
		const zoomed = zoomAbout(base(), paneOf(centreOf(about), base()), k);
		const inset = spacing("page");
		const into = shiftInto(about, zoomed, size, inset);
		viewport[move](
			clearOfStack(about, into, size, inset, clearanceOf(region.current)),
		);
	};

	// The transform on the layer: d3's own state moves with it, so the next
	// pan or wheel starts from where the view stands.
	const land = (transform: Transform) => {
		const [low, high] = behaviour.scaleExtent();
		const { x, y, k } = whole(transform);
		const selection = on();
		if (selection)
			behaviour.transform(
				selection,
				zoomIdentity.translate(x, y).scale(Math.min(high, Math.max(low, k))),
			);
	};

	const viewport: Viewport = {
		get: () => current,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		zoomIn: (about) => zoomTo(base().k * STEP, about),
		zoomOut: (about) => zoomTo(base().k / STEP, about),
		zoomTo: (k, about) => zoomTo(k, about),
		// Every transform the canvas sets itself comes through here, at whole
		// pixels; a wheel or a pinch stays as d3 gives it.
		set(transform) {
			stop();
			land(transform);
		},
		go(transform) {
			stop();
			const [low, high] = behaviour.scaleExtent();
			const { x, y, k } = whole(transform);
			const to = { x, y, k: Math.min(high, Math.max(low, k)) };
			heading = to;
			travelling = travel(current, to, (view) => {
				land(view);
				if (view === to) heading = null;
			});
		},
		clearance: () => clearanceOf(region.current),
		centreOn(box, zoom) {
			const size = pane();
			if (zoom === undefined) {
				if (inside(box, base(), size, spacing("page"))) return;
				viewport.go(centredTransform(box, base().k, size));
				return;
			}
			viewport.go(centredTransform(box, zoom, size));
		},
		limit(lowest) {
			behaviour.scaleExtent([lowest, EXTENT[1]]);
			if (current.k < lowest) zoomTo(current.k, undefined, "set");
		},
		screenToFlow(point) {
			const rect = region.current?.getBoundingClientRect();
			return {
				x: (point.x - (rect?.left ?? 0) - current.x) / current.k,
				y: (point.y - (rect?.top ?? 0) - current.y) / current.k,
			};
		},
	};

	// A plain wheel pans through `translateBy`, which takes world units; the
	// handler is not passive so the page never scrolls under the canvas.
	const mount = () => {
		const element = region.current;
		if (!element) return;
		layer = element.querySelector<HTMLElement>("[data-layer]");
		pattern = element.querySelector<SVGPatternElement>("[data-grid]");
		if (layer) layer.style.transformOrigin = "0 0";
		const selection = select(element);
		selection.call(behaviour).on("dblclick.zoom", null);
		const wheel = (event: WheelEvent) => {
			if (event.ctrlKey || event.metaKey) return;
			event.preventDefault();
			const unit = pixels(event, element.clientHeight);
			behaviour.translateBy(
				selection,
				(-event.deltaX * unit) / current.k,
				(-event.deltaY * unit) / current.k,
			);
		};
		element.addEventListener("wheel", wheel, { passive: false });
		// A pointer, a finger or a wheel taking the view over ends a travel where
		// it got to, before d3-zoom reads the view it starts from. A part with its
		// own drag (the zoom stack, a node being moved) leaves the view alone.
		const take = (event: Event) => {
			if (
				event.type !== "wheel" &&
				event.target instanceof Element &&
				event.target.closest("[data-no-pan]")
			)
				return;
			stop();
		};
		const TAKEN = ["pointerdown", "touchstart", "wheel"] as const;
		for (const type of TAKEN)
			element.addEventListener(type, take, { capture: true, passive: true });
		apply(current);
		return () => {
			stop();
			selection.on(".zoom", null);
			element.removeEventListener("wheel", wheel);
			for (const type of TAKEN)
				element.removeEventListener(type, take, { capture: true });
		};
	};

	return { viewport, mount };
}

// The viewport of `region`: d3-zoom on the element, its transform applied to
// the layer marked `data-layer` and the grid pattern marked `data-grid` inside
// it. A pan touches no React state.
export function useViewport(region: RefObject<HTMLElement | null>): Viewport {
	const [{ viewport, mount }] = useState(() => make(region));
	useEffect(mount, [mount]);
	return viewport;
}

// A value read off the transform, rendered again only when it changes: a pan
// or a zoom within one value of `select` renders nothing.
export function useViewportValue<T>(
	viewport: Viewport,
	select: (transform: Transform) => T,
): T {
	return useSyncExternalStore(viewport.subscribe, () => select(viewport.get()));
}
