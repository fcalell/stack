import type { Meta } from "@storybook/react-vite";
import { group } from "./canvas-group-kit.tsx";

// 003-312 at 1440 px: a group's head hovers as a node does, and the selected
// frame's line holds 3:1 on the canvas ground. Both modes.
export default {
	title: "Behaviour/Canvas group",
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

export const GroupAt1440Light = group("light");
export const GroupAt1440Dark = group("dark");
