import { Message } from "@fcalell/plugin-react-ui/components/message";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const noop = () => {};

export default {
	title: "Behaviour/Message",
	render: () => (
		<div style={{ width: 480, maxWidth: "100%" }}>
			<Message
				author="system"
				body="Proposed a redeploy"
				detail={{
					row: {
						leading: { icon: "Rocket" },
						title: "Redeploy api to production",
						onOpen: noop,
					},
				}}
			/>
		</div>
	),
} satisfies Meta;

// A system line stands a pair step above its card, the label over its content,
// as a Section's title stands over its body.
export const LineOverCard: StoryObj = {
	play: async ({ canvas }) => {
		const card = canvas.getByRole("button").closest("div[class*='border']");
		const line = card?.previousElementSibling;
		if (!(card instanceof HTMLElement) || !line)
			throw new Error("the line and its card are not drawn");
		const probe = document.createElement("div");
		probe.className = "pb-pair";
		card.parentElement?.append(probe);
		const pair = Number.parseFloat(getComputedStyle(probe).paddingBottom);
		probe.remove();
		await expect(pair).toBeGreaterThan(0);
		await expect(
			card.getBoundingClientRect().top - line.getBoundingClientRect().bottom,
		).toBeCloseTo(pair, 0);
	},
};
