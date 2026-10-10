import { IconButton } from "@fcalell/plugin-react-ui/components/icon-button";
import { Menu } from "@fcalell/plugin-react-ui/components/menu";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import { hover } from "./mouse.ts";

const act = () => {};

export default {
	title: "Behaviour/Tooltip",
	render: () => (
		<>
			<IconButton icon="RefreshCw" label="Run now" onAct={act} />
			<Menu label="More" items={[{ label: "Rename", onAct: act }]} />
		</>
	),
} satisfies Meta;

const centre = (element: Element) => {
	const box = element.getBoundingClientRect();
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

// An icon act names itself: a pointer resting on it shows its label after a
// short delay, Escape hides it, and the label stays the act's accessible name.
export const Rest: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const button = canvas.getByRole("button", { name: "Run now" });
		await hover(centre(button));
		await expect(screen.queryByText("Run now")).toBeNull();
		const name = await screen.findByText("Run now", {}, { timeout: 3000 });
		await expect(name).toBeVisible();
		await expect(button).toHaveAccessibleName("Run now");
		// The tooltip's own trigger state never presses the act.
		await expect(button).not.toHaveAttribute("aria-expanded", "true");
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByText("Run now")).toBeNull());
	},
};

// The keyboard reaching an icon act shows its name, Escape hides it, and
// opening a menu from its trigger takes the name away.
export const Focus: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.tab();
		await expect(canvas.getByRole("button", { name: "Run now" })).toHaveFocus();
		await screen.findByText("Run now", {}, { timeout: 3000 });
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByText("Run now")).toBeNull());
		await userEvent.tab();
		const more = canvas.getByRole("button", { name: "More" });
		await expect(more).toHaveFocus();
		await screen.findByText("More", {}, { timeout: 3000 });
		await userEvent.keyboard("{Enter}");
		await screen.findByRole("menu");
		await waitFor(() => expect(screen.queryByText("More")).toBeNull());
		await expect(more).toHaveAttribute("aria-expanded", "true");
	},
};
