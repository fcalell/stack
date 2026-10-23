import { Canvas } from "@fcalell/plugin-react-ui/components/canvas";
import { WORKFLOW } from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor } from "storybook/test";
import {
	card,
	centre,
	glyph,
	LAID,
	ORDER,
	rect,
	rested,
	viewport,
	zoomedOut,
} from "./canvas-support.ts";
import { tap } from "./touch.ts";

// The canvas in a 320 px phone at the touch density, zoomed out so every node
// is its glyph. A tap on a glyph zooms to that node
// at its own size about its centre, so the node stays under the finger; the zoom
// buttons zoom about the focused node, else the pane's centre.
export default {
	title: "Behaviour/Canvas zoom about",
	tags: ["touch"],
	globals: {
		density: "touch",
		viewport: { value: "w320x640", isRotated: false },
	},
	parameters: {
		layout: "fullscreen",
		viewport: {
			options: {
				w320x640: {
					name: "w320x640",
					styles: { width: "320px", height: "640px" },
					type: "mobile",
				},
			},
		},
	},
} satisfies Meta;

const render = () => (
	<div className="flex h-[40rem] w-[320px] flex-col bg-surface">
		<Canvas
			label="Workflow"
			nodes={WORKFLOW.nodes}
			edges={WORKFLOW.edges}
			groups={WORKFLOW.groups}
			onSelect={fn()}
		/>
	</div>
);

type Context = Parameters<NonNullable<StoryObj["play"]>>[0];

async function opened(canvas: Context["canvas"]) {
	const region = await canvas.findByRole("region", { name: "Workflow" });
	await waitFor(() => expect(getComputedStyle(region).opacity).toBe("1"), LAID);
	// A canvas opens at the floor, so the glyphs are zoomed out to.
	await zoomedOut(region);
	await expect(viewport(region).scale).toBeLessThan(1);
	return region;
}

// A glyph a finger can land on: whole in the pane and not under the stack.
function reachable(region: Element, element: Element): boolean {
	const pane = rect(region);
	const at = centre(rect(element));
	const under = document.elementFromPoint(at.x, at.y);
	return (
		at.x > pane.left + 10 &&
		at.x < pane.right - 10 &&
		at.y > pane.top + 10 &&
		at.y < pane.bottom - 10 &&
		under !== null &&
		element.contains(under)
	);
}

const within = (a: { x: number; y: number }, b: { x: number; y: number }) =>
	Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1;

// Where a box of `size` centred on `at` ends up in the pane: there, or moved
// just far enough in to stand whole inside the page inset.
function held(at: number, size: number, low: number, high: number): number {
	const page = Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue(
			"--spacing-page",
		),
	);
	const start = at - size / 2;
	if (size > high - low - 2 * page) return low + page + size / 2;
	return Math.min(Math.max(start, low + page), high - page - size) + size / 2;
}

// The centre a node zoomed about `at` stands at: unmoved unless it would pass
// the pane's edge.
function settled(region: Element, at: { x: number; y: number }, node: Element) {
	const pane = rect(region);
	const box = rect(node);
	return {
		x: held(at.x, box.width, pane.left, pane.right),
		y: held(at.y, box.height, pane.top, pane.bottom),
	};
}

// A tap on a glyph zooms to its node at scale 1 and the node's centre stays
// where the glyph's was, unless the node would pass the pane's edge, when it
// stands just inside it.
function tapStays(which: "first" | "last"): StoryObj {
	return {
		render,
		play: async ({ canvas }) => {
			const region = await opened(canvas);
			const ids = ORDER.filter((id) => reachable(region, glyph(region, id)));
			const id = which === "first" ? ids[0] : ids.at(-1);
			if (!id) throw new Error("no glyph a finger can reach");
			const before = centre(rect(glyph(region, id)));
			await tap(before);
			await waitFor(() => expect(viewport(region).scale).toBe(1));
			await waitFor(() => expect(card(region, id)).toBeVisible(), LAID);
			const node = card(region, id);
			await expect(
				within(centre(rect(node)), settled(region, before, node)),
			).toBe(true);
		},
	};
}
export const TapKeepsTheFirstNodeUnderTheFinger = tapStays("first");
export const TapKeepsTheLastNodeUnderTheFinger = tapStays("last");

