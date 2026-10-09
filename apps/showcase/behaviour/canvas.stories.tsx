import { Canvas } from "@fcalell/plugin-react-ui/components/canvas";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Split } from "@fcalell/plugin-react-ui/components/split";
import { showcaseFrames } from "@fcalell/plugin-react-ui/showcase/cells";
import { Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import {
	ALONE_STAGE,
	drawCanvas,
	EMPTY,
	HOLLOW,
	HOLLOW_ALONE,
	HOLLOW_PLACED,
	JOURNEY,
	OFF,
	PROBLEM,
	RUN,
	SCENARIO,
	SMALL,
	STAGE,
	STATUSES,
	TALL,
	WORKFLOW,
} from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import { pathOrder } from "@fcalell/ui-core/canvas";
import type { CanvasNode, CanvasPoint } from "@fcalell/ui-core/descriptors";
import { SIZE_PX, WIDTH_VALUE } from "@fcalell/ui-core/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, spyOn, waitFor } from "storybook/test";
import { FOCUS_GUARD } from "../.storybook/focus-guard.ts";
import { hollowHeld, hollowRow, lowestZoom, room } from "./canvas-support.ts";
import { click as mouseClick, drag as mouseDrag, type Point } from "./mouse.ts";

const ORDER = pathOrder(WORKFLOW.nodes, WORKFLOW.edges);

type Select = (id: string | null) => void;

// The workflow with the selection kept, the way a page holds it; `heard` is
// what the canvas told the page.
function Workflow(props: { heard?: Select }) {
	const [selected, setSelected] = useState<string>();
	return (
		<div className={STAGE}>
			<Canvas
				label="Workflow"
				nodes={WORKFLOW.nodes}
				edges={WORKFLOW.edges}
				groups={WORKFLOW.groups}
				selected={selected}
				onSelect={(id) => {
					props.heard?.(id);
					setSelected(id ?? undefined);
				}}
			/>
		</div>
	);
}

// A story's page for the canvas: a button outside it that selects a node, so
// a selection comes from beyond the canvas.
function Outside(props: { id: string; label: string }) {
	const [selected, setSelected] = useState<string>();
	return (
		<>
			<button type="button" onClick={() => setSelected(props.id)}>
				{props.label}
			</button>
			<div className={STAGE}>
				<Canvas
					label="Workflow"
					nodes={WORKFLOW.nodes}
					edges={WORKFLOW.edges}
					groups={WORKFLOW.groups}
					selected={selected}
					onSelect={(id) => setSelected(id ?? undefined)}
				/>
			</div>
		</>
	);
}

export default {
	title: "Behaviour/Canvas",
} satisfies Meta;

// The first layout of a page loads and starts ELK's worker, which takes longer
// than a wait's default, and longer still when the whole suite loads the dev
// server at once.
const LAID = { timeout: 60_000 };

const rect = (element: Element) => element.getBoundingClientRect();

// A box whole inside another, to half a pixel.
const holds = (outer: DOMRect, inner: DOMRect) =>
	inner.left >= outer.left - 0.5 &&
	inner.top >= outer.top - 0.5 &&
	inner.right <= outer.right + 0.5 &&
	inner.bottom <= outer.bottom + 0.5;

const apart = (a: DOMRect, b: DOMRect) =>
	a.right <= b.left ||
	b.right <= a.left ||
	a.bottom <= b.top ||
	b.bottom <= a.top;

// The nodes are the layer's own buttons, in path order.
const nodeButtons = (root: Element) =>
	root.querySelectorAll<HTMLElement>("[data-layer] > button");

// A group's head, which is a button when the canvas hears a choice.
function headOf(root: Element, id: string): HTMLElement {
	const head = root.querySelector<HTMLElement>(`[data-group="${id}"] > button`);
	if (!head) throw new Error(`no head button for the group ${id}`);
	return head;
}

// A node's button, by its id: the DOM holds them in path order.
function nodeButton(root: Element, id: string): HTMLElement {
	const button = nodeButtons(root)[ORDER.indexOf(id)];
	if (!button) throw new Error(`no button for the node ${id}`);
	return button;
}

// The layer's transform, which the canvas writes by script.
function viewport(root: Element): {
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

const titleOf = (id: string) =>
	WORKFLOW.nodes.find((node) => node.id === id)?.title ?? "";

// The group heads, then the nodes in path order, then Zoom in, Zoom out, Fit;
// Enter chooses the focused node and Escape clears the choice.
export const Keyboard: StoryObj<{ heard: Select }> = {
	args: { heard: fn() },
	render: (args) => <Workflow heard={args.heard} />,
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(
			() => expect(nodeButton(region, ORDER[0] ?? "")).toBeVisible(),
			LAID,
		);
		for (const group of WORKFLOW.groups ?? []) {
			await userEvent.tab();
			await expect(headOf(canvasElement, group.id)).toHaveFocus();
			await expect(headOf(canvasElement, group.id)).toHaveTextContent(
				group.head,
			);
		}
		for (const id of ORDER) {
			await userEvent.tab();
			await expect(nodeButton(canvasElement, id)).toHaveFocus();
			await expect(nodeButton(canvasElement, id)).toHaveTextContent(
				titleOf(id),
			);
			// Enter chooses the first node, Escape clears the choice.
			if (id !== ORDER[0]) continue;
			await userEvent.keyboard("{Enter}");
			await expect(args.heard).toHaveBeenLastCalledWith(id);
			await userEvent.keyboard("{Escape}");
			await expect(args.heard).toHaveBeenLastCalledWith(null);
		}
		for (const name of ["Zoom in", "Zoom out", "Fit"]) {
			await userEvent.tab();
			await expect(canvas.getByRole("button", { name })).toHaveFocus();
		}
	},
};

// A group's head is a button at least a target tall that chooses the group's
// id; the group draws the selection's outline until Escape clears it; the
// frame's body takes no pointer, so a drag from it pans.
function groupSelect(
	density: "desktop" | "touch",
): StoryObj<{ heard: Select }> {
	return {
		args: { heard: fn() },
		globals: { density },
		render: (args) => <Workflow heard={args.heard} />,
		play: async ({ args, canvas, canvasElement, userEvent }) => {
			const region = await canvas.findByRole("region", { name: "Workflow" });
			await waitFor(
				() => expect(nodeButton(region, ORDER[0] ?? "")).toBeVisible(),
				LAID,
			);
			const group = WORKFLOW.groups?.[0];
			if (!group) throw new Error("no group");
			const head = headOf(region, group.id);
			const frame = head.parentElement as HTMLElement;
			await expect(head).toHaveAccessibleName(group.head);
			await expect(rect(head).height).toBeGreaterThanOrEqual(
				SIZE_PX[density].target - 0.5,
			);
			const rest = getComputedStyle(frame).borderTopColor;
			await userEvent.click(head);
			await expect(args.heard).toHaveBeenLastCalledWith(group.id);
			await waitFor(() =>
				expect(getComputedStyle(frame).borderTopColor).not.toBe(rest),
			);
			await userEvent.keyboard("{Escape}");
			await expect(args.heard).toHaveBeenLastCalledWith(null);
			await waitFor(() =>
				expect(getComputedStyle(frame).borderTopColor).toBe(rest),
			);
			// The frame's body takes no pointer: a press just inside its left edge
			// lands on the ground and a drag from there pans.
			const from: Point = {
				x: rect(frame).left + 3,
				y: rect(frame).top + rect(frame).height / 2,
			};
			await expect(document.elementFromPoint(from.x, from.y)).not.toBe(frame);
			const before = viewport(canvasElement);
			await mouseDrag(from, { x: from.x + 40, y: from.y + 30 });
			await waitFor(() => expect(viewport(canvasElement).x).not.toBe(before.x));
			await expect(args.heard).toHaveBeenLastCalledWith(null);
		},
	};
}

export const GroupSelectAtDesktop = groupSelect("desktop");
export const GroupSelectAtTouch = groupSelect("touch");

// A selection from outside the canvas brings its node into view at the zoom
// the canvas has.
export const PanToSelected: StoryObj = {
	render: () => <Outside id="handoff" label="Select the handoff" />,
	play: async ({ canvas, userEvent }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(
			() => expect(nodeButton(region, "start")).toBeVisible(),
			LAID,
		);
		const zoomIn = canvas.getByRole("button", { name: "Zoom in" });
		for (let step = 0; step < 4; step++) await userEvent.click(zoomIn);
		const node = nodeButton(region, "handoff");
		await waitFor(() => expect(holds(rect(region), rect(node))).toBe(false));
		await userEvent.click(
			canvas.getByRole("button", { name: "Select the handoff" }),
		);
		await waitFor(() => expect(holds(rect(region), rect(node))).toBe(true));
	},
};

// Tab to a node that stands off-screen brings it into view.
export const PanToFocused: StoryObj = {
	render: () => <Workflow />,
	play: async ({ canvas, canvasElement, userEvent }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(
			() => expect(nodeButton(region, "start")).toBeVisible(),
			LAID,
		);
		// At scale 1, Tab to the last node: the focus pan sets a whole-pixel
		// translate, so a vertical edge is still one solid column.
		const last = nodeButton(region, ORDER.at(-1) ?? "");
		const heads = WORKFLOW.groups?.length ?? 0;
		for (let step = 0; step < heads + ORDER.length; step++)
			await userEvent.tab();
		await expect(last).toHaveFocus();
		await waitFor(() => expect(holds(rect(region), rect(last))).toBe(true));
		const panned = viewport(canvasElement);
		await expect(panned.scale).toBe(1);
		await expect(Number.isInteger(panned.x)).toBe(true);
		await expect(Number.isInteger(panned.y)).toBe(true);
		// A node's box stands on whole pixels too, so its border is one line.
		await expect(
			Math.abs(rect(last).left - Math.round(rect(last).left)),
		).toBeLessThan(0.001);
		const edge = [
			...canvasElement.querySelectorAll("[data-layer] svg path"),
		].find((path) => path.getAttribute("fill") === "none");
		if (!edge) throw new Error("no edge");
		await expect(
			Math.abs((((rect(edge).left % 1) + 1) % 1) - 0.5),
		).toBeLessThan(0.001);
		const zoomIn = canvas.getByRole("button", { name: "Zoom in" });
		for (let step = 0; step < 4; step++) await userEvent.click(zoomIn);
		const first = nodeButton(region, ORDER[0] ?? "");
		await waitFor(() => expect(holds(rect(region), rect(first))).toBe(false));
		(document.activeElement as HTMLElement | null)?.blur();
		for (let step = 0; step <= heads; step++) await userEvent.tab();
		await expect(first).toHaveFocus();
		await waitFor(() => expect(holds(rect(region), rect(first))).toBe(true));
	},
};

// A press focuses a node's button without a keyboard, and panning then would
// move a node that stands partly in view out from under the pointer: only a
// keyboard focus pans. A synthetic click is a script focus, which Chromium
// counts as a keyboard one, so the press is a focus that asks not to show it.
export const PressDoesNotPan: StoryObj = {
	render: () => <Workflow />,
	play: async ({ canvas, canvasElement }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(() => expect(nodeButton(region, "plan")).toBeVisible(), LAID);
		const node = nodeButton(region, "plan");
		// Wheel the layer until the node's top edge stands above the region's.
		const over = rect(node).top - rect(region).top + 10;
		region.dispatchEvent(
			new WheelEvent("wheel", {
				deltaY: over,
				bubbles: true,
				cancelable: true,
			}),
		);
		await waitFor(() => expect(rect(node).top).toBeLessThan(rect(region).top));
		await expect(holds(rect(region), rect(node))).toBe(false);
		const before = viewport(canvasElement);
		node.focus({ focusVisible: false } as FocusOptions);
		await expect(node).toHaveFocus();
		await expect(node.matches(":focus-visible")).toBe(false);
		await expect(viewport(canvasElement)).toEqual(before);
	},
};

// Zoom in grows the layer's scale, Zoom out shrinks it, and Fit puts every
// node back inside the region at a scale of at most 1.
export const ZoomStack: StoryObj = {
	render: () => <Workflow />,
	play: async ({ canvas, canvasElement, userEvent }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(
			() => expect(nodeButton(region, "start")).toBeVisible(),
			LAID,
		);
		const scale = () => viewport(canvasElement).scale;
		const opened = scale();
		await userEvent.click(canvas.getByRole("button", { name: "Zoom in" }));
		await waitFor(() => expect(scale()).toBeGreaterThan(opened));
		const zoomed = scale();
		await userEvent.click(canvas.getByRole("button", { name: "Zoom out" }));
		await userEvent.click(canvas.getByRole("button", { name: "Zoom out" }));
		await waitFor(() => expect(scale()).toBeLessThan(zoomed));
		await userEvent.click(canvas.getByRole("button", { name: "Zoom in" }));
		await userEvent.click(canvas.getByRole("button", { name: "Zoom in" }));
		await userEvent.click(canvas.getByRole("button", { name: "Zoom in" }));
		await userEvent.click(canvas.getByRole("button", { name: "Fit" }));
		await waitFor(() => {
			expect(scale()).toBeLessThanOrEqual(1);
			for (const node of nodeButtons(canvasElement))
				expect(holds(rect(region), rect(node))).toBe(true);
		});
	},
};

// Zoom in is unavailable at the largest scale and Zoom out at the smallest,
// where the button keeps focus and the layer stops scaling. The smallest is the
// zoom at which two glyphs of the control size would touch (`minZoomFor`), read
// here off the laid-out nodes.
export const ZoomLimits: StoryObj = {
	render: () => <Workflow />,
	play: async ({ canvas, canvasElement, userEvent }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(
			() => expect(nodeButton(region, "start")).toBeVisible(),
			LAID,
		);
		const scale = () => viewport(canvasElement).scale;
		const zoomIn = canvas.getByRole("button", { name: "Zoom in" });
		const zoomOut = canvas.getByRole("button", { name: "Zoom out" });
		await expect(zoomIn).not.toHaveAttribute("aria-disabled", "true");
		await expect(zoomOut).not.toHaveAttribute("aria-disabled", "true");
		for (let step = 0; step < 4; step++) await userEvent.click(zoomIn);
		await expect(scale()).toBe(2);
		await expect(zoomIn).toHaveAttribute("aria-disabled", "true");
		await expect(zoomOut).not.toHaveAttribute("aria-disabled", "true");
		for (let step = 0; step < 12; step++) await userEvent.click(zoomOut);
		await expect(
			Math.abs(scale() - lowestZoom(canvasElement, SIZE_PX.desktop.control)),
		).toBeLessThan(0.005);
		await expect(zoomOut).toHaveAttribute("aria-disabled", "true");
		await expect(zoomIn).not.toHaveAttribute("aria-disabled", "true");
	},
};

const wheel = (
	target: Element,
	init: { deltaY: number; ctrlKey?: boolean; metaKey?: boolean },
) => {
	const event = new WheelEvent("wheel", {
		bubbles: true,
		cancelable: true,
		...init,
	});
	target.dispatchEvent(event);
	return event;
};

// A plain wheel pans and leaves the scale; a wheel with Ctrl or Cmd zooms,
// over the ground or over a node; none lets the page scroll.
export const Wheel: StoryObj = {
	render: () => <Workflow />,
	play: async ({ canvas, canvasElement }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(
			() => expect(nodeButton(region, "start")).toBeVisible(),
			LAID,
		);
		const node = nodeButton(region, "plan");
		const before = viewport(canvasElement);
		const plain = wheel(region, { deltaY: 80 });
		await expect(plain.defaultPrevented).toBe(true);
		const panned = viewport(canvasElement);
		await expect(panned.scale).toBe(before.scale);
		await expect(panned.y).toBeCloseTo(before.y - 80 * before.scale, 3);
		// Over a node it pans too.
		const over = wheel(node, { deltaY: 40 });
		await expect(over.defaultPrevented).toBe(true);
		await expect(viewport(canvasElement).scale).toBe(before.scale);
		await expect(viewport(canvasElement).y).toBeLessThan(panned.y);
		// Ctrl and Cmd zoom, over the ground and over a node.
		const ctrl = wheel(region, { deltaY: 50, ctrlKey: true });
		await expect(ctrl.defaultPrevented).toBe(true);
		const smaller = viewport(canvasElement).scale;
		await expect(smaller).toBeLessThan(before.scale);
		const meta = wheel(region, { deltaY: -50, metaKey: true });
		await expect(meta.defaultPrevented).toBe(true);
		const restored = viewport(canvasElement).scale;
		await expect(restored).toBeGreaterThan(smaller);
		wheel(node, { deltaY: 50, ctrlKey: true });
		await expect(viewport(canvasElement).scale).toBeLessThan(restored);
		// One event moves the scale by at most the zoom stack's step (x1.5), where
		// a small delta stays proportional below it.
		const before1 = viewport(canvasElement).scale;
		wheel(region, { deltaY: -100, ctrlKey: true });
		const after1 = viewport(canvasElement).scale;
		await expect(after1 / before1).toBeLessThanOrEqual(1.5 + 1e-9);
		await expect(after1).toBeGreaterThan(before1);
		wheel(region, { deltaY: 400, metaKey: true });
		await expect(viewport(canvasElement).scale / after1).toBeGreaterThanOrEqual(
			1 / 1.5 - 1e-9,
		);
		const before2 = viewport(canvasElement).scale;
		wheel(region, { deltaY: -2, ctrlKey: true });
		const gain = viewport(canvasElement).scale / before2;
		await expect(gain).toBeGreaterThan(1);
		await expect(gain).toBeLessThan(1.05);
	},
};

// A drag pans through a node as through the ground. With no handler a
// canvas holds no node button; with `onSelect` the click that ends a drag
// does not select, and a click does.
async function drag(
	userEvent: Parameters<NonNullable<StoryObj["play"]>>[0]["userEvent"],
	target: Element,
) {
	const from = rect(target);
	const start = { clientX: from.left + from.width / 2, clientY: from.top + 20 };
	const end = { clientX: start.clientX + 60, clientY: start.clientY + 40 };
	await userEvent.pointer([
		{ keys: "[MouseLeft>]", target, coords: start },
		{
			target,
			coords: { clientX: start.clientX + 30, clientY: start.clientY + 20 },
		},
		{ target, coords: end },
		{ keys: "[/MouseLeft]", target, coords: end },
	]);
}

export const ReadOnly: StoryObj = {
	render: () => (
		<div className={STAGE}>
			<Canvas
				label="Workflow"
				nodes={WORKFLOW.nodes}
				edges={WORKFLOW.edges}
				groups={WORKFLOW.groups}
				act={{ label: "Add a step", onAct: fn() }}
			/>
		</div>
	),
	play: async ({ canvas, canvasElement, userEvent }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(
			() => expect(region.querySelector("[data-layer] > div")).toBeVisible(),
			LAID,
		);
		await expect(
			canvas.getAllByRole("button").map((button) => button.textContent),
		).toEqual(["", "", "", "Add a step"]);
		await expect(nodeButtons(canvasElement)).toHaveLength(0);
		const layer = canvasElement.querySelector<HTMLElement>("[data-layer]");
		const node = [...(layer?.children ?? [])].find((child) =>
			child.textContent?.includes("Draft a plan"),
		);
		if (!node || !(node instanceof HTMLElement)) throw new Error("no node");
		const before = { at: node.style.cssText, view: viewport(canvasElement) };
		await drag(userEvent, node);
		await waitFor(() => {
			const view = viewport(canvasElement);
			expect(view.x).not.toBe(before.view.x);
			expect(view.y).not.toBe(before.view.y);
		});
		await expect(node.style.cssText).toBe(before.at);
	},
};

export const DragDoesNotSelect: StoryObj<{ heard: Select }> = {
	args: { heard: fn() },
	render: (args) => <Workflow heard={args.heard} />,
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(() => expect(nodeButton(region, "plan")).toBeVisible(), LAID);
		const node = nodeButton(region, "plan");
		const before = viewport(canvasElement);
		await drag(userEvent, node);
		await waitFor(() => expect(viewport(canvasElement).x).not.toBe(before.x));
		await expect(args.heard).not.toHaveBeenCalled();
		await userEvent.click(node);
		await expect(args.heard).toHaveBeenCalledWith("plan");
	},
};

