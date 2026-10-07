import {
	type Graph,
	STATUSES,
	WORKFLOW,
} from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import { pathOrder } from "@fcalell/ui-core/canvas";
import type { Point } from "./mouse.ts";

// What the canvas's touch and overview stories read the page by. The first
// layout of a page loads and starts ELK's worker, which takes longer than a
// wait's default, and longer still when the whole suite loads the dev server at
// once.
export const LAID = { timeout: 60_000 };

export const ORDER = pathOrder(WORKFLOW.nodes, WORKFLOW.edges);

export const rect = (element: Element) => element.getBoundingClientRect();

export const centre = (box: DOMRect): Point => ({
	x: box.left + box.width / 2,
	y: box.top + box.height / 2,
});

// Two boxes with no area in common; a hundredth of a pixel is layout's own
// rounding, where two glyphs touch at the lowest zoom.
export const apart = (a: DOMRect, b: DOMRect) =>
	a.right <= b.left + 0.01 ||
	b.right <= a.left + 0.01 ||
	a.bottom <= b.top + 0.01 ||
	b.bottom <= a.top + 0.01;

// The layer's transform, which the canvas writes by script.
export function viewport(root: Element): {
	scale: number;
	x: number;
	y: number;
} {
	const transform =
		root.querySelector<HTMLElement>("[data-layer]")?.style.transform ?? "";
	const [, x = "0", y = "0"] =
		/translate\((-?[\d.e-]+)px,\s*(-?[\d.e-]+)px\)/.exec(transform) ?? [];
	const [, scale = "1"] = /scale\(([\d.e-]+)\)/.exec(transform) ?? [];
	return { scale: Number(scale), x: Number(x), y: Number(y) };
}

// The nodes' own boxes are the layer's buttons, in path order: a node's glyph
// stands in a box of its own, in a `div`.
export const cards = (root: Element) =>
	root.querySelectorAll<HTMLElement>("[data-layer] > button");

export function card(root: Element, id: string): HTMLElement {
	const found = cards(root)[ORDER.indexOf(id)];
	if (!found) throw new Error(`no button for the node ${id}`);
	return found;
}

// The glyph buttons, in path order.
export const glyphs = (root: Element) =>
	root.querySelectorAll<HTMLElement>("[data-layer] > div > button");

export const left = (element: HTMLElement) =>
	Number.parseFloat(element.style.left);
export const top = (element: HTMLElement) =>
	Number.parseFloat(element.style.top);

export const around = (a: number, b: number, within = 0.5) =>
	Math.abs(a - b) <= within;

// The room a first view or a fit may fill, read off the DOM as the viewport
// does: the pane inset by a page on every side, and clear of the zoom stack on
// the left and the act at the bottom by a `pair` beyond them.
export function room(region: Element): DOMRect {
	const pane = rect(region);
	const page = px("page");
	const pair = px("pair");
	let left = page;
	let bottom = page;
	for (const part of region.querySelectorAll("[data-clear]")) {
		const box = rect(part);
		if (part.getAttribute("data-clear") === "left")
			left = Math.max(left, box.right - pane.left + pair);
		else bottom = Math.max(bottom, pane.bottom - box.top + pair);
	}
	return new DOMRect(
		pane.left + left,
		pane.top + page,
		pane.width - left - page,
		pane.height - page - bottom,
	);
}

// How far a finger's touch adjustment reaches: Chrome snaps a tap to a button
// within about this many px, so a tap meant for the ground stands clear of every
// button by it.
const SNAP = 32;

// A point of the ground: the topmost element there is the region, its layer or
// its grid, and no button stands within a finger's snap of it.
export function groundPoint(region: Element): Point {
	const pane = rect(region);
	const buttons = [...region.querySelectorAll("button")].map(rect);
	for (let y = pane.top + 20; y < pane.bottom - 20; y += 24)
		for (let x = pane.right - 20; x > pane.left + 20; x -= 24) {
			const found = document.elementFromPoint(x, y);
			if (
				found &&
				(found === region ||
					found.matches("[data-layer], [data-ground], [data-ground] *")) &&
				buttons.every((box) => away({ x, y }, box) > SNAP)
			)
				return { x, y };
		}
	throw new Error("no ground in the region");
}

export const shift = (point: Point, x: number, y: number): Point => ({
	x: point.x + x,
	y: point.y + y,
});

// A spacing role's size in px at the density in force.
export const px = (role: string): number =>
	Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue(
			`--spacing-${role}`,
		),
	);

// The lowest zoom at which two glyphs of `glyph` px stand `2 * pair` apart,
// read off the laid-out cards: the glyph and that gap over the smallest centre
// distance (the larger of the two axes) in the layer's own units.
export function lowestZoom(root: Element, glyph: number): number {
	const scale = viewport(root).scale;
	const boxes = [...cards(root)].map((each) => centre(rect(each)));
	let nearest = Number.POSITIVE_INFINITY;
	boxes.forEach((one, index) => {
		for (const two of boxes.slice(index + 1))
			nearest = Math.min(
				nearest,
				Math.max(Math.abs(one.x - two.x), Math.abs(one.y - two.y)) / scale,
			);
	});
	return Math.min(1, Math.max(0.1, (glyph + 2 * px("pair")) / nearest));
}

// After Fit, and after Arrange's fit, no node's box (and no glyph) meets the
// canvas's own chrome: the act and the zoom stack.
export function clear(root: Element) {
	const chrome = [...root.querySelectorAll("[data-clear]")].map(rect);
	if (chrome.length !== 2) throw new Error("the stack and the act stand");
	for (const node of [...cards(root), ...glyphs(root)].map(rect))
		for (const part of chrome)
			if (!apart(node, part))
				throw new Error(
					`a node at ${JSON.stringify(node)} is under the chrome at ${JSON.stringify(part)}`,
				);
}

