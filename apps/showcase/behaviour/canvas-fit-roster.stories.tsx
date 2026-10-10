import { Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import { drawCanvas } from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { clipped, frameOf } from "./canvas-fit.ts";
import { loopFrame, opened } from "./canvas-fit-kit.tsx";
import { rect } from "./canvas-support.ts";

// 003-189 round 3 (with 003-291's frames): the roster frames at 375 px at the
// desktop density, where the pane is 263 px and the first node with its loop
// group (240 px) is wider than the pane less two page insets. The floor scale
// wins, so the box is centred in the pane, not anchored at the inset: 11.5 px
// each side, 0 px clipped. Both modes.
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
				const group = rect(frameOf(region, "loop"));
				const card = region.querySelector("[data-layer] > button");
				// The Lone loop is an empty group alone: its frame is the first box.
				if (!card && name !== "Lone loop")
					throw new Error(`${name} has no first node`);
				for (const [what, box] of [
					["the loop group", group],
					...(card ? [["the first node", rect(card)] as const] : []),
				] as const) {
					if (clipped(box, pane) > 0.5)
						throw new Error(
							`${name}: ${what} reaches ${clipped(box, pane).toFixed(1)} px past the pane`,
						);
					if (box.left < pane.left - 0.01 || box.right > pane.right + 0.01)
						throw new Error(`${name}: ${what} is not inside 0 to 263`);
				}
				// The 240 px box is centred: 11.5 px each side.
				// (within the region's 1 px border)
				const left = group.left - pane.left;
				const right = pane.right - group.right;
				await expect(Math.abs(left - 11.5)).toBeLessThanOrEqual(1);
				await expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
			}
		},
	};
}

export const LoopFramesAt375DesktopLight = loops("light");
export const LoopFramesAt375DesktopDark = loops("dark");
