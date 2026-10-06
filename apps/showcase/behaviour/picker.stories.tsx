import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";
import { focused } from "./support.ts";

const ROLES = [
	{ value: "owner", label: "Owner" },
	{ value: "admin", label: "Admin" },
	{ value: "member", label: "Member" },
	{ value: "viewer", label: "Viewer" },
];

function Role() {
	const [role, setRole] = useState("member");
	return (
		<Picker label="Role" options={ROLES} value={role} onChange={setRole} />
	);
}

export default {
	title: "Behaviour/Picker",
	render: () => <Role />,
} satisfies Meta;

// The picker's list takes focus when it opens, moves by the arrow keys and
// typeahead, Enter picks, and Escape closes it and returns focus to the
// trigger.
export const Popover: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("combobox", { name: /Role/ });
		await userEvent.click(trigger);
		const list = await screen.findByRole("listbox");
		await waitFor(() => expect(list).toContainElement(focused()));
		const options = screen.getAllByRole("option");
		await expect(options[2]).toHaveAttribute("aria-selected", "true");
		await userEvent.keyboard("{ArrowDown}");
		await waitFor(() => expect(options[3]).toHaveAttribute("data-highlighted"));
		await userEvent.keyboard("a");
		await waitFor(() => expect(options[1]).toHaveAttribute("data-highlighted"));
		await userEvent.keyboard("{Enter}");
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		await expect(trigger).toHaveTextContent("Admin");
		await waitFor(() => expect(trigger).toHaveFocus());
		await userEvent.click(trigger);
		await screen.findByRole("listbox");
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		await waitFor(() => expect(trigger).toHaveFocus());
	},
};
