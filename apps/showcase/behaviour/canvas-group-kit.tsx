import { Canvas } from "@fcalell/plugin-react-ui/components/canvas";
import {
	STAGE,
	WORKFLOW,
} from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import type { StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";
import { LAID, rect } from "./canvas-support.ts";
import { click, hover, type Point } from "./mouse.ts";

// 003-312: a group's head draws the hover form a node draws (its border steps
// to `edge-hover`), and the selected frame's line holds 3:1 against the canvas
// ground. The stories run the same play in both modes at 375 and 1440 px.
function Workflow() {
	const [selected, setSelected] = useState<string>();
	return (
		<div className={STAGE}>
			<Canvas
				label="Workflow"
				nodes={WORKFLOW.nodes}
				edges={WORKFLOW.edges}
				groups={WORKFLOW.groups}
				selected={selected}
				onSelect={(id) => setSelected(id ?? undefined)}
			/>
		</div>
	);
}

const centreOf = (element: Element): Point => {
	const box = rect(element);
	return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

// A CSS colour as sRGB channels and alpha: the browser's own canvas converts
// whatever space the computed value is written in.
function channels(color: string): [number, number, number, number] {
	const context = document.createElement("canvas").getContext("2d", {
		willReadFrequently: true,
	});
	if (!context) throw new Error("no canvas context");
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;
	return [r, g, b, a];
}

function luminance(color: string): number {
	const [r, g, b] = channels(color)
		.slice(0, 3)
		.map((value) => {
			const c = value / 255;
			return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
		}) as [number, number, number];
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// WCAG's contrast ratio of two CSS colours.
function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
		number,
		number,
	];
	return (hi + 0.05) / (lo + 0.05);
}

export function group(mode: "light" | "dark"): StoryObj {
	return {
		parameters: { mode },
		render: () => <Workflow />,
		play: async ({ canvas, canvasElement }) => {
			const region = await canvas.findByRole("region", { name: "Workflow" });
			await waitFor(
				() =>
					expect(region.querySelector("[data-layer] > button")).toBeVisible(),
				LAID,
			);
			const id = WORKFLOW.groups?.[0]?.id;
			if (!id) throw new Error("no group");
			const head = canvasElement.querySelector<HTMLElement>(
				`[data-group="${id}"] > button`,
			);
			const frame = head?.parentElement;
			const node = region.querySelector<HTMLElement>("[data-layer] > button");
			if (!head || !frame || !node) throw new Error("no head, frame or node");
			const ground = getComputedStyle(region).backgroundColor;
			await expect(channels(ground)[3]).toBe(255);

			// The pointer rests on the ground below the layer between reads.
			const away: Point = {
				x: rect(region).left + 4,
				y: rect(region).bottom - 4,
			};
			await hover(away);
			const rest = getComputedStyle(head).borderTopColor;
			const nodeRest = getComputedStyle(node).borderTopColor;
			await hover(centreOf(node));
			await waitFor(() =>
				expect(getComputedStyle(node).borderTopColor).not.toBe(nodeRest),
			);
			const nodeHover = getComputedStyle(node).borderTopColor;
			await hover(centreOf(head));
			await waitFor(() =>
				expect(getComputedStyle(head).borderTopColor).not.toBe(rest),
			);
			await expect(getComputedStyle(head).borderTopColor).toBe(nodeHover);

			// Selected: the dashed line holds 3:1 on the canvas ground, and the head
			// still shows its hover.
			await click(centreOf(head));
			await waitFor(() =>
				expect(getComputedStyle(frame).borderTopWidth).toBe("2px"),
			);
			await expect(getComputedStyle(frame).borderTopStyle).toBe("dashed");
			await expect(
				contrast(getComputedStyle(frame).borderTopColor, ground),
			).toBeGreaterThanOrEqual(3);
			await hover(away);
			await hover(centreOf(head));
			await waitFor(() =>
				expect(getComputedStyle(head).borderTopColor).toBe(nodeHover),
			);
			await hover(away);
			await expect(getComputedStyle(head).borderTopColor).toBe(rest);
		},
	};
}
