import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Prose } from "@fcalell/plugin-react-ui/components/prose";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const noop = () => {};

// A step's size in px, read off a probe wearing its class.
function step(root: Element, className: string): number {
	const probe = document.createElement("div");
	probe.className = className;
	root.append(probe);
	const size = Number.parseFloat(getComputedStyle(probe).paddingBottom);
	probe.remove();
	return size;
}

export default {
	title: "Behaviour/Section body",
	render: () => (
		<Section title="Add a repo" description="Connect it to the workspace.">
			<Prose markdown="Paste the clone address." />
			<Prose markdown="Then confirm." />
			<ActionBar acts={[{ label: "Add", onAct: noop }]} />
		</Section>
	),
} satisfies Meta;

// The head stays a pair over the body; the body's parts stand the fields step
// apart.
export const BodyPartsStandApart: StoryObj = {
	play: async ({ canvasElement }) => {
		const body = canvasElement.querySelector("section > div[id]");
		if (!body) throw new Error("the body is not drawn");
		const gap = Number.parseFloat(getComputedStyle(body).rowGap);
		await expect(gap).toBe(step(canvasElement, "pb-fields"));
		const head = canvasElement.querySelector("section > div");
		if (!head) throw new Error("the head is not drawn");
		const root = Number.parseFloat(
			getComputedStyle(canvasElement.querySelector("section") as Element)
				.rowGap,
		);
		await expect(root).toBe(step(canvasElement, "pb-pair"));
	},
};