const page = () =>
	Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue(
			"--spacing-page",
		),
	);

// What the layer draws, as one box: its frames, chips and nodes.
function drawn(layer: Element): DOMRect {
	const parts = [...layer.children]
		.filter((child) => !(child instanceof SVGElement))
		.map(rect);
	const left = Math.min(...parts.map((box) => box.left));
	const top = Math.min(...parts.map((box) => box.top));
	const right = Math.max(...parts.map((box) => box.right));
	const bottom = Math.max(...parts.map((box) => box.bottom));
	return new DOMRect(left, top, right - left, bottom - top);
}

// A graph that fits at scale 1 opens centred in the room the zoom stack and the
// act leave.
export const OpensCentred: StoryObj = {
	render: () => (
		<div className={TALL}>
			<Canvas
				label="Workflow"
				nodes={WORKFLOW.nodes}
				edges={WORKFLOW.edges}
				groups={WORKFLOW.groups}
				onSelect={fn()}
			/>
		</div>
	),
	play: async ({ canvas, canvasElement }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(
			() => expect(nodeButton(region, "start")).toBeVisible(),
			LAID,
		);
		await expect(viewport(canvasElement).scale).toBe(1);
		// A dot's centre stands on a pixel's centre, or it smears over four.
		const pattern = canvasElement.querySelector("[data-grid]");
		const dot = pattern?.firstElementChild;
		const at = (name: string) =>
			Number(pattern?.getAttribute(name)) +
			Number(dot?.getAttribute(name === "x" ? "cx" : "cy"));
		await expect(Math.abs((((at("x") % 1) + 1) % 1) - 0.5)).toBeLessThan(0.001);
		await expect(Math.abs((((at("y") % 1) + 1) % 1) - 0.5)).toBeLessThan(0.001);
		// A vertical edge stands on a pixel's centre, one solid column.
		const edge = [
			...canvasElement.querySelectorAll("[data-layer] svg path"),
		].find((path) => path.getAttribute("fill") === "none");
		if (!edge) throw new Error("no edge");
		const column = rect(edge).left;
		await expect(Math.abs((((column % 1) + 1) % 1) - 0.5)).toBeLessThan(0.001);
		const layer = canvasElement.querySelector("[data-layer]");
		if (!layer) throw new Error("no layer");
		const graph = drawn(layer);
		const space = room(region);
		await expect(
			Math.abs(graph.left + graph.width / 2 - (space.left + space.width / 2)),
		).toBeLessThan(1);
		await expect(
			Math.abs(graph.top + graph.height / 2 - (space.top + space.height / 2)),
		).toBeLessThan(1);
	},
};

