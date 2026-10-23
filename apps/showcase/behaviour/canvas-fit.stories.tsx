import type { Meta } from "@storybook/react-vite";
import { loops } from "./canvas-fit-kit.tsx";

// The frames 003-189 and 003-291 are judged on, at 1440 px: a canvas opens as
// Fit shows it (003-324), the whole graph in the pane with its group heads
// drawn. Both modes.
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

export const LoopFramesAt1440Light = loops("light", "desktop");
export const LoopFramesAt1440Dark = loops("dark", "desktop");
