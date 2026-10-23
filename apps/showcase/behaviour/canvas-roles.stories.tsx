import { Canvas } from "@fcalell/plugin-react-ui/components/canvas";
import {
	LONG,
	ROLES,
	ROLES_STAGE,
	STAGE,
} from "@fcalell/plugin-react-ui/showcase/frames/canvas";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { LAID, rect, rested, room, viewport } from "./canvas-support.ts";

export default {
	title: "Behaviour/Canvas roles",
} satisfies Meta;

type Select = (id: string | null) => void;

// The roles graph with the choice kept, as a page holds it.
function Roles(props: { heard?: Select }) {
	const [selected, setSelected] = useState<string>();
	return (
		<div className={ROLES_STAGE}>
			<Canvas
				label="Roles"
				nodes={ROLES.nodes}
				edges={ROLES.edges}
				selected={selected}
				onSelect={(id) => {
					props.heard?.(id);
					setSelected(id ?? undefined);
				}}
			/>
		</div>
	);
}

const nodeOf = (root: Element, title: string): HTMLElement => {
	const found = [
		...root.querySelectorAll<HTMLElement>("[data-layer] > button"),
	].find((button) => button.textContent?.includes(title));
	if (!found) throw new Error(`no node titled ${title}`);
	return found;
};

const colour = (element: Element, property: string) =>
	getComputedStyle(element).getPropertyValue(property);

// Each role draws in its own shape and tone: a start and an end are pills, the
// start in the accent and the end quiet; a decision is a compact card; a wait
// stands in the attention tone; a call has a second hairline round its card
// and an open act that goes to its graph without choosing it.
export const EveryRole: StoryObj<{ heard: Select }> = {
	args: { heard: fn() },
	render: (args) => <Roles heard={args.heard} />,
	play: async ({ args, canvas, canvasElement, userEvent }) => {
		const region = await canvas.findByRole("region", { name: "Roles" });
		await waitFor(
			() => expect(getComputedStyle(region).opacity).toBe("1"),
			LAID,
		);
		const step = nodeOf(canvasElement, "Draft a plan");
		const start = nodeOf(canvasElement, "Start");
		const decision = nodeOf(canvasElement, "Is it green?");
		const wait = nodeOf(canvasElement, "Needs you");
		const call = nodeOf(canvasElement, "Run the checks");
		const end = nodeOf(canvasElement, "Done");
		// A pill's ends are fully round; a card's are not.
		for (const pill of [start, end])
			await expect(
				Number.parseFloat(colour(pill, "border-top-left-radius")),
			).toBeGreaterThanOrEqual(rect(pill).height / 2);
		for (const card of [step, decision, wait, call])
			await expect(
				Number.parseFloat(colour(card, "border-top-left-radius")),
			).toBeLessThan(rect(card).height / 2);
		// Tones: the start's and the wait's grounds are tinted, the step's and the end's are not.
		const ground = (element: Element) => colour(element, "background-color");
		await expect(ground(start)).not.toBe(ground(step));
		await expect(ground(wait)).not.toBe(ground(step));
		await expect(ground(end)).not.toBe(ground(step));
		await expect(ground(wait)).not.toBe(ground(start));
		// A decision is the compact card.
		await expect(rect(decision).height).toBeLessThan(rect(step).height);
		// A call's double edge: a second hairline outside the first.
		await expect(colour(call, "outline-style")).toBe("solid");
		await expect(colour(step, "outline-style")).not.toBe("solid");
		// A status label of twelve characters stands whole.
		for (const [node, label] of [
			[wait, "Run parked"],
			[step, "Running 12"],
		] as const) {
			const word = [...node.querySelectorAll<HTMLElement>("span")].find(
				(span) => span.childElementCount === 0 && span.textContent === label,
			);
			if (!word) throw new Error(`no ${label}`);
			await expect(word.scrollWidth).toBeLessThanOrEqual(word.clientWidth);
		}
		// The open act is a link named for its node, outside the node's button, and
		// pressing it chooses nothing.
		const open = canvas.getByRole("link", { name: "Open Run the checks" });
		await expect(open).toHaveAttribute("href", "/checks");
		await expect(call.contains(open)).toBe(false);
		canvasElement.addEventListener(
			"click",
			(event) => {
				if (event.target instanceof Element && event.target.closest("a"))
					event.preventDefault();
			},
			true,
		);
		await userEvent.click(open);
		await expect(args.heard).not.toHaveBeenCalled();
		// Pressing the node's body still chooses it.
		await userEvent.click(call);
		await expect(args.heard).toHaveBeenLastCalledWith("checks");
	},
};

// A graph taller than the pane opens at the scale a node draws its title and its
// line, framed at its start: the first node at the top of the room, the last
// past its foot. Fit gives that view back, and zooming out by hand still goes
// under it.
export const FitFloor: StoryObj = {
	render: () => (
		<div className={STAGE}>
			<Canvas
				label="Long run"
				nodes={LONG.nodes}
				edges={LONG.edges}
				onSelect={fn()}
			/>
		</div>
	),
	play: async ({ canvas, canvasElement, userEvent }) => {
		const region = await canvas.findByRole("region", { name: "Long run" });
		await waitFor(
			() => expect(getComputedStyle(region).opacity).toBe("1"),
			LAID,
		);
		const opened = viewport(canvasElement);
		await expect(opened.scale).toBe(1);
		const space = room(region);
		const first = nodeOf(canvasElement, "Read the request");
		const last = nodeOf(canvasElement, "Deploy it");
		// The start stands at the top of the room, whole, with its words.
		await expect(Math.abs(rect(first).top - space.top)).toBeLessThan(
			rect(first).height,
		);
		await expect(rect(first).bottom).toBeLessThanOrEqual(space.bottom);
		await expect(first).toHaveTextContent("Does its part");
		// The rest is past the room's foot, for the reader to pan to.
		await expect(rect(last).top).toBeGreaterThan(space.bottom);
		// Fit puts the view back where it opened.
		await userEvent.click(canvas.getByRole("button", { name: "Zoom out" }));
		await rested(region);
		await expect(viewport(canvasElement).scale).toBeLessThan(1);
		await userEvent.click(canvas.getByRole("button", { name: "Fit" }));
		await rested(region);
		const fitted = viewport(canvasElement);
		await expect(fitted.scale).toBe(1);
		await expect(Math.abs(fitted.x - opened.x)).toBeLessThan(2);
		await expect(Math.abs(fitted.y - opened.y)).toBeLessThan(2);
	},
};
