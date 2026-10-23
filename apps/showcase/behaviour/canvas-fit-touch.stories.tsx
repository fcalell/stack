import { Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import { drawCanvas } from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { frameOf } from "./canvas-fit.ts";
import { loopFrame, loops, opened } from "./canvas-fit-kit.tsx";
import { viewport } from "./canvas-support.ts";

// The frames 003-189 and 003-291 are judged on, in a 375 px phone at the touch
// density: the 263 px pane cannot hold the graph at the text floor, so the
// canvas opens at the floor, framed at its start, with its group heads drawn.
// Both modes.
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

// The Placed loop's second group (`retry`) stands past the pane's right edge in a
// pane the floor cuts: the canvas opens at the floor, framed at its start, and
// the reader pans for the rest.
function opensWithTheSecondGroup(mode: "light" | "dark"): StoryObj {
	return {
		parameters: { mode },
		render: () => <Frame frame={loopFrame(mode, "touch")} draw={drawCanvas} />,
		play: async ({ canvas }) => {
			const placed = await opened(canvas, "Placed loop");
			// The frames stand one under another: bring this one on screen.
			placed.scrollIntoView({ block: "center" });
			await expect(viewport(placed).scale).toBe(1);
			await expect(frameOf(placed, "retry")).toBeInTheDocument();
		},
	};
}
export const OpensWithTheSecondGroupLight = opensWithTheSecondGroup("light");
export const OpensWithTheSecondGroupDark = opensWithTheSecondGroup("dark");
