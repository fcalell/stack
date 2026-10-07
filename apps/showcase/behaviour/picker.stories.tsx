import { Group } from "@fcalell/plugin-react-ui/components/group";
import { ListRow } from "@fcalell/plugin-react-ui/components/list-row";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
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

const OWNERS = [
	{ value: "ana", label: "Ana Ruiz" },
	{ value: "ben", label: "Ben Kaya" },
	{ value: "chen", label: "Chen Wu" },
	{ value: "dana", label: "Dana Moss" },
	{ value: "ema", label: "Ema Okafor" },
	{ value: "felix", label: "Felix Varga" },
	{ value: "gus", label: "Gus Lund" },
];

function Owner() {
	const [owner, setOwner] = useState("ana");
	return (
		<Picker label="Owner" options={OWNERS} value={owner} onChange={setOwner} />
	);
}

// A pick past six options leads its list with a search; "No matches" stands
// only while the typed search matches no option.
export const Search: StoryObj = {
	render: () => <Owner />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("combobox", { name: /Owner/ }));
		await screen.findByRole("listbox");
		await expect(screen.queryByText("No matches")).toBeNull();
		await userEvent.keyboard("zzz");
		await screen.findByText("No matches");
		await userEvent.keyboard("{Backspace}{Backspace}{Backspace}");
		await waitFor(() => expect(screen.queryByText("No matches")).toBeNull());
		await expect(screen.getAllByRole("option")).toHaveLength(OWNERS.length);
	},
};

function Trailing() {
	const [role, setRole] = useState("member");
	return (
		<Group>
			<ListRow
				leading={{ avatar: { name: "Ben Kaya" } }}
				title="Ben Kaya"
				meta={["ben@acme.app"]}
				trailing={{
					pick: {
						label: "Ben's role",
						options: ROLES,
						value: role,
						onChange: setRole,
					},
				}}
			/>
		</Group>
	);
}

// A row's trailing pick stands at the viewport's end: its list hangs from its
// start and shifts back inside the viewport.
export const RowEnd: StoryObj = {
	render: () => <Trailing />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("combobox", { name: /Ben's role/ }));
		const list = await screen.findByRole("listbox");
		await waitFor(() => {
			const rect = list.getBoundingClientRect();
			expect(rect.left).toBeGreaterThanOrEqual(0);
			expect(rect.right).toBeLessThanOrEqual(innerWidth);
		});
	},
};

function Pair() {
	const [repo, setRepo] = useState("web");
	const [lead, setLead] = useState("ana");
	return (
		<Toolbar>
			<Picker
				fit="bar"
				label="Repo"
				options={[
					{ value: "web", label: "web" },
					{ value: "api", label: "api" },
				]}
				value={repo}
				onChange={setRepo}
			/>
			<Picker
				fit="bar"
				label="Lead"
				options={OWNERS}
				value={lead}
				onChange={setLead}
			/>
		</Toolbar>
	);
}

// A pick in a toolbar's start hangs its list from its own start edge: the
// first and the one after it, a short list and a searching one.
export const Start: StoryObj = {
	render: () => <Pair />,
	play: async ({ canvas, userEvent }) => {
		for (const name of [/Repo/, /Lead/]) {
			const trigger = canvas.getByRole("combobox", { name });
			await userEvent.click(trigger);
			const list = await screen.findByRole("listbox");
			const popup = list.closest("[data-side]") ?? list;
			await waitFor(() =>
				expect(
					Math.abs(
						popup.getBoundingClientRect().left -
							trigger.getBoundingClientRect().left,
					),
				).toBeLessThan(2),
			);
			await userEvent.keyboard("{Escape}");
			await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		}
	},
};
