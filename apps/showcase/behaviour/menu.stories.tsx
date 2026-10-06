import { Menu } from "@fcalell/plugin-react-ui/components/menu";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import { focused } from "./support.ts";

const act = () => {};

export default {
	title: "Behaviour/Menu",
	render: () => (
		<Menu
			label="More"
			items={[
				{ label: "Duplicate", onAct: act },
				{ label: "Rename", onAct: act },
				{ label: "Archive", onAct: act },
				{ label: "Delete", onAct: act, destructive: true },
			]}
		/>
	),
} satisfies Meta;

// Opened from the keyboard a menu takes focus on its first row, moves by the
// arrow keys and by typeahead, and Escape closes it and returns focus to the
// trigger.
export const Popover: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("button", { name: "More" });
		await userEvent.tab();
		await expect(trigger).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		const menu = await screen.findByRole("menu");
		await waitFor(() => expect(menu).toContainElement(focused()));
		const rows = screen.getAllByRole("menuitem");
		await waitFor(() => expect(rows[0]).toHaveFocus());
		await userEvent.keyboard("{ArrowDown}");
		await waitFor(() => expect(rows[1]).toHaveFocus());
		await userEvent.keyboard("{ArrowUp}");
		await waitFor(() => expect(rows[0]).toHaveFocus());
		await userEvent.keyboard("a");
		await waitFor(() => expect(rows[2]).toHaveFocus());
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
		await waitFor(() => expect(trigger).toHaveFocus());
	},
};