// A graph larger than the room opens at scale 1 with its first node's top
// centre on the room's centre line, a page inset below the pane's top.
export const OpensAtTheFirstNode: StoryObj = {
	render: () => (
		<div className={SMALL}>
			<Canvas
				label="Journey"
				nodes={JOURNEY.nodes}
				edges={JOURNEY.edges}
				onSelect={fn()}
			/>
		</div>
	),
	play: async ({ canvas, canvasElement }) => {
		const region = await canvas.findByRole("region", { name: "Journey" });
		const first = JOURNEY.nodes[0];
		await waitFor(
			() =>
				expect(
					canvas.getByRole("button", { name: new RegExp(first?.title ?? "") }),
				).toBeVisible(),
			LAID,
		);
		await expect(viewport(canvasElement).scale).toBe(1);
		const button = nodeButtons(canvasElement)[0];
		if (!button) throw new Error("no node");
		const space = room(region);
		const box = rect(button);
		await expect(
			Math.abs(box.left + box.width / 2 - (space.left + space.width / 2)),
		).toBeLessThan(1);
		await expect(Math.abs(box.top - (rect(region).top + page()))).toBeLessThan(
			1,
		);
	},
};

const PLACED: CanvasNode[] = WORKFLOW.nodes.map((node, index) => ({
	...node,
	position: { x: (index % 2) * 300, y: index * 120 },
}));

// The canvas places nodes only when none has a position, and loads ELK's
// worker only then. The placed graph runs first, so the resource timing it
// is read against has no earlier worker.
const workers = () =>
	performance
		.getEntriesByType("resource")
		.filter((entry) => entry.name.includes("elk-worker")).length;

export const PlacedByTheConsumer: StoryObj<{ moved: () => void }> = {
	args: { moved: fn() },
	render: (args) => (
		<div className={STAGE}>
			<Canvas
				label="Workflow"
				nodes={PLACED}
				edges={WORKFLOW.edges}
				groups={WORKFLOW.groups}
				onSelect={fn()}
				onMove={args.moved}
			/>
		</div>
	),
	play: async ({ args, canvas, canvasElement }) => {
		const before = workers();
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(
			() => expect(nodeButton(region, "start")).toBeVisible(),
			LAID,
		);
		await expect(nodeButtons(canvasElement)).toHaveLength(
			WORKFLOW.nodes.length,
		);
		await expect(args.moved).not.toHaveBeenCalled();
		await expect(workers()).toBe(before);
	},
};

export const PlacedByTheCanvas: StoryObj<{
	moved: (id: string, at: unknown) => void;
}> = {
	args: { moved: fn() },
	render: (args) => (
		<div className={STAGE}>
			<Canvas
				label="Workflow"
				nodes={WORKFLOW.nodes}
				edges={WORKFLOW.edges}
				groups={WORKFLOW.groups}
				onSelect={fn()}
				onMove={args.moved}
			/>
		</div>
	),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(
			() => expect(nodeButton(region, "start")).toBeVisible(),
			LAID,
		);
		await expect(args.moved).toHaveBeenCalledTimes(WORKFLOW.nodes.length);
		const calls = (args.moved as ReturnType<typeof fn>).mock.calls;
		await expect(calls.map(([id]) => id)).toEqual(ORDER);
		const spots = new Set(calls.map(([, at]) => JSON.stringify(at)));
		await expect(spots.size).toBe(WORKFLOW.nodes.length);
		const buttons = [...nodeButtons(canvasElement)];
		for (const [index, one] of buttons.entries()) {
			await expect(one).toBeVisible();
			for (const two of buttons.slice(index + 1))
				await expect(apart(rect(one), rect(two))).toBe(true);
		}
	},
};

// In a Split's main the canvas fills it, and the page's regions keep their
// widths.
export const SplitMain: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => (
		<Place title="Workflows" bleed>
			<Split
				list={
					<List
						items={["Nightly", "Weekly"]}
						row={{ key: (name) => name, title: (name) => name }}
					/>
				}
				main={
					<Canvas
						label="Workflow"
						nodes={JOURNEY.nodes}
						edges={JOURNEY.edges}
					/>
				}
			/>
		</Place>
	),
	play: async ({ canvas, canvasElement }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		const main = region.parentElement;
		if (!main) throw new Error("no main");
		const style = getComputedStyle(main);
		const box = rect(main);
		const inner = {
			left: box.left + Number.parseFloat(style.paddingLeft),
			top: box.top + Number.parseFloat(style.paddingTop),
			right: box.right - Number.parseFloat(style.paddingRight),
			bottom: box.bottom - Number.parseFloat(style.paddingBottom),
		};
		const filled = rect(region);
		await expect(Math.abs(filled.left - inner.left)).toBeLessThan(1);
		await expect(Math.abs(filled.top - inner.top)).toBeLessThan(1);
		await expect(Math.abs(filled.right - inner.right)).toBeLessThan(1);
		await expect(Math.abs(filled.bottom - inner.bottom)).toBeLessThan(1);
		await expect(filled.height).toBeGreaterThan(0);
		const list = canvasElement.querySelector("[data-split] > nav");
		await expect(list && rect(list).width).toBeCloseTo(
			Number.parseFloat(WIDTH_VALUE.list),
			0,
		);
	},
};

// A load and the first layout log nothing: no React warning, no library
// warning, no message of the canvas's own. Storybook restores a spy before the
// next story.
let spies: ReturnType<typeof spyOn>[] = [];

export const Silent: StoryObj = {
	beforeEach: () => {
		spies = (["error", "warn", "log"] as const).map((method) =>
			spyOn(console, method),
		);
	},
	render: () => (
		<>
			<div className={STAGE}>
				<Canvas
					label="Workflow"
					nodes={WORKFLOW.nodes}
					edges={WORKFLOW.edges}
					groups={WORKFLOW.groups}
					onSelect={fn()}
				/>
			</div>
			<div className={STAGE}>
				<Canvas
					label="Journey"
					nodes={JOURNEY.nodes}
					edges={JOURNEY.edges}
					onSelect={fn()}
				/>
			</div>
		</>
	),
	play: async ({ canvas }) => {
		for (const name of ["Workflow", "Journey"]) {
			const region = await canvas.findByRole("region", { name });
			await waitFor(
				() =>
					expect(region.querySelector("[data-layer] > button")).toBeVisible(),
				LAID,
			);
		}
		for (const spy of spies) await expect(spy).not.toHaveBeenCalled();
	},
};

