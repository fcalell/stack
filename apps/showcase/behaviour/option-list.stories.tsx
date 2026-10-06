import { OptionList } from "@fcalell/plugin-react-ui/components/option-list";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

const APPROACHES = [
	{ value: "ask", label: "Ask before each change" },
	{ value: "apply", label: "Apply and report" },
	{ value: "stop", label: "Stop here" },
];

function One() {
	const [value, setValue] = useState<string | null>(null);
	return <OptionList options={APPROACHES} value={value} onChange={setValue} />;
}

function Several() {
	const [value, setValue] = useState<string[]>([]);
	return <OptionList options={APPROACHES} value={value} onChange={setValue} />;
}

export default { title: "Behaviour/OptionList" } satisfies Meta;

// One choice is a radio group: the arrow keys move the choice.
export const Radios: StoryObj = {
	render: () => <One />,
	play: async ({ canvas, userEvent }) => {
		await expect(canvas.getByRole("radiogroup")).toBeInTheDocument();
		const [ask, apply, stop] = canvas.getAllByRole("radio");
		await userEvent.tab();
		await expect(ask).toHaveFocus();
		await userEvent.keyboard("{ArrowDown}");
		await waitFor(() => expect(apply).toBeChecked());
		await expect(apply).toHaveFocus();
		await userEvent.keyboard("{ArrowDown}");
		await waitFor(() => expect(stop).toBeChecked());
		await userEvent.keyboard("{ArrowUp}");
		await waitFor(() => expect(apply).toBeChecked());
	},
};

// Several choices are checkboxes, each in the tab order and toggled by Space.
export const Checks: StoryObj = {
	render: () => <Several />,
	play: async ({ canvas, userEvent }) => {
		const [ask, apply] = canvas.getAllByRole("checkbox");
		await userEvent.tab();
		await expect(ask).toHaveFocus();
		await userEvent.keyboard(" ");
		await waitFor(() => expect(ask).toBeChecked());
		await userEvent.tab();
		await expect(apply).toHaveFocus();
		await userEvent.keyboard(" ");
		await waitFor(() => expect(apply).toBeChecked());
		await userEvent.keyboard(" ");
		await waitFor(() => expect(apply).not.toBeChecked());
	},
};
