import { Canvas } from "@fcalell/plugin-react-ui/components/canvas";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Split } from "@fcalell/plugin-react-ui/components/split";
import { showcaseFrames } from "@fcalell/plugin-react-ui/showcase/cells";
import { Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import {
	drawCanvas,
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
import type { CanvasNode } from "@fcalell/ui-core/descriptors";
import { WIDTH_VALUE } from "@fcalell/ui-core/tokens";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, spyOn, waitFor } from "storybook/test";

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

// The nodes in path order, then Zoom in, Zoom out, Fit; Enter chooses the
// focused node and Escape clears the choice.
export const Keyboard: StoryObj<{ heard: Select }> = {
	args: { heard: fn() },
	render: (args) => <Workflow heard={args.heard} />,
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		const region = await canvas.findByRole("region", { name: "Workflow" });
		await waitFor(
			() => expect(nodeButton(region, ORDER[0] ?? "")).toBeVisible(),
			LAID,
		);
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
		for (let step = 0; step < ORDER.length; step++) await userEvent.tab();
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
		await userEvent.tab();
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
// where the button keeps focus and the layer stops scaling.
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
		await expect(scale()).toBe(0.1);
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

// A graph that fits at scale 1 opens centred in the region.
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
		const pane = rect(region);
		await expect(
			Math.abs(graph.left + graph.width / 2 - (pane.left + pane.width / 2)),
		).toBeLessThan(1);
		await expect(
			Math.abs(graph.top + graph.height / 2 - (pane.top + pane.height / 2)),
		).toBeLessThan(1);
	},
};

// A graph larger than the region opens at scale 1 with its first node's top
// centre on the region's centre line, a page inset below its top.
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
		const pane = rect(region);
		const box = rect(button);
		await expect(
			Math.abs(box.left + box.width / 2 - (pane.left + pane.width / 2)),
		).toBeLessThan(1);
		await expect(Math.abs(box.top - (pane.top + page()))).toBeLessThan(1);
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

// A synthetic click is a script focus, which Chromium counts as a keyboard one,
// so the focus ring (2px) covers the selection's outline (1px). The selection's
// own outline is read once focus has left the node.
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
	a11y: { context: { exclude: ["[data-layer] button"] } },
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
// trailing column; selecting the node takes the border for the selection's
// outline and keeps the words and the dot.
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
		await expect(outline(build)).toBe("1px");
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
			await expect(outline(stateButton(region, RUN, node.id))).toBe(
				node.id === RUN.path?.at ? "1px" : "none",
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
		await expect(outline(failed)).toBe("1px");
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

// A dimmed node is still a button: it takes the click, the outline, and keeps
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
		await waitFor(() => expect(outline(handoff)).toBe("1px"));
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

// Each generated canvas frame's stage holds its whole graph at scale 1: the
// drawing (frames, chips, nodes) and every node's button lie inside the pane
// the canvas draws in, so the state a frame is there to show is on screen.
// The two densities size nodes differently, so each is checked.
function framesHoldTheirGraph(density: "desktop" | "touch"): StoryObj {
	const frames = showcaseFrames().filter(
		(frame) =>
			frame.component === "Canvas" &&
			frame.mode === "light" &&
			frame.density === density &&
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
				const region = frame.querySelector("section");
				const layer = frame.querySelector("[data-layer]");
				if (!region || !layer) throw new Error(`no canvas in ${frame.id}`);
				await waitFor(
					() => expect(getComputedStyle(region).opacity).toBe("1"),
					LAID,
				);
				await expect(viewport(frame).scale).toBe(1);
				const pane = rect(region);
				const buttons = [...nodeButtons(frame)];
				await expect(buttons.length).toBeGreaterThanOrEqual(
					JOURNEY.nodes.length - 1,
				);
				for (const button of buttons)
					await expect(holds(pane, rect(button))).toBe(true);
				await expect(holds(pane, drawn(layer))).toBe(true);
			}
		},
	};
}

export const FramesHoldTheirGraphAtDesktop = framesHoldTheirGraph("desktop");
export const FramesHoldTheirGraphAtTouch = framesHoldTheirGraph("touch");
