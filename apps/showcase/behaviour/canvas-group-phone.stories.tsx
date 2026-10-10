import type { Meta } from "@storybook/react-vite";
import { group } from "./canvas-group-kit.tsx";

// 003-312 at 375 px, as canvas-group.stories.tsx. Both modes.
export default {
	title: "Behaviour/Canvas group phone",
	globals: { viewport: { value: "phone", isRotated: false } },
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

export const GroupAt375Light = group("light");
export const GroupAt375Dark = group("dark");