// ── States ──────────────────────────────────────────────────────────

// A state fixture in a stage that holds the whole graph; a node's button is
// read by its place in path order, an edge by its `data-edge` mark.
type Fixture = typeof WORKFLOW;

function Stated(props: { graph: Fixture; label: string; heard?: Select }) {
	const [selected, setSelected] = useState<string>();
	return (
		<div className={TALL}>
			<Canvas
				label={props.label}
				nodes={props.graph.nodes}
				edges={props.graph.edges}
				groups={props.graph.groups}
				path={props.graph.path}
				selected={selected}
				onSelect={(id) => {
					props.heard?.(id);
					setSelected(id ?? undefined);
				}}
			/>
		</div>
	);
}

const orderOf = (graph: Fixture) => pathOrder(graph.nodes, graph.edges);

function stateButton(root: Element, graph: Fixture, id: string): HTMLElement {
	const button = nodeButtons(root)[orderOf(graph).indexOf(id)];
	if (!button) throw new Error(`no button for the node ${id}`);
	return button;
}

// A node's text column is its second child; its title is the second line.
function titleText(button: Element): Element {
	const title = button.children[1]?.children[1];
	if (!title) throw new Error("no title");
	return title;
}

function lineText(button: Element): Element {
	const line = button.children[1]?.children[2];
	if (!line) throw new Error("no line");
	return line;
}

const ink = (element: Element) => getComputedStyle(element).color;
// The outline's width, or "none" when it has no style (Chromium reports a
// styleless outline's width as its 3px initial value).
function outline(element: Element): string {
	const style = getComputedStyle(element);
	return style.outlineStyle === "none" ? "none" : style.outlineWidth;
}

// A selected node is its 1px border in the selection colour alone: the colour
// is read from a probe that stands where the node does.
function selected(element: Element): boolean {
	const probe = document.createElement("div");
	probe.style.border = "1px solid var(--color-selected-outline)";
	element.parentElement?.append(probe);
	const colour = getComputedStyle(probe).borderTopColor;
	probe.remove();
	return getComputedStyle(element).borderTopColor === colour;
}

// A synthetic click is a script focus, which Chromium counts as a keyboard one,
// so the focus ring covers the node. The selection is read once focus has left
// the node.
async function clicked(
	userEvent: Parameters<NonNullable<StoryObj["play"]>>[0]["userEvent"],
	button: Element,
) {
	await userEvent.click(button);
	if (document.activeElement instanceof HTMLElement)
		document.activeElement.blur();
}

// The nodes of a story that draws a run's path: the nodes off the path draw
// disabled ink on purpose (about 3:1), which axe exempts only on a disabled
// control, so these stories leave their nodes out of its check. Every other
// canvas story runs every rule.
const DIMMED_NODES = {
	a11y: { context: { exclude: [FOCUS_GUARD, "[data-layer] button"] } },
};

function edgeOf(
	root: Element,
	id: string,
): { ink: string; dash: string | null } {
	const group = root.querySelector(`[data-edge="${id}"]`);
	const line = group?.querySelector('path[fill="none"]');
	if (!group || !line) throw new Error(`no edge ${id}`);
	return { ink: ink(group), dash: line.getAttribute("stroke-dasharray") };
}

async function standing(
	canvas: Parameters<NonNullable<StoryObj["play"]>>[0]["canvas"],
	label: string,
) {
	const region = await canvas.findByRole("region", { name: label });
	await waitFor(() => expect(nodeButtons(region)[0]).toBeVisible(), LAID);
	return region;
}

// Tab walks every node in path order, whatever its state.
async function tabbable(
	userEvent: Parameters<NonNullable<StoryObj["play"]>>[0]["userEvent"],
	region: Element,
	graph: Fixture,
) {
	for (const group of graph.groups ?? []) {
		await userEvent.tab();
		await expect(headOf(region, group.id)).toHaveFocus();
	}
	for (const id of orderOf(graph)) {
		await userEvent.tab();
		await expect(stateButton(region, graph, id)).toHaveFocus();
	}
}

// An off node reads as the word Off in place of its line and in muted ink; its
// edges change ink and keep their dash or lack of one.
export const Off: StoryObj = {
	render: () => <Stated graph={OFF} label="Off" />,
	play: async ({ canvas, userEvent }) => {
		const region = await standing(canvas, "Off");
		const review = stateButton(region, OFF, "review");
		const plan = stateButton(region, OFF, "plan");
		await expect(review).toHaveTextContent("Off");
		await expect(review).not.toHaveTextContent("Reads the changes");
		await expect(ink(titleText(review))).not.toBe(ink(titleText(plan)));
		const rest = edgeOf(region, "plan-build");
		const into = edgeOf(region, "gate-review");
		await expect(into.dash).toBeNull();
		await expect(into.ink).not.toBe(rest.ink);
		const out = edgeOf(region, "review-handoff");
		await expect(out.dash).not.toBeNull();
		await expect(out.ink).not.toBe(rest.ink);
		await tabbable(userEvent, region, OFF);
	},
};

// A problem is its first words in place of the line, in the ink a rest line has
// (status colour belongs to a mark), on a danger border with a danger dot in the
// trailing column; selecting the node takes the danger border for the selection's
// border and keeps the words and the dot.
export const Problem: StoryObj = {
	render: () => <Stated graph={PROBLEM} label="Problem" />,
	play: async ({ canvas, userEvent }) => {
		const region = await standing(canvas, "Problem");
		const build = stateButton(region, PROBLEM, "build");
		const plan = stateButton(region, PROBLEM, "plan");
		await expect(build).toHaveTextContent("Missing the target");
		await expect(build).not.toHaveTextContent("Edits the files");
		await expect(getComputedStyle(build).borderTopColor).not.toBe(
			getComputedStyle(plan).borderTopColor,
		);
		await expect(ink(lineText(build))).toBe(ink(lineText(plan)));
		await expect(build.querySelector(".rounded-full")).not.toBeNull();
		await expect(plan.querySelector(".rounded-full")).toBeNull();
		await clicked(userEvent, build);
		await expect(selected(build)).toBe(true);
		await expect(outline(build)).toBe("none");
		await expect(build).toHaveTextContent("Missing the target");
		await expect(build.querySelector(".rounded-full")).not.toBeNull();
	},
};

// A status is its dot (a spinner while it runs) and its word.
export const Statuses: StoryObj = {
	render: () => <Stated graph={STATUSES} label="Statuses" />,
	play: async ({ canvas }) => {
		const region = await standing(canvas, "Statuses");
		for (const node of STATUSES.nodes) {
			const button = stateButton(region, STATUSES, node.id);
			await expect(button).toHaveTextContent(node.status?.label ?? "none");
			const spinning = button.querySelector(".animate-spin") !== null;
			await expect(spinning).toBe(node.status?.state === "running");
			if (node.status?.state !== "running")
				await expect(button.querySelector(".rounded-full")).not.toBeNull();
		}
		const check = stateButton(region, STATUSES, "check");
		await expect(check).toHaveTextContent("3");
		await expect(check).toHaveTextContent("Failed");
		await expect(stateButton(region, STATUSES, "build")).toHaveTextContent(
			"Running",
		);
	},
};

// A run: the nodes it did not take draw disabled ink and no status, the ones
// it took keep theirs, it stands at one node, and the edges it did not take dim.
export const Run: StoryObj = {
	parameters: DIMMED_NODES,
	render: () => <Stated graph={RUN} label="Run" />,
	play: async ({ canvas, userEvent }) => {
		const region = await standing(canvas, "Run");
		const taken = RUN.path?.nodes ?? [];
		const start = stateButton(region, RUN, "start");
		const handoff = stateButton(region, RUN, "handoff");
		await expect(ink(titleText(handoff))).not.toBe(ink(titleText(start)));
		await expect(handoff).not.toHaveTextContent(/Done|Running/);
		for (const id of taken.slice(0, 5))
			await expect(stateButton(region, RUN, id)).toHaveTextContent("Done");
		await expect(stateButton(region, RUN, "review")).toHaveTextContent(
			"Running",
		);
		for (const node of RUN.nodes)
			await expect(selected(stateButton(region, RUN, node.id))).toBe(
				node.id === RUN.path?.at,
			);
		const rest = edgeOf(region, "build-check");
		await expect(edgeOf(region, "gate-plan").ink).not.toBe(rest.ink);
		await expect(edgeOf(region, "review-handoff").ink).not.toBe(rest.ink);
		await expect(edgeOf(region, "check-build").ink).toBe(rest.ink);
		await tabbable(userEvent, region, RUN);
	},
};

// A scenario that stops at the node that failed: the rest of the journey is
// dimmed, bare of status and still numbered.
export const Scenario: StoryObj = {
	parameters: DIMMED_NODES,
	render: () => <Stated graph={SCENARIO} label="Scenario" />,
	play: async ({ canvas }) => {
		const region = await standing(canvas, "Scenario");
		const failed = stateButton(region, SCENARIO, "b2");
		await expect(selected(failed)).toBe(true);
		await expect(failed).toHaveTextContent("Failed");
		const begin = ink(titleText(stateButton(region, SCENARIO, "begin")));
		const merge = ink(titleText(stateButton(region, SCENARIO, "merge")));
		await expect(merge).not.toBe(begin);
		for (const id of ["merge", "finish", "a1", "a2", "c1"]) {
			const button = stateButton(region, SCENARIO, id);
			await expect(ink(titleText(button))).toBe(merge);
			await expect(button).not.toHaveTextContent(/Passed|Failed/);
		}
		for (const node of SCENARIO.nodes) {
			const button = stateButton(region, SCENARIO, node.id);
			await expect(button.children[2]).toHaveTextContent(String(node.number));
		}
	},
};

