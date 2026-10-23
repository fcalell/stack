import { Button } from "@fcalell/plugin-react-ui/components/button";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

const onAct = fn();

export default {
	title: "Behaviour/Button",
	render: () => (
		<>
			<Button glyph icon="RefreshCw" label="Rest" onAct={onAct} />
			<Button
				glyph
				icon="RefreshCw"
				label="Fetch now"
				onAct={() => new Promise(() => {})}
			/>
		</>
	),
} satisfies Meta;

// A running icon act is inert and busy, keeps the square of a resting one, and
// takes no second press. Its glyph gives way to the spinner after the act delay
// (the act stories).
export const GlyphRunning: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		onAct.mockClear();
		const rest = canvas.getByRole("button", { name: "Rest" });
		const running = canvas.getByRole("button", { name: "Fetch now" });
		await expect(rest).not.toHaveAttribute("aria-busy");
		await userEvent.click(running);
		await expect(running).toHaveAttribute("aria-busy", "true");
		await expect(running).toHaveAttribute("aria-disabled", "true");
		const size = rest.getBoundingClientRect();
		const held = running.getBoundingClientRect();
		await expect(held.width).toBe(size.width);
		await expect(held.height).toBe(size.height);
		await userEvent.click(rest);
		await expect(onAct).toHaveBeenCalledTimes(1);
	},
};

// The link form is an anchor to its route that runs nothing; the icon form of
// it keeps its name.
export const LinkFormIsAnAnchor: StoryObj = {
	render: () => (
		<>
			<Button href="#deployments" label="All deployments" />
			<Button href="#deployments" glyph icon="X" label="Close" />
		</>
	),
	play: async ({ canvas }) => {
		const link = canvas.getByRole("link", { name: "All deployments" });
		await expect(link).toHaveAttribute("href", "#deployments");
		await expect(canvas.getByRole("link", { name: "Close" })).toHaveAttribute(
			"href",
			"#deployments",
		);
	},
};
