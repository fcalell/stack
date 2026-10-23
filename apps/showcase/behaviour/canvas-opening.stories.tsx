import { Canvas } from "@fcalell/plugin-react-ui/components/canvas";
import {
	CROWDED,
	NARROW_STAGE,
	OPENING,
	STAGE,
} from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor } from "storybook/test";
import { apart, LAID, rect, viewport } from "./canvas-support.ts";

export default {
	title: "Behaviour/Canvas opening",
} satisfies Meta;

// The canvas's region, laid out and shown.
async function opened(
	canvas: Parameters<NonNullable<StoryObj["play"]>>[0]["canvas"],
	name: string,
) {
	const region = await canvas.findByRole("region", { name });
	await waitFor(() => expect(getComputedStyle(region).opacity).toBe("1"), LAID);
	return region;
}

// A graph wider and taller than its pane opens at the text floor, framed at its
// start: no node's box meets the zoom stack's, nor does Fit's view.
export const OpensClearOfTheStack: StoryObj = {
	render: () => (
		<div className={NARROW_STAGE}>
			<Canvas
				label="Journey"
				nodes={OPENING.nodes}
				edges={OPENING.edges}
				onSelect={fn()}
			/>
		</div>
	),
	play: async ({ canvas, canvasElement, userEvent }) => {
		const region = await opened(canvas, "Journey");
		const stack = region.querySelector("[data-clear='left']");
		if (!stack) throw new Error("no zoom stack");
		const clear = () => {
			for (const node of region.querySelectorAll("[data-layer] > button"))
				if (!apart(rect(node), rect(stack)))
					throw new Error(
						`${node.textContent?.slice(0, 20)} meets the zoom stack`,
					);
		};
		await expect(viewport(canvasElement).scale).toBe(1);
		clear();
		await userEvent.click(canvas.getByRole("button", { name: "Zoom out" }));
		await userEvent.click(canvas.getByRole("button", { name: "Fit" }));
		await waitFor(() => expect(viewport(canvasElement).scale).toBe(1), LAID);
		await new Promise((done) => setTimeout(done, 400));
		clear();
	},
};

// An edge's label stands whole in its chip, whatever its length.
export const EdgeLabelStandsWhole: StoryObj = {
	render: () => (
		<div className={STAGE}>
			<Canvas label="Journey" nodes={OPENING.nodes} edges={OPENING.edges} />
		</div>
	),
	play: async ({ canvas }) => {
		const region = await opened(canvas, "Journey");
		const label = [...region.querySelectorAll<HTMLElement>("span")].find(
			(span) =>
				span.childElementCount === 0 &&
				span.textContent === "Open the ticked as units",
		);
		if (!label) throw new Error("no edge label");
		await expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
	},
};

// A node's title stands whole beside its status; the status's label is what
// truncates, its dot staying.
export const TitleBeforeStatus: StoryObj = {
	render: () => (
		<div className={STAGE}>
			<Canvas label="Crowded" nodes={CROWDED.nodes} edges={CROWDED.edges} />
		</div>
	),
	play: async ({ canvas }) => {
		const region = await opened(canvas, "Crowded");
		const cards = [
			...region.querySelectorAll<HTMLElement>(
				"[data-layer] > div, [data-layer] > button",
			),
		].filter((card) => card.textContent?.includes("A call, on a unit"));
		await expect(cards).toHaveLength(2);
		const [short, long] = cards;
		const words = (card: HTMLElement | undefined, text: string) => {
			const found = [
				...(card?.querySelectorAll<HTMLElement>("span") ?? []),
			].find(
				(span) => span.childElementCount === 0 && span.textContent === text,
			);
			if (!found) throw new Error(`no ${text}`);
			return found;
		};
		for (const card of [short, long]) {
			const title = words(card, "A call, on a unit");
			await expect(title.scrollWidth).toBeLessThanOrEqual(title.clientWidth);
		}
		await expect(words(short, "Running 6").scrollWidth).toBeLessThanOrEqual(
			words(short, "Running 6").clientWidth,
		);
		const cut = words(long, "Running 6 of 12 checks");
		await expect(cut.scrollWidth).toBeGreaterThan(cut.clientWidth);
		await expect(cut.clientWidth).toBeGreaterThan(0);
	},
};