// A dimmed node is still a button: it takes the click, the selection, and keeps
// its dimmed ink.
export const SelectsOverAPath: StoryObj<{ heard: Select }> = {
	parameters: DIMMED_NODES,
	args: { heard: fn() },
	render: (args) => <Stated graph={RUN} label="Run" heard={args.heard} />,
	play: async ({ args, canvas, userEvent }) => {
		const region = await standing(canvas, "Run");
		const handoff = stateButton(region, RUN, "handoff");
		const before = ink(titleText(handoff));
		await clicked(userEvent, handoff);
		await expect(args.heard).toHaveBeenCalledWith("handoff");
		await waitFor(() => expect(selected(handoff)).toBe(true));
		await expect(ink(titleText(handoff))).toBe(before);
	},
};

// A path or a status that arrives moves no node: the layout does not run again.
// ELK's worker is one per page, so its resource entry alone cannot tell a second
// run; the requests posted to it can.
let posted: ReturnType<typeof spyOn> | undefined;

function Arrives() {
	const [run, setRun] = useState(false);
	const graph = run ? RUN : WORKFLOW;
	return (
		<>
			<button type="button" onClick={() => setRun(true)}>
				Start the run
			</button>
			<div className={TALL}>
				<Canvas
					label="Arrives"
					nodes={graph.nodes}
					edges={graph.edges}
					groups={graph.groups}
					path={graph.path}
					onSelect={fn()}
				/>
			</div>
		</>
	);
}

export const StateKeepsTheLayout: StoryObj = {
	parameters: DIMMED_NODES,
	beforeEach: () => {
		posted = spyOn(Worker.prototype, "postMessage");
	},
	render: () => <Arrives />,
	play: async ({ canvas, userEvent }) => {
		const region = await standing(canvas, "Arrives");
		const requests = () => posted?.mock.calls.length ?? 0;
		const before = { requests: requests(), workers: workers() };
		await expect(before.requests).toBeGreaterThan(0);
		const box = rect(stateButton(region, WORKFLOW, "plan"));
		await userEvent.click(
			canvas.getByRole("button", { name: "Start the run" }),
		);
		await waitFor(() =>
			expect(stateButton(region, RUN, "review")).toHaveTextContent("Running"),
		);
		await new Promise((done) => setTimeout(done, 500));
		await expect(requests()).toBe(before.requests);
		await expect(workers()).toBe(before.workers);
		await expect(rect(stateButton(region, RUN, "plan")).top).toBe(box.top);
	},
};

// A waiting canvas stands the loaded one's ground and grid with three
// node-shaped cards stacked at its centre, and is busy and inert: no button, no
// zoom stack, no act, however the page handlers read.
export const Loading: StoryObj = {
	render: () => (
		<>
			<div className={STAGE} data-testid="loaded">
				<Canvas label="Loaded" nodes={WORKFLOW.nodes} edges={WORKFLOW.edges} />
			</div>
			<div className={STAGE} data-testid="waiting">
				<Canvas
					label="Waiting"
					nodes={WORKFLOW.nodes}
					loading
					onSelect={fn()}
					onMove={fn()}
					onConnect={fn()}
					act={{ label: "Add node", onAct: fn() }}
				/>
			</div>
		</>
	),
	play: async ({ canvas }) => {
		const waiting = await canvas.findByRole("region", { name: "Waiting" });
		const loaded = await canvas.findByRole("region", { name: "Loaded" });
		await waitFor(
			() => expect(getComputedStyle(loaded).opacity).toBe("1"),
			LAID,
		);
		await expect(waiting).toHaveAttribute("aria-busy", "true");
		await expect(waiting.querySelectorAll("button")).toHaveLength(0);
		await expect(waiting.querySelector("[data-grid]")).not.toBeNull();
		await expect(getComputedStyle(waiting).backgroundColor).toBe(
			getComputedStyle(loaded).backgroundColor,
		);
		const cards = [
			...(waiting.querySelector("[aria-hidden]:not(svg)")?.children ?? []),
		];
		await expect(cards).toHaveLength(3);
		const node = rect(
			canvas
				.getByText(WORKFLOW.nodes[0]?.title ?? "")
				.closest("[data-layer] > div") as Element,
		);
		const pane = rect(waiting);
		for (const card of cards) {
			await expect(rect(card).width).toBeCloseTo(node.width, 0);
			await expect(
				Math.abs(
					rect(card).left + rect(card).width / 2 - (pane.left + pane.width / 2),
				),
			).toBeLessThan(1);
		}
		await expect(rect(waiting).height).toBe(rect(loaded).height);
	},
};

// An `empty` sentence stands centred under the graph's bounds, a `pair` below
// its bottom edge, holds its size on screen at any zoom, takes no pointer, and
// describes the region.
export const EmptyText: StoryObj = {
	render: () => (
		<div className={STAGE}>
			<Canvas
				label="Workflow"
				nodes={WORKFLOW.nodes.slice(0, 1)}
				empty={EMPTY}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(
			() => expect(getComputedStyle(region).opacity).toBe("1"),
			LAID,
		);
		const text = canvas.getByText(EMPTY);
		const node = canvas
			.getByText(WORKFLOW.nodes[0]?.title ?? "")
			.closest("[data-layer] > div") as HTMLElement;
		await expect(region).toHaveAccessibleDescription(EMPTY);
		await expect(getComputedStyle(text).pointerEvents).toBe("none");
		const standing = () => ({
			x:
				rect(text).left +
				rect(text).width / 2 -
				(rect(node).left + rect(node).width / 2),
			gap: rect(text).top - rect(node).bottom,
			height: rect(text).height,
		});
		const first = standing();
		await expect(Math.abs(first.x)).toBeLessThan(1);
		await expect(first.gap).toBeGreaterThan(0);
		await userEvent.click(canvas.getByRole("button", { name: "Zoom out" }));
		await userEvent.click(canvas.getByRole("button", { name: "Zoom out" }));
		await waitFor(() => expect(viewport(region).scale).toBeLessThan(1));
		await expect(rect(text).height).toBeCloseTo(first.height, 0);
		await expect(rect(text).width).toBeLessThanOrEqual(
			parseFloat(getComputedStyle(text).maxWidth) + 1,
		);
	},
};

// Each generated canvas frame's stage, but the glyph's (which `Canvas overview`
// checks, fitted under the text floor), holds its whole graph at scale 1: the
// drawing (frames, chips, nodes) and every node's button lie inside the pane
// the canvas draws in, so the state a frame is there to show is on screen.
// The two densities size nodes differently, so each is checked.
function framesHoldTheirGraph(density: "desktop" | "touch"): StoryObj {
	const frames = showcaseFrames().filter(
		(frame) =>
			frame.component === "Canvas" &&
			frame.mode === "light" &&
			frame.density === density &&
			(frame.state === "rest" || frame.state === "selected") &&
			!frame.cell.name.startsWith("CANVAS_NODE_GLYPH") &&
			drawCanvas(frame) !== undefined,
	);
	return {
		globals: { density },
		parameters: DIMMED_NODES,
		render: () => (
			<div className="flex flex-col gap-pair">
				{frames.map((frame) => (
					<Frame key={frame.id} frame={frame} draw={drawCanvas} />
				))}
			</div>
		),
		play: async ({ canvasElement }) => {
			const drawnFrames = [...canvasElement.querySelectorAll("[data-cell]")];
			await expect(drawnFrames).toHaveLength(frames.length);
			for (const frame of drawnFrames) {
				const regions = [...frame.querySelectorAll("section")];
				if (regions.length === 0) throw new Error(`no canvas in ${frame.id}`);
				for (const region of regions) {
					const layer = region.querySelector("[data-layer]");
					if (!layer) throw new Error(`no layer in ${frame.id}`);
					await waitFor(
						() => expect(getComputedStyle(region).opacity).toBe("1"),
						LAID,
					);
					await expect(viewport(region).scale).toBe(1);
					const pane = rect(region);
					for (const button of nodeButtons(region))
						await expect(holds(pane, rect(button))).toBe(true);
					await expect(holds(pane, drawn(layer))).toBe(true);
				}
				await expect([...nodeButtons(frame)].length).toBeGreaterThanOrEqual(
					JOURNEY.nodes.length - 1,
				);
			}
		},
	};
}

export const FramesHoldTheirGraphAtDesktop = framesHoldTheirGraph("desktop");
export const FramesHoldTheirGraphAtTouch = framesHoldTheirGraph("touch");

// ── A group with an empty body ──────────────────────────────────────

// A group holding no present node is a frame at the size of its head and
// padding, in its place in the path with its edges meeting it, and alone on a
// canvas of no node; its head chooses it as any group's does, and it is no
// node, so `onMove` never hears it.
export const HollowGroup: StoryObj<{ heard: Select; moved: Moved }> = {
	args: { heard: fn(), moved: fn() },
	globals: { viewport: { value: "w1440", isRotated: false } },
	parameters: {
		layout: "fullscreen",
		viewport: {
			options: {
				w1440: {
					name: "1440",
					styles: { width: "1440px", height: "900px" },
					type: "desktop",
				},
			},
		},
	},
	render: (args) => (
		<>
			<div className={STAGE}>
				<Canvas
					label="Hollow loop"
					nodes={HOLLOW.nodes}
					edges={HOLLOW.edges}
					groups={HOLLOW.groups}
					onSelect={args.heard}
					onMove={args.moved}
				/>
			</div>
			<div className={ALONE_STAGE}>
				<Canvas
					label="Lone loop"
					nodes={HOLLOW_ALONE.nodes}
					groups={HOLLOW_ALONE.groups}
					onSelect={args.heard}
				/>
			</div>
		</>
	),
	play: async ({ args, canvas, userEvent }) => {
		const between = await canvas.findByRole("region", { name: "Hollow loop" });
		const alone = await canvas.findByRole("region", { name: "Lone loop" });
		for (const region of [between, alone])
			await waitFor(
				() => expect(getComputedStyle(region).opacity).toBe("1"),
				LAID,
			);
		hollowHeld(between, { id: "loop", into: "plan-loop", out: "loop-handoff" });
		hollowHeld(alone, { id: "loop" });
		await waitFor(() =>
			expect(args.moved).toHaveBeenCalledTimes(HOLLOW.nodes.length),
		);
		await expect(
			(args.moved as ReturnType<typeof fn>).mock.calls.map(([id]) => id),
		).not.toContain("loop");
		await userEvent.click(headOf(between, "loop"));
		await expect(args.heard).toHaveBeenLastCalledWith("loop");
		await userEvent.click(headOf(alone, "loop"));
		await expect(args.heard).toHaveBeenCalledTimes(2);
	},
};

