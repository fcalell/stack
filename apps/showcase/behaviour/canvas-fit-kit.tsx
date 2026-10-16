import { showcaseFrames } from "@fcalell/plugin-react-ui/showcase/cells";
import { Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import { drawCanvas } from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import type { StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { clearOfTheStack, opensFitted } from "./canvas-fit.ts";
import { LAID } from "./canvas-support.ts";

// The frames 003-189 and 003-291 are judged on, drawn as the showcase draws
// them: the loop frames of CANVAS_GROUP (Hollow, Placed and Lone loop, with the
// workflow before them). A story renders one
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

type Canvas = Parameters<NonNullable<StoryObj["play"]>>[0]["canvas"];

export async function opened(canvas: Canvas, name: string) {
	const region = await canvas.findByRole("region", { name });
	await waitFor(() => expect(getComputedStyle(region).opacity).toBe("1"), LAID);
	return region;
}

// The three loop frames open as Fit shows them: every part whole in the pane,
// the group heads drawn, clear of the zoom stack.
export function loops(mode: Mode, density: Density): StoryObj {
	return {
		parameters: { mode },
		render: () => <Frame frame={loopFrame(mode, density)} draw={drawCanvas} />,
		play: async ({ canvas }) => {
			const hollow = await opened(canvas, "Hollow loop");
			const placed = await opened(canvas, "Placed loop");
			const lone = await opened(canvas, "Lone loop");
			for (const [label, region] of [
				["Hollow loop", hollow],
				["Placed loop", placed],
				["Lone loop", lone],
			] as const) {
				opensFitted(region, label);
				clearOfTheStack(region, label);
			}
		},
	};
}
