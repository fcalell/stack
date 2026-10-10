import { showcaseFrames } from "@fcalell/plugin-react-ui/showcase/cells";
import { Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import {
	drawCanvas,
	EMPTY,
	WORKFLOW,
} from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import type { StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import {
	allInside,
	atTheFloor,
	captionHeld,
	clearOfTheStack,
	frameOf,
	whole,
} from "./canvas-fit.ts";
import { LAID } from "./canvas-support.ts";

// The frames 003-189 and 003-291 are judged on, drawn as the showcase draws
// them: the loop frames of CANVAS_GROUP (Hollow, Placed and Lone loop, with the
// workflow before them) and the empty canvas of CANVAS_NODE. A story renders one
// frame in the mode and density the file runs at; the file sets the viewport.
type Mode = "light" | "dark";
type Density = "desktop" | "touch";

export function loopFrame(mode: Mode, density: Density) {
	const frame = showcaseFrames().find(
		(each) =>
			each.component === "Canvas" &&
			each.cell.name === "CANVAS_GROUP.state.rest" &&
			each.state === "rest" &&
			each.mode === mode &&
			each.density === density,
	);
	if (!frame) throw new Error("no CANVAS_GROUP rest frame");
	return frame;
}

export function emptyFrame(mode: Mode, density: Density) {
	const frame = showcaseFrames().find(
		(each) =>
			each.component === "Canvas" &&
			each.cell.name === "CANVAS_NODE.state.rest" &&
			each.state === "empty" &&
			each.mode === mode &&
			each.density === density,
	);
	if (!frame) throw new Error("no CANVAS_NODE empty frame");
	return frame;
}

type Canvas = Parameters<NonNullable<StoryObj["play"]>>[0]["canvas"];

export async function opened(canvas: Canvas, name: string) {
	const region = await canvas.findByRole("region", { name });
	await waitFor(() => expect(getComputedStyle(region).opacity).toBe("1"), LAID);
	return region;
}

// The three loop frames open at the floor with the first node and its group
// whole and clear of the zoom stack. `everything` adds that all of the graph
// stands in the pane, which holds where it fits at the floor.
export function loops(
	mode: Mode,
	density: Density,
	everything: boolean,
): StoryObj {
	return {
		parameters: { mode },
		render: () => <Frame frame={loopFrame(mode, density)} draw={drawCanvas} />,
		play: async ({ canvas }) => {
			const hollow = await opened(canvas, "Hollow loop");
			const placed = await opened(canvas, "Placed loop");
			const lone = await opened(canvas, "Lone loop");
			const first = (region: Element) => {
				const card = region.querySelector("[data-layer] > button");
				if (!card) throw new Error("no first node");
				return card;
			};
			for (const [label, region] of [
				["Hollow loop", hollow],
				["Placed loop", placed],
				["Lone loop", lone],
			] as const) {
				atTheFloor(region, label);
				whole(region, label, frameOf(region, "loop"));
				clearOfTheStack(region, label);
				if (everything) allInside(region, label);
			}
			whole(hollow, "Hollow loop", first(hollow));
			whole(placed, "Placed loop", first(placed));
		},
	};
}

// The empty canvas opens with its node and its sentence whole, the sentence at
// the floor size and a `pair` under the node, the node at its own size.
export function empty(mode: Mode, density: Density): StoryObj {
	return {
		parameters: { mode },
		render: () => <Frame frame={emptyFrame(mode, density)} draw={drawCanvas} />,
		play: async ({ canvas }) => {
			const region = await opened(canvas, "Workflow");
			atTheFloor(region, "the empty canvas");
			const node = within(region)
				.getByText(WORKFLOW.nodes[0]?.title ?? "")
				.closest("[data-layer] > div");
			if (!node) throw new Error("the empty canvas holds its node");
			captionHeld(region, within(region).getByText(EMPTY), node);
			clearOfTheStack(region, "the empty canvas");
		},
	};
}
