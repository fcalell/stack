import { Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import { drawCanvas } from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { clipped, frameOf, opensFitted } from "./canvas-fit.ts";
import { loopFrame, opened } from "./canvas-fit-kit.tsx";
import { rect } from "./canvas-support.ts";

// 003-189 round 3 (with 003-291's frames), then 003-324: the roster frames at
// 375 px at the desktop density, where the pane is 263 px and the loop group
// (240 px) is wider than the pane less two page insets. The canvas opens as Fit
// shows it, whole in the pane. Both modes.
export default {
	title: "Behaviour/Canvas fit roster",
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

// The roster frame's stage: the frame's card padding leaves the canvas a 263 px
// pane (the showcase's 375 phone frame at the desktop density).
const STAGE = 343;

function loops(mode: "light" | "dark"): StoryObj {
	return {
		parameters: { mode },
		render: () => (
			<div style={{ width: STAGE }}>
				<Frame frame={loopFrame(mode, "desktop")} draw={drawCanvas} />
			</div>
		),
		play: async ({ canvas }) => {
			for (const name of ["Hollow loop", "Placed loop", "Lone loop"]) {
				const region = await opened(canvas, name);
				region.scrollIntoView({ block: "center" });
				const pane = rect(region);
				await expect(Math.round(pane.width)).toBe(263);
				// The 240 px loop is wider than the pane less two page insets, and
				// opens whole in it, as Fit shows it: nothing reaches past the pane.
				opensFitted(region, name);
				const group = rect(frameOf(region, "loop"));
				await expect(clipped(group, pane)).toBeLessThan(0.5);
			}
		},
	};
}

export const LoopFramesAt375DesktopLight = loops("light");
export const LoopFramesAt375DesktopDark = loops("dark");