// Every node carries a position, so no layout runs: the empty groups stand in
// one row below the nodes, left-aligned with them, in path order (the one an
// edge names first), the edge meets its frame, a head chooses its group, and
// `onMove` hears nothing.
export const HollowGroupPlaced: StoryObj<{ heard: Select; moved: Moved }> = {
	args: { heard: fn(), moved: fn() },
	globals: { viewport: { value: "w1440", isRotated: false } },
	parameters: {
		layout: "fullscreen",
		viewport: {
			options: {
				w1440: {
					name: "1440",
					styles: { width: "1440px", height: "900px" },
					type: "desktop",
				},
			},
		},
	},
	render: (args) => (
		<div className={STAGE}>
			<Canvas
				label="Placed loop"
				nodes={HOLLOW_PLACED.nodes}
				edges={HOLLOW_PLACED.edges}
				groups={HOLLOW_PLACED.groups}
				onSelect={args.heard}
				onMove={args.moved}
			/>
		</div>
	),
	play: async ({ args, canvas, userEvent }) => {
		const placed = await canvas.findByRole("region", { name: "Placed loop" });
		await waitFor(
			() => expect(getComputedStyle(placed).opacity).toBe("1"),
			LAID,
		);
		hollowHeld(placed, { id: "loop", into: "handoff-loop" });
		hollowHeld(placed, { id: "retry" });
		hollowRow(placed, ["loop", "retry"]);
		await expect(args.moved).not.toHaveBeenCalled();
		await userEvent.click(headOf(placed, "retry"));
		await expect(args.heard).toHaveBeenLastCalledWith("retry");
	},
};

// ── Editing by pointer ──────────────────────────────────────────────

// Input is the browser's own mouse (`mouse.ts`), so a press, a move and a
// release are real pointer events and real hit-testing.
type Moved = (id: string, at: CanvasPoint) => void;
type Connected = (from: string, to: string | null) => void;
type Spy<T extends (...args: never[]) => unknown> = ReturnType<typeof fn<T>>;
interface Heard {
	moved: Moved;
	connected: Connected;
	selected: Select;
}
const HEARD: Heard = { moved: fn(), connected: fn(), selected: fn() };
const calls = (spy: unknown) => (spy as Spy<Moved>).mock.calls;

const ADDED: CanvasNode = {
	id: "added",
	icon: "Plus",
	overline: "Step",
	title: "New step",
	line: "Added from outside",
};

// A page that stores what `onMove` reports, the way the canvas expects, and
// records what it hears. `move` and `connect` choose which handlers it passes;
// a button outside the canvas appends a node with no position.
function Editable(
	props: Heard & { move: boolean; connect: boolean; start?: CanvasNode[] },
) {
	const [nodes, setNodes] = useState(props.start ?? WORKFLOW.nodes);
	const [selected, setSelected] = useState<string>();
	return (
		<>
			<button
				type="button"
				onClick={() => setNodes((last) => [...last, ADDED])}
			>
				Append a node
			</button>
			<div className={STAGE}>
				<Canvas
					label="Workflow"
					nodes={nodes}
					edges={WORKFLOW.edges}
					groups={WORKFLOW.groups}
					selected={selected}
					onSelect={(id) => {
						props.selected(id);
						setSelected(id ?? undefined);
					}}
					onMove={
						props.move
							? (id, at) => {
									props.moved(id, at);
									setNodes((last) =>
										last.map((node) =>
											node.id === id ? { ...node, position: at } : node,
										),
									);
								}
							: undefined
					}
					onConnect={props.connect ? props.connected : undefined}
					act={{ label: "Add a step", onAct: fn() }}
				/>
			</div>
		</>
	);
}

const edit = (move: boolean, connect: boolean, start?: CanvasNode[]) =>
	({
		args: HEARD,
		render: (args: Heard) => (
			<Editable {...args} move={move} connect={connect} start={start} />
		),
	}) satisfies StoryObj<Heard>;

const centre = (box: DOMRect): Point => ({
	x: box.left + box.width / 2,
	y: box.top + box.height / 2,
});

// A node's button by its id, wherever the page holds it in path order.
function nodeFor(root: Element, id: string): HTMLElement {
	const title = WORKFLOW.nodes
		.concat(ADDED)
		.find((node) => node.id === id)?.title;
	const button = [...nodeButtons(root)].find(
		(each) => title && each.textContent?.includes(title),
	);
	if (!button) throw new Error(`no button for the node ${id}`);
	return button;
}

const portOf = (root: Element, id: string, kind: "in" | "out"): HTMLElement => {
	const port = nodeFor(root, id).querySelector<HTMLElement>(
		`[data-port="${kind}"]`,
	);
	if (!port) throw new Error(`no ${kind} port on ${id}`);
	return port;
};

const at = (element: Element) => centre(rect(element));
const layerOf = (root: Element) => {
	const layer = root.querySelector<HTMLElement>("[data-layer]");
	if (!layer) throw new Error("no layer");
	return layer;
};
const left = (element: HTMLElement) => Number.parseFloat(element.style.left);
const top = (element: HTMLElement) => Number.parseFloat(element.style.top);
const around = (a: number, b: number, within = 0.5) =>
	Math.abs(a - b) <= within;

// Waits for the page's first layout: every node reported, the canvas shown.
async function laidOut(
	canvas: Parameters<NonNullable<StoryObj["play"]>>[0]["canvas"],
	heard?: Moved,
) {
	const region = await canvas.findByRole("region", { name: "Workflow" });
	if (heard)
		await waitFor(
			() => expect(heard).toHaveBeenCalledTimes(WORKFLOW.nodes.length),
			LAID,
		);
	await waitFor(() => expect(nodeFor(region, "plan")).toBeVisible(), LAID);
	return region;
}

// A point of the ground: the topmost element there is the region, its layer or
// its grid.
function groundPoint(region: Element): Point {
	const pane = rect(region);
	for (let y = pane.top + 20; y < pane.bottom - 20; y += 24)
		for (let x = pane.right - 20; x > pane.left + 20; x -= 24) {
			const top = document.elementFromPoint(x, y);
			if (
				top &&
				(top === region ||
					top.matches("[data-layer], [data-ground], [data-ground] *"))
			)
				return { x, y };
		}
	throw new Error("no ground in the region");
}

const shift = (point: Point, x: number, y: number): Point => ({
	x: point.x + x,
	y: point.y + y,
});

// A node dragged by the pointer follows it at once and reports once, on
// release, in flow coordinates; a drag does not pan and does not select.
export const MovesANode: StoryObj<Heard> = {
	...edit(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const plan = nodeFor(region, "plan");
		const build = nodeFor(region, "build");
		const frame = [...layerOf(canvasElement).children].find((child) =>
			child.textContent?.includes(WORKFLOW.groups?.[0]?.head ?? "?"),
		);
		const back = () =>
			canvasElement
				.querySelector('[data-edge="check-build"] path[fill="none"]')
				?.getAttribute("d");
		const before = {
			view: viewport(canvasElement),
			x: left(plan),
			y: top(plan),
			reports: calls(args.moved).length,
		};
		const { scale } = before.view;
		const from = at(plan);
		await mouseDrag(from, shift(from, 120, 60), {
			hold: async () => {
				await expect(around(left(plan), before.x + 120 / scale)).toBe(true);
				await expect(around(top(plan), before.y + 60 / scale)).toBe(true);
				await expect(viewport(canvasElement)).toEqual(before.view);
				await expect(calls(args.moved)).toHaveLength(before.reports);
			},
		});
		await expect(calls(args.moved)).toHaveLength(before.reports + 1);
		const [id, to] = calls(args.moved).at(-1) ?? [];
		await expect(id).toBe("plan");
		await expect(around(to.x, before.x + 120 / scale, 0.01)).toBe(true);
		await expect(around(to.y, before.y + 60 / scale, 0.01)).toBe(true);
		await expect(args.selected).not.toHaveBeenCalled();
		await expect(viewport(canvasElement)).toEqual(before.view);

		// A press that never moves reports no position; the click selects.
		const reports = calls(args.moved).length;
		await mouseClick(at(plan));
		await expect(calls(args.moved)).toHaveLength(reports);
		await expect(args.selected).toHaveBeenCalledWith("plan");

		// The back edge's path and the group's frame follow a member.
		const path = back();
		const box = frame && JSON.stringify(rect(frame));
		const start = at(build);
		await mouseDrag(start, shift(start, 90, 40), {
			hold: async () => {
				await expect(back()).not.toBe(path);
				await expect(frame && JSON.stringify(rect(frame))).not.toBe(box);
			},
		});
	},
};

