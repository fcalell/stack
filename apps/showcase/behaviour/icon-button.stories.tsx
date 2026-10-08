import { IconButton } from "@fcalell/plugin-react-ui/components/icon-button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

const onAct = fn();

export default {
	title: "Behaviour/IconButton",
	render: () => (
		<>
			<IconButton icon="RefreshCw" label="Rest" onAct={onAct} />
			<IconButton icon="RefreshCw" label="Fetch now" onAct={onAct} loading />
		</>
	),
} satisfies Meta;

// A running icon act is inert and busy, keeps the square of a resting one, and
// swaps its glyph for the spinner.
export const Loading: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		onAct.mockClear();
		const rest = canvas.getByRole("button", { name: "Rest" });
		const running = canvas.getByRole("button", { name: "Fetch now" });
		await expect(running).toHaveAttribute("aria-busy", "true");
		await expect(running).toHaveAttribute("aria-disabled", "true");
		await expect(rest).not.toHaveAttribute("aria-busy");
		await expect(running.querySelector("svg")).toBeNull();
		await userEvent.click(running);
		await expect(onAct).not.toHaveBeenCalled();
		const size = rest.getBoundingClientRect();
		const held = running.getBoundingClientRect();
		await expect(held.width).toBe(size.width);
		await expect(held.height).toBe(size.height);
		await userEvent.click(rest);
		await expect(onAct).toHaveBeenCalledTimes(1);
	},
};
