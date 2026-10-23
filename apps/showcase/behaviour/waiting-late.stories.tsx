import { read } from "@fcalell/plugin-api/tanstack-query";
import { type Row, Section } from "@fcalell/plugin-react-ui/components/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

// A paint shows only for a read that lasts: it stands in its place from the
// first frame, but its fill fades in only after the wait delay, so a read the
// server answers at once paints nothing a viewer sees.
const toRow = (name: string): Row => ({ key: name, title: name });

// A Section over a read of its own, answered after `ms`.
let reads = 0;
function Late(props: { ms: number }) {
	const [people] = useState(() =>
		read({
			queryKey: ["waiting-late", reads++],
			queryFn: () =>
				new Promise<readonly string[]>((done) =>
					setTimeout(() => done(["Ana Ruiz"]), props.ms),
				),
		}),
	);
	return (
		<Section title="People" items={people.at((names) => names.map(toRow))} />
	);
}

// How visible the most visible paint on the page is: 0 before the fade, 1
// once it has run.
const shown = (root: ParentNode) =>
	Math.max(
		0,
		...[...root.querySelectorAll<HTMLElement>("[data-painted]")].map((paint) =>
			Number(getComputedStyle(paint).opacity),
		),
	);

export default {
	title: "Behaviour/Waiting late",
} satisfies Meta;

// A read that settles at 50 ms never shows its paint.
export const Fast: StoryObj = {
	render: () => <Late ms={50} />,
	play: async ({ canvas, canvasElement }) => {
		const seen: number[] = [];
		const watch = setInterval(() => seen.push(shown(canvasElement)), 10);
		await canvas.findByText("Ana Ruiz");
		await new Promise((done) => setTimeout(done, 700));
		clearInterval(watch);
		await expect(Math.max(...seen)).toBe(0);
	},
};

// A read of 1 s paints its rows at once, unseen, and fades them in after the
// delay, not before.
export const Slow: StoryObj = {
	render: () => <Late ms={1000} />,
	play: async ({ canvas, canvasElement }) => {
		await waitFor(() =>
			expect(canvasElement.querySelector("[data-painted]")).not.toBeNull(),
		);
		await expect(shown(canvasElement)).toBe(0);
		await waitFor(() => expect(shown(canvasElement)).toBeGreaterThan(0.99), {
			timeout: 900,
		});
		await canvas.findByText("Ana Ruiz", {}, { timeout: 3000 });
	},
};
