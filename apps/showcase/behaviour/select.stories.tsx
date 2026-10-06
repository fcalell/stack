import { Field } from "@base-ui/react/field";
import { Select } from "@fcalell/plugin-react-ui/components/select";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";
import { focused } from "./support.ts";

const REGIONS = [
	{ value: "eu-central-1", label: "Frankfurt" },
	{ value: "eu-west-1", label: "Ireland" },
	{ value: "us-east-1", label: "Virginia" },
	{ value: "us-west-2", label: "Oregon" },
];

function Region() {
	const [region, setRegion] = useState("eu-central-1");
	return (
		<Field.Root>
			<Field.Label nativeLabel={false} render={<div />}>
				Region
			</Field.Label>
			<Select value={region} onChange={setRegion} options={REGIONS} />
		</Field.Root>
	);
}

export default {
	title: "Behaviour/Select",
	render: () => <Region />,
} satisfies Meta;

// A listbox takes focus when it opens, moves by the arrow keys and typeahead,
// Enter picks, and Escape closes it and returns focus to the trigger.
export const Listbox: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("combobox");
		await userEvent.click(trigger);
		const list = await screen.findByRole("listbox");
		await waitFor(() => expect(list).toContainElement(focused()));
		const options = screen.getAllByRole("option");
		await expect(options[0]).toHaveAttribute("aria-selected", "true");
		await userEvent.keyboard("{ArrowDown}");
		await waitFor(() => expect(options[1]).toHaveAttribute("data-highlighted"));
		await userEvent.keyboard("v");
		await waitFor(() => expect(options[2]).toHaveAttribute("data-highlighted"));
		await userEvent.keyboard("{Enter}");
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		await expect(trigger).toHaveTextContent("Virginia");
		await waitFor(() => expect(trigger).toHaveFocus());
		await userEvent.click(trigger);
		await screen.findByRole("listbox");
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		await waitFor(() => expect(trigger).toHaveFocus());
	},
};