// A node by the pane's edge grows past it when the zoom holds its centre still,
// so the view shifts just enough that the whole node stands in the canvas.
export const TapKeepsAnEdgeNodeWhole: StoryObj = {
	render,
	play: async ({ canvas }) => {
		const region = await opened(canvas);
		const pane = rect(region);
		const middle = centre(pane);
		const reach = (id: string) => {
			const at = centre(rect(glyph(region, id)));
			return Math.hypot(at.x - middle.x, at.y - middle.y);
		};
		const id = ORDER.filter((each) => reachable(region, glyph(region, each)))
			.sort((a, b) => reach(b) - reach(a))
			.at(0);
		if (!id) throw new Error("no glyph a finger can reach");
		await tap(centre(rect(glyph(region, id))));
		await waitFor(() => expect(viewport(region).scale).toBe(1));
		await waitFor(() => expect(card(region, id)).toBeVisible(), LAID);
		const box = rect(card(region, id));
		await expect(box.left).toBeGreaterThanOrEqual(pane.left);
		await expect(box.right).toBeLessThanOrEqual(pane.right);
		await expect(box.top).toBeGreaterThanOrEqual(pane.top);
		await expect(box.bottom).toBeLessThanOrEqual(pane.bottom);
	},
};

// With no node focused a button zooms about the pane's centre.
export const ButtonsZoomAboutTheCentre: StoryObj = {
	render,
	play: async ({ canvas, userEvent }) => {
		const region = await opened(canvas);
		const pane = rect(region);
		const middle = { x: pane.width / 2, y: pane.height / 2 };
		const flowAt = () => {
			const view = viewport(region);
			return {
				x: (middle.x - view.x) / view.scale,
				y: (middle.y - view.y) / view.scale,
			};
		};
		const before = flowAt();
		const scale = viewport(region).scale;
		await userEvent.click(canvas.getByRole("button", { name: "Zoom in" }));
		await rested(canvas.getByRole("button", { name: "Zoom in" }));
		await waitFor(() => expect(viewport(region).scale).toBeGreaterThan(scale));
		const after = flowAt();
		await expect(
			Math.abs(after.x - before.x) * viewport(region).scale,
		).toBeLessThanOrEqual(1);
		await expect(
			Math.abs(after.y - before.y) * viewport(region).scale,
		).toBeLessThanOrEqual(1);
	},
};

// With a node focused a button zooms about it, however far it stands from the
// centre, and the next press keeps the node though focus moved to the button.
export const ButtonsZoomAboutTheFocusedNode: StoryObj = {
	render,
	play: async ({ canvas, userEvent }) => {
		const region = await opened(canvas);
		const ids = ORDER.filter((id) => reachable(region, glyph(region, id)));
		const id = ids[0];
		if (!id) throw new Error("no glyph a finger can reach");
		await tap(centre(rect(glyph(region, id))));
		await waitFor(() => expect(viewport(region).scale).toBe(1));
		const node = card(region, id);
		await waitFor(() => expect(node).toBeVisible(), LAID);
		node.focus();
		const pane = rect(region);
		const away = centre(rect(node));
		// The node is not at the centre, so the two anchors differ.
		await expect(
			Math.hypot(
				away.x - (pane.left + pane.width / 2),
				away.y - (pane.top + pane.height / 2),
			),
		).toBeGreaterThan(20);
		const zoomIn = canvas.getByRole("button", { name: "Zoom in" });
		await userEvent.click(zoomIn);
		await rested(zoomIn);
		await waitFor(() => expect(viewport(region).scale).toBeGreaterThan(1));
		await expect(within(centre(rect(node)), settled(region, away, node))).toBe(
			true,
		);
		const grown = viewport(region).scale;
		const stood = centre(rect(node));
		await userEvent.click(zoomIn);
		await rested(zoomIn);
		await waitFor(() => expect(viewport(region).scale).toBeGreaterThan(grown));
		await expect(within(centre(rect(node)), settled(region, stood, node))).toBe(
			true,
		);
	},
};
