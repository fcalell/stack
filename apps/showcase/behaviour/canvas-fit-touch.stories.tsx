import { Frame } from "@fcalell/plugin-react-ui/showcase/frame";
import { drawCanvas } from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { clipped, frameOf } from "./canvas-fit.ts";
import { empty, loopFrame, loops, opened } from "./canvas-fit-kit.tsx";
import { rect, viewport } from "./canvas-support.ts";
import { drag } from "./touch.ts";

// 003-189 round 2 (with 003-291's frames) in a 375 px phone, at the touch
// density: the 263 px pane cannot hold the graph at the text floor, so the
// canvas opens at the floor with the first node and group whole at the top-left
// and the rest reachable by pan. Both modes.
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

export const LoopFramesAt375Light = loops("light", "touch", false);
export const LoopFramesAt375Dark = loops("dark", "touch", false);
export const EmptyCanvasAt375Light = empty("light", "touch");
export const EmptyCanvasAt375Dark = empty("dark", "touch");

// A point of the pane where a finger pans: not on a button or the chrome.
function panPoint(region: Element) {
	const pane = rect(region);
	for (let y = pane.bottom - 20; y > pane.top + 20; y -= 12)
		for (let x = pane.right - 12; x > pane.left + 12; x -= 12) {
			const found = document.elementFromPoint(x, y);
			if (
				found &&
				region.contains(found) &&
				!found.closest("button, [data-no-pan]")
			)
				return { x, y };
		}
	throw new Error("no point to pan from");
}

// The Placed loop's second group (`retry`) stands past the pane's right edge at
// the floor; a pan on the ground brings it whole into the pane, the scale
// unchanged.
function pansToTheSecondGroup(mode: "light" | "dark"): StoryObj {
	return {
		parameters: { mode },
		render: () => <Frame frame={loopFrame(mode, "touch")} draw={drawCanvas} />,
		play: async ({ canvas }) => {
			const placed = await opened(canvas, "Placed loop");
			// The frames stand one under another: bring this one on screen.
			placed.scrollIntoView({ block: "center" });
			const retry = frameOf(placed, "retry");
			const scale = viewport(placed).scale;
			await expect(clipped(rect(retry), rect(placed))).toBeGreaterThan(0);
			for (let pan = 0; pan < 4; pan++) {
				const pane = rect(placed);
				const box = rect(retry);
				if (clipped(box, pane) < 0.5) break;
				const from = panPoint(placed);
				// The layer follows the finger, to the left.
				const travel = Math.min(
					from.x - pane.left - 10,
					box.left - pane.left - 16,
				);
				await drag(from, { x: from.x - travel, y: from.y });
				await waitFor(() => expect(viewport(placed).scale).toBe(scale));
			}
			await expect(clipped(rect(retry), rect(placed))).toBeLessThan(0.5);
			await expect(viewport(placed).scale).toBe(scale);
		},
	};
}
export const PansToTheSecondGroupLight = pansToTheSecondGroup("light");
export const PansToTheSecondGroupDark = pansToTheSecondGroup("dark");