// A node standing partly outside the region, pressed and dragged, does not pan
// the view under the pointer.
export const MoveDoesNotPan: StoryObj<Heard> = {
	...edit(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const plan = nodeFor(region, "plan");
		wheel(region, {
			deltaY: rect(plan).top - rect(region).top + 10,
		});
		await waitFor(() => expect(rect(plan).top).toBeLessThan(rect(region).top));
		const before = viewport(canvasElement);
		const from = { x: at(plan).x, y: rect(region).top + 4 };
		await mouseDrag(from, shift(from, 40, 30), {
			hold: async () => {
				await expect(viewport(canvasElement)).toEqual(before);
			},
		});
		await expect(viewport(canvasElement)).toEqual(before);
		await expect(args.selected).not.toHaveBeenCalled();
	},
};

// Arrange puts every node back where the layout had it, reports each in path
// order and fits the view, without loading the layout's worker again.
export const Arranges: StoryObj<Heard> = {
	...edit(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const count = WORKFLOW.nodes.length;
		const first = calls(args.moved)
			.slice(0, count)
			.map(([id, point]) => ({ id, point }));
		await expect(first.map(({ id }) => id)).toEqual(ORDER);
		const loaded = workers();
		for (const id of ["plan", "build"]) {
			const from = at(nodeFor(region, id));
			await mouseDrag(from, shift(from, 70, 30));
		}
		await expect(calls(args.moved)).toHaveLength(count + 2);
		const arrange = canvas.getByRole("button", { name: "Arrange" });
		await mouseClick(at(arrange));
		await waitFor(
			() => expect(calls(args.moved)).toHaveLength(2 * count + 2),
			LAID,
		);
		await expect(
			calls(args.moved)
				.slice(count + 2)
				.map(([id, point]) => ({ id, point })),
		).toEqual(first);
		await waitFor(() => {
			for (const node of nodeButtons(canvasElement))
				expect(holds(rect(region), rect(node))).toBe(true);
		});
		await mouseClick(at(arrange));
		await waitFor(
			() => expect(calls(args.moved)).toHaveLength(3 * count + 2),
			LAID,
		);
		await expect(workers()).toBe(loaded);
	},
};

// A port drag to another node's in port reports the pair; the canvas draws no
// edge. A line follows the pointer while it is down and is gone after.
export const ConnectsToANode: StoryObj<Heard> = {
	...edit(true, true),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const edges = () => canvasElement.querySelectorAll("g[data-edge]").length;
		const drawn = edges();
		const reports = calls(args.moved).length;
		const from = at(portOf(region, "plan", "out"));
		const to = at(portOf(region, "build", "in"));
		await mouseDrag(from, to, {
			hold: async () => {
				const line = canvasElement.querySelector("[data-link] path[fill=none]");
				await expect(line).not.toBeNull();
				const end = line ? rect(line) : new DOMRect();
				await expect(around(end.bottom, to.y, 2)).toBe(true);
				await expect(end.left - 2 <= to.x && to.x <= end.right + 2).toBe(true);
			},
		});
		await expect(args.connected).toHaveBeenCalledTimes(1);
		await expect(args.connected).toHaveBeenCalledWith("plan", "build");
		await expect(edges()).toBe(drawn);
		await expect(canvasElement.querySelector("[data-link]")).toBeNull();
		await expect(args.selected).not.toHaveBeenCalled();
		await expect(calls(args.moved)).toHaveLength(reports);
	},
};

// A release on the ground reports `null`; a release over a node's body, the zoom
// stack or outside the region reports nothing, and a self connection is reported.
export const ConnectsToTheGround: StoryObj<Heard> = {
	...edit(true, true),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const from = at(portOf(region, "plan", "out"));
		const view = viewport(canvasElement);
		await mouseDrag(from, groundPoint(region));
		await expect(args.connected).toHaveBeenCalledTimes(1);
		await expect(args.connected).toHaveBeenLastCalledWith("plan", null);

		for (const to of [
			at(nodeFor(region, "build")),
			at(canvas.getByRole("button", { name: "Zoom in" })),
			{ x: rect(region).left - 8, y: from.y },
		]) {
			await mouseDrag(from, to);
			await expect(args.connected).toHaveBeenCalledTimes(1);
		}

		// An in port starts nothing and does not pan; an out port pressed and
		// released without moving reports nothing.
		const reports = calls(args.moved).length;
		const inPort = at(portOf(region, "plan", "in"));
		await mouseDrag(inPort, shift(inPort, 60, -20), {
			hold: async () => {
				await expect(canvasElement.querySelector("[data-link]")).toBeNull();
			},
		});
		await mouseClick(from);
		await expect(args.connected).toHaveBeenCalledTimes(1);
		await expect(calls(args.moved)).toHaveLength(reports);
		await expect(viewport(canvasElement)).toEqual(view);

		await mouseDrag(from, at(portOf(region, "plan", "in")));
		await expect(args.connected).toHaveBeenCalledTimes(2);
		await expect(args.connected).toHaveBeenLastCalledWith("plan", "plan");
	},
};

// A node with no position among placed ones lands centred on the viewport and
// is chosen, painted over what stands there; the placed ones stay.
export const LandsANode: StoryObj<Heard> = {
	...edit(true, false, PLACED),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas);
		await expect(args.moved).not.toHaveBeenCalled();
		const plan = nodeFor(region, "plan");
		// Pan the ground until the plan stands on the region's centre.
		const pane = centre(rect(region));
		const away = at(plan);
		const ground = groundPoint(region);
		await mouseDrag(ground, shift(ground, pane.x - away.x, pane.y - away.y));
		await waitFor(() => expect(around(at(plan).x, pane.x, 1)).toBe(true));
		const stood = [...nodeButtons(canvasElement)].map((node) => [
			node.style.left,
			node.style.top,
		]);
		const seen: { visible: boolean; x: number; y: number }[] = [];
		let watching = true;
		const sample = () => {
			const added = [...nodeButtons(canvasElement)].find((node) =>
				node.textContent?.includes(ADDED.title),
			);
			if (added)
				seen.push({
					visible: getComputedStyle(added).visibility !== "hidden",
					x: rect(added).left,
					y: rect(added).top,
				});
			if (watching) requestAnimationFrame(sample);
		};
		sample();
		await mouseClick(at(canvas.getByRole("button", { name: "Append a node" })));
		await waitFor(() => expect(args.moved).toHaveBeenCalledTimes(1), LAID);
		await waitFor(() => expect(args.selected).toHaveBeenCalledWith("added"));
		const added = nodeFor(region, "added");
		await waitFor(() => expect(added).toBeVisible());
		watching = false;
		await expect(calls(args.moved)[0]?.[0]).toBe("added");
		await expect(around(at(added).x, pane.x, 2)).toBe(true);
		await expect(around(at(added).y, pane.y, 2)).toBe(true);
		await expect(
			[...nodeButtons(canvasElement)]
				.filter((node) => node !== added)
				.map((node) => [node.style.left, node.style.top]),
		).toEqual(stood);
		// It paints over the plan it covers, and was never drawn elsewhere.
		const over = document.elementsFromPoint(pane.x, pane.y);
		await expect(over.indexOf(added)).toBeLessThan(over.indexOf(plan));
		const placed = seen.filter((frame) => frame.visible);
		for (const frame of placed) {
			await expect(around(frame.x, rect(added).left, 2)).toBe(true);
			await expect(around(frame.y, rect(added).top, 2)).toBe(true);
		}
	},
};

// The handlers a canvas is given decide what it draws and does.
function handlers(move: boolean, connect: boolean): StoryObj<Heard> {
	return {
		...edit(move, connect),
		play: async ({ args, canvas, canvasElement }) => {
			const region = await laidOut(canvas, move ? args.moved : undefined);
			const plan = nodeFor(region, "plan");
			await expect(canvasElement.querySelectorAll("[data-port]")).toHaveLength(
				connect ? 2 * WORKFLOW.nodes.length : 0,
			);
			await expect(
				canvas.queryByRole("button", { name: "Arrange" }) !== null,
			).toBe(move);
			await expect(plan.hasAttribute("data-no-pan")).toBe(move);
			const view = viewport(canvasElement);
			const from = at(plan);
			const start = { x: left(plan), y: top(plan) };
			await mouseDrag(from, shift(from, 60, 40));
			if (move) {
				await expect(left(plan)).not.toBe(start.x);
				await expect(viewport(canvasElement)).toEqual(view);
				return;
			}
			await waitFor(() => expect(viewport(canvasElement).x).not.toBe(view.x));
			await expect({ x: left(plan), y: top(plan) }).toEqual(start);
			if (!connect) return;
			// A drag on a port connects and does not pan.
			const panned = viewport(canvasElement);
			const out = at(portOf(region, "plan", "out"));
			await mouseDrag(out, groundPoint(region));
			await expect(args.connected).toHaveBeenCalledWith("plan", null);
			await expect(viewport(canvasElement)).toEqual(panned);
		},
	};
}

export const HandlersNone = handlers(false, false);
export const HandlersMove = handlers(true, false);
export const HandlersConnect = handlers(false, true);
export const HandlersBoth = handlers(true, true);

