import { Menu } from "@fcalell/plugin-react-ui/components/menu";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";
import { hover } from "./mouse.ts";
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

// Opened by the pointer, the popup takes focus itself and draws no ring: the
// rows carry the keyboard's.
export const PointerOpenDrawsNoRing: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "More" }));
		const menu = await screen.findByRole("menu");
		expect(getComputedStyle(menu).outlineStyle).toBe("none");
	},
};

// An open menu leaves no focus guard hidden from assistive tech: Base UI's
// guards stay in the tab order (they relay Tab) and drop `aria-hidden`, which
// is what axe's `aria-hidden-focus` flags; the run that follows this story,
// with the menu open and nothing excluded, is the check.
export const OpenMenuHasNoHiddenFocusable: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "More" }));
		await screen.findByRole("menu");
		const guards = [...document.querySelectorAll("[data-base-ui-focus-guard]")];
		await expect(guards.length).toBeGreaterThan(0);
		await waitFor(() =>
			expect(
				document.querySelectorAll("[data-base-ui-focus-guard][aria-hidden]"),
			).toHaveLength(0),
		);
		for (const guard of guards)
			await expect(guard).toHaveAttribute("tabindex", "0");
	},
};

// A blocked item draws no highlight fill, from the pointer or from a key
// landing on it; a key landing on it still shows the ring, and it acts on
// nothing.
export const BlockedItem: StoryObj = {
	render: () => (
		<Menu
			label="More"
			items={[
				{ label: "Duplicate", onAct: act },
				{ label: "Archive", onAct: act, blocked: "Already archived" },
				{ label: "Rename", onAct: act },
			]}
		/>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.tab();
		await userEvent.keyboard("{Enter}");
		await screen.findByRole("menu");
		const [, archive, rename] = screen.getAllByRole("menuitem");
		await userEvent.keyboard("{ArrowDown}");
		await waitFor(() => expect(archive).toHaveFocus());
		await expect(getComputedStyle(archive as Element).outlineStyle).not.toBe(
			"none",
		);
		await expect(getComputedStyle(archive as Element).backgroundColor).toBe(
			getComputedStyle(rename as Element).backgroundColor,
		);
		const box = (archive as Element).getBoundingClientRect();
		await hover({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
		await expect(getComputedStyle(archive as Element).backgroundColor).toBe(
			getComputedStyle(rename as Element).backgroundColor,
		);
		await userEvent.keyboard("{Enter}");
		await expect(screen.getByRole("menu")).toBeInTheDocument();
		await expect(canvas.getByRole("button", { name: "More" })).toBeVisible();
	},
};
