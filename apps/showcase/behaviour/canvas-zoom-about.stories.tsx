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
	viewport,
} from "./canvas-support.ts";
import { tap } from "./touch.ts";

// The canvas in a 320 px phone at the touch density, where the fitted graph is
// under zoom 1 and every node is its glyph. A tap on a glyph zooms to that node
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

// A tap on a glyph zooms to its node at scale 1 and the node's centre stays
// where the glyph's was.
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
			await expect(within(centre(rect(card(region, id))), before)).toBe(true);
		},
	};
}
export const TapKeepsTheFirstNodeUnderTheFinger = tapStays("first");
export const TapKeepsTheLastNodeUnderTheFinger = tapStays("last");

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
		await waitFor(() => expect(viewport(region).scale).toBeGreaterThan(1));
		await expect(within(centre(rect(node)), away)).toBe(true);
		const grown = viewport(region).scale;
		await userEvent.click(zoomIn);
		await waitFor(() => expect(viewport(region).scale).toBeGreaterThan(grown));
		await expect(within(centre(rect(node)), away)).toBe(true);
	},
};