// At the desktop a port's ring is 8 and its hit 24, centred on the node's top
// or bottom edge, where a route starts or ends.
export const PortGeometry: StoryObj<Heard> = {
	...edit(false, true),
	play: async ({ canvas, canvasElement }) => {
		const region = await laidOut(canvas);
		const view = viewport(canvasElement);
		const pane = rect(region);
		const start = (id: string) => {
			const d = canvasElement
				.querySelector(`[data-edge="${id}"] path[fill="none"]`)
				?.getAttribute("d");
			const [x = "0", y = "0"] =
				/^M(-?[\d.]+) (-?[\d.]+)/.exec(d ?? "")?.slice(1) ?? [];
			return {
				x: pane.left + view.x + Number(x) * view.scale,
				y: pane.top + view.y + Number(y) * view.scale,
			};
		};
		for (const node of WORKFLOW.nodes) {
			const box = rect(nodeFor(region, node.id));
			for (const kind of ["in", "out"] as const) {
				const hit = rect(portOf(region, node.id, kind));
				const ring = portOf(region, node.id, kind).firstElementChild;
				const dot = ring ? rect(ring) : new DOMRect();
				await expect([dot.width, dot.height]).toEqual([8, 8]);
				await expect([hit.width, hit.height]).toEqual([24, 24]);
				await expect(around(centre(hit).x, centre(dot).x, 0.01)).toBe(true);
				await expect(around(centre(hit).y, centre(dot).y, 0.01)).toBe(true);
				await expect(around(centre(dot).x, box.left + box.width / 2, 1)).toBe(
					true,
				);
				await expect(
					around(centre(dot).y, kind === "in" ? box.top : box.bottom, 0.01),
				).toBe(true);
			}
		}
		const end = start("plan-build");
		const out = centre(
			rect(portOf(region, "plan", "out").firstElementChild ?? region),
		);
		await expect(around(out.x, end.x, 1)).toBe(true);
		await expect(around(out.y, end.y, 1)).toBe(true);
	},
};

// The keyboard is as it was: nodes in path order, the zoom stack with Arrange,
// then the act, and no port takes focus.
export const KeyboardWithEditing: StoryObj<Heard> = {
	...edit(true, true),
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		const region = await laidOut(canvas, args.moved);
		(document.activeElement as HTMLElement | null)?.blur();
		await userEvent.tab();
		await expect(
			canvas.getByRole("button", { name: "Append a node" }),
		).toHaveFocus();
		for (const group of WORKFLOW.groups ?? []) {
			await userEvent.tab();
			await expect(headOf(region, group.id)).toHaveFocus();
		}
		for (const id of ORDER) {
			await userEvent.tab();
			await expect(nodeButton(region, id)).toHaveFocus();
		}
		for (const name of [
			"Zoom in",
			"Zoom out",
			"Fit",
			"Arrange",
			"Add a step",
		]) {
			await userEvent.tab();
			await expect(canvas.getByRole("button", { name })).toHaveFocus();
		}
		for (const port of canvasElement.querySelectorAll("[data-port]")) {
			await expect(port.hasAttribute("tabindex")).toBe(false);
			await expect(port.closest("button")).not.toBeNull();
		}
	},
};

// A draggable node does not stop the wheel: a plain wheel pans and one with
// Ctrl zooms, over the node as over the ground.
export const WheelOverADraggableNode: StoryObj<Heard> = {
	...edit(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const plan = nodeFor(region, "plan");
		await expect(plan.hasAttribute("data-no-pan")).toBe(true);
		const before = viewport(canvasElement);
		await expect(wheel(plan, { deltaY: 60 }).defaultPrevented).toBe(true);
		const panned = viewport(canvasElement);
		await expect(panned.scale).toBe(before.scale);
		await expect(panned.y).toBeLessThan(before.y);
		wheel(plan, { deltaY: 50, ctrlKey: true });
		await expect(viewport(canvasElement).scale).toBeLessThan(before.scale);
	},
};

// ── Editing's marks ─────────────────────────────────────────────────

// A node's pointer marks: the dragged node stands over the ones it crosses with
// no shadow, the in port a link would end on fills with ink, and each port has
// its own cursor.
export const LiftsADraggedNode: StoryObj<Heard> = {
	...edit(true, false),
	play: async ({ args, canvas }) => {
		const region = await laidOut(canvas, args.moved);
		const plan = nodeFor(region, "plan");
		const build = nodeFor(region, "build");
		// The DOM holds `plan` before `build`, so at rest `build` stands over it.
		await expect(ORDER.indexOf("plan")).toBeLessThan(ORDER.indexOf("build"));
		const over = (point: Point) =>
			document.elementFromPoint(point.x, point.y)?.closest("button");
		const meet = at(build);
		await mouseDrag(at(plan), meet, {
			hold: async () => {
				await waitFor(() => expect(over(meet)).toBe(plan));
				await expect(getComputedStyle(plan).boxShadow).toBe("none");
			},
		});
		await expect(args.moved).toHaveBeenCalled();
		await waitFor(() => expect(over(meet)).toBe(build));
	},
};

export const MarksTheConnectionTarget: StoryObj<Heard> = {
	...edit(true, true),
	play: async ({ args, canvas }) => {
		const region = await laidOut(canvas, args.moved);
		const ring = (id: string) => {
			const dot = portOf(region, id, "in").firstElementChild;
			if (!dot) throw new Error(`no ring on ${id}`);
			return dot;
		};
		const fill = (id: string) => getComputedStyle(ring(id)).backgroundColor;
		const stroke = (id: string) => getComputedStyle(ring(id)).borderTopColor;
		const rest = fill("check");
		await expect(rest).not.toBe(stroke("build"));
		const from = at(portOf(region, "plan", "out"));
		await mouseDrag(from, at(portOf(region, "build", "in")), {
			hold: async () => {
				// Under pointer capture :hover never reaches the port, so the canvas
				// says which port the link would end on.
				await waitFor(() => expect(fill("build")).toBe(stroke("build")));
				await expect(fill("build")).not.toBe(fill("check"));
				await expect(fill("check")).toBe(rest);
			},
		});
		await waitFor(() => expect(fill("build")).toBe(rest));
		await expect(args.connected).toHaveBeenLastCalledWith("plan", "build");

		// Over the ground no port is the target.
		await mouseDrag(from, groundPoint(region), {
			hold: async () => {
				for (const node of WORKFLOW.nodes)
					await expect(fill(node.id)).toBe(rest);
			},
		});
	},
};

export const PortCursors: StoryObj<Heard> = {
	...edit(true, true),
	play: async ({ args, canvas }) => {
		const region = await laidOut(canvas, args.moved);
		for (const node of WORKFLOW.nodes) {
			const out = portOf(region, node.id, "out");
			const into = portOf(region, node.id, "in");
			await expect(getComputedStyle(out).cursor).toBe("crosshair");
			await expect(getComputedStyle(into).cursor).toBe("default");
			await expect(getComputedStyle(nodeFor(region, node.id)).cursor).toBe(
				"grab",
			);
		}
	},
};

// With ports a forward edge's arrowhead tip stands on the ring's outer top, so
// the ring covers none of it; without them the edge ends on the node's edge.
const gapAbove = (root: Element, edge: string, target: HTMLElement) => {
	const d = root
		.querySelector(`[data-edge="${edge}"] path[fill="none"]`)
		?.getAttribute("d");
	const [, , y = "0"] = /(-?[\d.]+) (-?[\d.]+)$/.exec(d ?? "") ?? [];
	return top(target) - Number(y);
};

export const ArrowEndsAboveThePort: StoryObj<Heard> = {
	...edit(true, true),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		const ring = portOf(region, "build", "in").firstElementChild;
		const line = canvasElement.querySelector(
			'[data-edge="plan-build"] path[fill="none"]',
		);
		const marker = canvasElement.querySelector(
			'[data-edge="plan-build"] marker',
		);
		if (!ring || !line || !marker) throw new Error("no ring, line or marker");
		const { scale } = viewport(canvasElement);
		// The tip stands where the marker puts it: its length past the point on
		// the line's end (`refX`), at the layer's scale. The line's box ends there.
		const overhang =
			(Number(marker.getAttribute("markerWidth")) -
				Number(marker.getAttribute("refX"))) *
			scale;
		const tip = rect(line).bottom + overhang;
		const outer = rect(ring).top;
		// At or above the ring's outer top, and on it to a pixel: the ring covers
		// none of the arrowhead and the arrowhead does not float.
		await expect(tip).toBeLessThanOrEqual(outer);
		await expect(outer - tip).toBeLessThanOrEqual(scale);
	},
};

export const ArrowEndsOnTheNodeWithoutPorts: StoryObj<Heard> = {
	...edit(true, false),
	play: async ({ args, canvas, canvasElement }) => {
		const region = await laidOut(canvas, args.moved);
		await expect(
			around(
				gapAbove(canvasElement, "plan-build", nodeFor(region, "build")),
				0,
				0.5,
			),
		).toBe(true);
	},
};

// A port is a live control: it keeps full `edge-strong` ink on every node's
// tone (a node off a run's path, off, or with a problem), and a path does not
// gate editing.
function StatedEditing(props: { graph: Fixture; label: string }) {
	return (
		<div className={TALL}>
			<Canvas
				label={props.label}
				nodes={props.graph.nodes}
				edges={props.graph.edges}
				groups={props.graph.groups}
				path={props.graph.path}
				onSelect={fn()}
				onMove={fn()}
				onConnect={fn()}
			/>
		</div>
	);
}

export const PortsOnEveryTone: StoryObj = {
	parameters: DIMMED_NODES,
	render: () => (
		<>
			<StatedEditing graph={RUN} label="Run" />
			<StatedEditing graph={PROBLEM} label="Problem" />
			<StatedEditing graph={OFF} label="Off" />
		</>
	),
	play: async ({ canvas }) => {
		for (const [graph, label] of [
			[RUN, "Run"],
			[PROBLEM, "Problem"],
			[OFF, "Off"],
		] as const) {
			const region = await standing(canvas, label);
			const edge = ink(
				region.querySelector('[data-edge="build-check"]') ?? region,
			);
			for (const node of graph.nodes) {
				const button = stateButton(region, graph, node.id);
				for (const kind of ["in", "out"] as const) {
					const port = button.querySelector(`[data-port="${kind}"]`);
					await expect(port).not.toBeNull();
					const dot = port?.firstElementChild;
					await expect(dot && getComputedStyle(dot).borderTopColor).toBe(edge);
				}
			}
		}
	},
};
