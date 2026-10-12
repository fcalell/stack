import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

// A Section reads nothing of its body: its head is busy exactly while its
// `loading` is set and its count is exactly its `count`; each part of the body
// draws its own waiting form, a FormField a skeleton field with the real one
// kept mounted, hidden.
const noop = () => {};
const PENDING = {
	data: undefined,
	isPending: true,
	isError: false,
	refetch: noop,
};
const ITEMS = ["Notes", "Deploys", "Hosts", "Mail", "Docs"];
const ROW = { key: (name: string) => name, title: (name: string) => name };

export default {
	title: "Behaviour/Section loading",
} satisfies Meta;

// A pending List in the body makes no head busy and a list's total is no count:
// the head is busy by `loading` alone and counts what it is given.
export const HeadIsBusyAndCountedByItsProps: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections w-sheet max-w-full">
			<Section title="Pending list">
				<Group>
					<List
						query={PENDING}
						sentence="Did not load."
						empty={{ sentence: "None." }}
						row={ROW}
					/>
				</Group>
			</Section>
			<Section title="Counted" count={3}>
				<Group>
					<List items={ITEMS} row={ROW} />
				</Group>
			</Section>
			<Section title="Uncounted">
				<Group>
					<List items={ITEMS} row={ROW} />
				</Group>
			</Section>
			<Section title="Loading" count={3} loading>
				<Group>
					<List items={ITEMS} row={ROW} />
				</Group>
			</Section>
		</div>
	),
	play: async ({ canvas }) => {
		const region = (name: string) => canvas.getByRole("region", { name });
		await expect(region("Pending list")).not.toHaveAttribute("aria-busy");
		await expect(region("Counted")).not.toHaveAttribute("aria-busy");
		await expect(region("Loading")).toHaveAttribute("aria-busy", "true");
		// The count is the prop, never the five rows; none is drawn while busy.
		await expect(canvas.getByText("3")).toBeVisible();
		await expect(canvas.queryByText("5")).toBeNull();
		const head = (name: string) => region(name).querySelector("h2");
		await expect(head("Uncounted")).toHaveTextContent(/^Uncounted$/);
		await expect(head("Loading")).toHaveTextContent(/^Loading$/);
	},
};

function Profile() {
	const [loading, setLoading] = useState(false);
	const [name, setName] = useState("Acme");
	return (
		<>
			<button type="button" onClick={() => setLoading(!loading)}>
				Toggle
			</button>
			<Section title="Profile" loading={loading}>
				<FormField label="Workspace name">
					<Input value={name} onChange={setName} />
				</FormField>
			</Section>
		</>
	);
}

// A FormField in a loading Section waits as a skeleton field of its own, the
// real field mounted and hidden, so what was typed stands again when it loads.
export const FieldWaitsAndKeepsItsText: StoryObj = {
	render: () => <Profile />,
	play: async ({ canvas, canvasElement, userEvent }) => {
		const input = canvas.getByRole("textbox", { name: "Workspace name" });
		await userEvent.type(input, " Inc");
		await expect(input).toHaveValue("Acme Inc");
		await userEvent.click(canvas.getByRole("button", { name: "Toggle" }));
		const region = canvas.getByRole("region", { name: "Profile" });
		await expect(region).toHaveAttribute("aria-busy", "true");
		await expect(input).not.toBeVisible();
		// The waiting field is drawn once the read has lasted its delay.
		await waitFor(() => {
			const wait = canvasElement.querySelector("section div[aria-hidden]");
			if (!wait) throw new Error("no skeleton field");
			return expect(getComputedStyle(wait).visibility).not.toBe("hidden");
		});
		await userEvent.click(canvas.getByRole("button", { name: "Toggle" }));
		await waitFor(() => expect(input).toBeVisible(), { timeout: 2000 });
		await expect(input).toHaveValue("Acme Inc");
		await expect(region).not.toHaveAttribute("aria-busy");
	},
};
