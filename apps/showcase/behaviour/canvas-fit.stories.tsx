import type { Meta } from "@storybook/react-vite";
import { empty, loops } from "./canvas-fit-kit.tsx";

// 003-189 round 2 (with 003-291's frames) at 1440 px: a canvas opens at the
// text floor with its first node and group whole, and where the whole graph
// fits at the floor it all stands in the pane. Both modes.
export default {
	title: "Behaviour/Canvas fit",
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
} satisfies Meta;

export const LoopFramesAt1440Light = loops("light", "desktop", true);
export const LoopFramesAt1440Dark = loops("dark", "desktop", true);
export const EmptyCanvasAt1440Light = empty("light", "desktop");
export const EmptyCanvasAt1440Dark = empty("dark", "desktop");
