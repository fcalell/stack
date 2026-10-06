import { List } from "@fcalell/plugin-react-ui/components/list";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

interface Entry {
	id: string;
	name: string;
	children?: Entry[];
}

const FILES: Entry[] = [
	{
		id: "src",
		name: "src",
		children: [
			{ id: "app", name: "app.ts" },
			{ id: "lib", name: "lib", children: [{ id: "date", name: "date.ts" }] },
		],
	},
	{ id: "readme", name: "README.md" },
];

export default {
	title: "Behaviour/List",
	render: () => (
		<List
			items={FILES}
			row={{
				key: (entry) => entry.id,
				title: (entry) => entry.name,
				children: (entry) => entry.children,
			}}
		/>
	),
} satisfies Meta;

// A tree List follows the WAI-ARIA tree pattern: one Tab stop, Down and Up
// move by visible row, Left folds a branch (or goes to its parent) and Right
// unfolds it (or goes to its first child), Home and End jump to the ends.
export const Tree: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		await expect(canvas.getByRole("tree")).toBeInTheDocument();
		const items = () => canvas.getAllByRole("treeitem");
		await expect(items().filter((item) => item.tabIndex === 0)).toHaveLength(1);
		await userEvent.tab();
		await expect(items()[0]).toHaveFocus();
		await expect(items()[0]).toHaveAttribute("aria-expanded", "true");
		await userEvent.keyboard("{ArrowDown}");
		await expect(items()[1]).toHaveFocus();
		await expect(items()[1]).toHaveAttribute("aria-level", "2");
		await userEvent.keyboard("{ArrowUp}{ArrowLeft}");
		await waitFor(() =>
			expect(items()[0]).toHaveAttribute("aria-expanded", "false"),
		);
		await expect(items()).toHaveLength(2);
		await userEvent.keyboard("{ArrowRight}");
		await waitFor(() =>
			expect(items()[0]).toHaveAttribute("aria-expanded", "true"),
		);
		await userEvent.keyboard("{End}");
		await expect(items().at(-1)).toHaveFocus();
		await userEvent.keyboard("{Home}");
		await expect(items()[0]).toHaveFocus();
	},
};
