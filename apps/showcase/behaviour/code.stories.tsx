import { Code } from "@fcalell/plugin-react-ui/components/code";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const KEY =
	"ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOk7q2mYb0p9yWc3vTt1uXH4Jr8Zl5eN6dGf2sQa9BxW stead deploy key for github.com/fcalell/stead";

export default {
	title: "Behaviour/Code",
	render: () => (
		<div style={{ width: 320 }}>
			<Code text={KEY} title="Deploy key" copy />
			<Code text={KEY} copy />
		</div>
	),
} satisfies Meta;

// A long argument wraps inside the frame at a phone's width: nothing scrolls
// sideways and no text is cut.
export const WrapsLongLines: StoryObj = {
	play: async ({ canvas }) => {
		for (const block of canvas.getAllByRole("group")) {
			await expect(block.scrollWidth).toBeLessThanOrEqual(block.clientWidth);
			await expect(block).toHaveTextContent(KEY);
		}
	},
};
