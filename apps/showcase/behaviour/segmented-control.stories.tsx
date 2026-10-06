import { SegmentedControl } from "@fcalell/plugin-react-ui/components/segmented-control";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

const VIEWS = [
	{ value: "list", label: "List" },
	{ value: "board", label: "Board" },
	{ value: "calendar", label: "Calendar" },
];

function Views() {
	const [view, setView] = useState("list");
	return (
		<SegmentedControl
			label="View"
			options={VIEWS}
			value={view}
			onChange={setView}
		/>
	);
}

export default {
	title: "Behaviour/SegmentedControl",
	render: () => <Views />,
} satisfies Meta;

// A radio group: one tab stop on the chosen segment, the arrow keys move the
// choice (and wrap), and the group is named.
export const RadioGroup: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const group = canvas.getByRole("radiogroup", { name: "View" });
		const [list, board, calendar] = canvas.getAllByRole("radio");
		await expect(group).toBeInTheDocument();
		await expect(list).toBeChecked();
		await userEvent.tab();
		await expect(list).toHaveFocus();
		await userEvent.keyboard("{ArrowRight}");
		await waitFor(() => expect(board).toBeChecked());
		await expect(board).toHaveFocus();
		await userEvent.keyboard("{ArrowRight}");
		await waitFor(() => expect(calendar).toBeChecked());
		await userEvent.keyboard("{ArrowRight}");
		await waitFor(() => expect(list).toBeChecked());
		await userEvent.keyboard("{ArrowLeft}");
		await waitFor(() => expect(calendar).toBeChecked());
	},
};
