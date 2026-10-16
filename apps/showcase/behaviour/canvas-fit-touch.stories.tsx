import { Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import { drawCanvas } from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { clipped, frameOf } from "./canvas-fit.ts";
import { loopFrame, loops, opened } from "./canvas-fit-kit.tsx";
import { rect, viewport } from "./canvas-support.ts";

// The frames 003-189 and 003-291 are judged on, in a 375 px phone at the touch
// density: the 263 px pane cannot hold the graph at the text floor, so the
// canvas opens as Fit shows it (003-324), the whole graph in the pane at a scale
// under 1 with its group heads drawn. Both modes.
export default {
	title: "Behaviour/Canvas fit touch",
	tags: ["touch"],
	globals: { density: "touch", viewport: { value: "phone", isRotated: false } },
	parameters: {
		viewport: {
			options: {
				phone: {
					name: "Phone",
					styles: { width: "375px", height: "812px" },
					type: "mobile",
				},
			},
		},
	},
} satisfies Meta;

export const LoopFramesAt375Light = loops("light", "touch");
export const LoopFramesAt375Dark = loops("dark", "touch");

// The Placed loop's second group (`retry`) stood past the pane's right edge when
// a canvas opened at the text floor; opened as Fit shows it, it is whole in the
// pane at the first view, with no pan.
function opensWithTheSecondGroup(mode: "light" | "dark"): StoryObj {
	return {
		parameters: { mode },
		render: () => <Frame frame={loopFrame(mode, "touch")} draw={drawCanvas} />,
		play: async ({ canvas }) => {
			const placed = await opened(canvas, "Placed loop");
			// The frames stand one under another: bring this one on screen.
			placed.scrollIntoView({ block: "center" });
			await expect(
				clipped(rect(frameOf(placed, "retry")), rect(placed)),
			).toBeLessThan(0.5);
			await expect(viewport(placed).scale).toBeLessThan(1);
		},
	};
}
export const OpensWithTheSecondGroupLight = opensWithTheSecondGroup("light");
export const OpensWithTheSecondGroupDark = opensWithTheSecondGroup("dark");