// A graph whose every node draws both its marks under the text floor: a status
// (every state, the spinner among them) and a problem.
export const MARKED: Graph = {
	...STATUSES,
	nodes: STATUSES.nodes.map((node) => ({
		...node,
		problem: "Missing the target",
	})),
};

// No glyph's mark (the status dot, the spinner, the problem dot) meets its icon.
export function marksClearTheIcon(root: Element) {
	const forms = [...glyphs(root)];
	if (forms.length === 0) throw new Error("no glyph is drawn");
	for (const form of forms) {
		const icon = form.querySelector("svg");
		const marks = [...form.querySelectorAll(":scope > span")];
		if (!icon || marks.length !== 2)
			throw new Error("a glyph holds its icon and two marks");
		for (const mark of marks)
			if (!apart(rect(mark), rect(icon)))
				throw new Error(
					`a mark at ${JSON.stringify(rect(mark))} meets the icon at ${JSON.stringify(rect(icon))}`,
				);
	}
}

// A real Tab key press, over the Chrome DevTools Protocol that Vitest's Playwright
// provider opens: a trusted key makes the focus it moves visible
// (`:focus-visible`), which a scripted `focus()` or a synthetic key does not.
// `vitest/browser` throws when it is imported outside a Vitest run, so it is
// imported when a key is sent.
export async function tabKey() {
	const { cdp } = await import("vitest/browser");
	const key = { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 };
	await cdp().send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...key });
	await cdp().send("Input.dispatchKeyEvent", { type: "keyUp", ...key });
	await new Promise((done) => requestAnimationFrame(() => done(undefined)));
}

// A node's glyph button, by its id.
export function glyph(root: Element, id: string): HTMLElement {
	const found = glyphs(root)[ORDER.indexOf(id)];
	if (!found) throw new Error(`no glyph for the node ${id}`);
	return found;
}

// How far a point stands from a box: 0 on or inside it.
const away = (at: Point, box: DOMRect) =>
	Math.hypot(
		Math.max(box.left - at.x, 0, at.x - box.right),
		Math.max(box.top - at.y, 0, at.y - box.bottom),
	);

// Under the text floor the routes and the frames follow the glyphs: every
// edge's two ends lie on or within a `pair` of their glyphs' rects, a frame
// holds its glyphs by the group padding, and every route is long enough to read
// (a visible stretch of `2 * pair`, the gap the lowest zoom keeps).
export function routesFollowTheGlyphs(root: Element, graph: Graph) {
	const region = root.querySelector("section");
	if (!region) throw new Error("no canvas");
	const view = viewport(root);
	const pane = rect(region);
	const pair = px("pair");
	const pad = px("card") * view.scale;
	// The frame's boxes round a glyph up to a step of a `pair` in the flow, half
	// of it on each side, and a pixel is the stroke's and the border's.
	const slack = (pair * view.scale) / 2 + 1.5;
	const onScreen = (x: number, y: number): Point => ({
		x: pane.left + view.x + x * view.scale,
		y: pane.top + view.y + y * view.scale,
	});
	for (const edge of graph.edges) {
		const line = root.querySelector(`[data-edge="${edge.id}"] > path`);
		if (!(line instanceof SVGPathElement))
			throw new Error(`no route for the edge ${edge.id}`);
		const numbers = (line.getAttribute("d") ?? "").match(/-?\d+(?:\.\d+)?/g);
		if (!numbers || numbers.length < 4)
			throw new Error(`an unreadable route for ${edge.id}`);
		const [x0, y0] = numbers.map(Number);
		const x1 = Number(numbers.at(-2));
		const y1 = Number(numbers.at(-1));
		const ends: [Point, string][] = [
			[onScreen(x0 ?? 0, y0 ?? 0), edge.from],
			[onScreen(x1, y1), edge.to],
		];
		for (const [at, id] of ends) {
			const gap = away(at, rect(glyph(root, id)));
			if (gap > pair)
				throw new Error(
					`the edge ${edge.id} ends ${gap.toFixed(1)} px from the glyph of ${id}`,
				);
		}
		const visible = line.getTotalLength() * view.scale;
		if (visible < 2 * pair - 1)
			throw new Error(
				`the edge ${edge.id} is ${visible.toFixed(1)} px long on screen`,
			);
	}
	const ids = new Set(graph.nodes.map((node) => node.id));
	for (const group of graph.groups ?? []) {
		const frame = root.querySelector(`[data-group="${group.id}"]`);
		if (!frame) throw new Error(`no frame for the group ${group.id}`);
		const box = rect(frame);
		const members = group.holds.filter((held) => ids.has(held));
		// A frame of nodes alone ends a padding under its lowest glyph.
		if (members.length === group.holds.length) {
			const lowest = Math.max(
				...members.map((id) => rect(glyph(root, id)).bottom),
			);
			if (Math.abs(box.bottom - (lowest + pad)) > slack)
				throw new Error(`the frame of ${group.id} stands off its glyphs`);
		}
		for (const id of members) {
			const held = rect(glyph(root, id));
			if (
				box.left > held.left - pad + 1.5 ||
				box.top > held.top - pad + 1.5 ||
				box.right < held.right + pad - 1.5 ||
				box.bottom < held.bottom + pad - 1.5
			)
				throw new Error(
					`the frame of ${group.id} does not hold the glyph of ${id} by the padding`,
				);
		}
	}
}
