import { Button } from "@fcalell/plugin-react-ui/components/button";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";

const onAdd = fn();

function Add() {
	const [host, setHost] = useState("");
	return (
		<Input
			kind="source"
			value={host}
			onChange={setHost}
			placeholder="Add a host"
			act={{ icon: "Plus", label: "Add", onAct: () => onAdd(host) }}
		/>
	);
}

export default {
	title: "Behaviour/Input",
	render: () => <Add />,
	beforeEach: () => onAdd.mockClear(),
} satisfies Meta;

// An Input with an act presses it on Enter, as the act's own press does, and
// leaving the field presses nothing.
export const ActOnEnter: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const field = canvas.getByPlaceholderText("Add a host");
		await userEvent.type(field, "api.acme.app");
		await userEvent.tab();
		await expect(onAdd).not.toHaveBeenCalled();
		await userEvent.click(field);
		await userEvent.keyboard("{Enter}");
		await expect(onAdd).toHaveBeenCalledExactlyOnceWith("api.acme.app");
		await userEvent.click(canvas.getByRole("button", { name: "Add" }));
		await expect(onAdd).toHaveBeenCalledTimes(2);
	},
};

const NAME = "Deploys";

// The text, then the field the Edit act swaps in for it.
function Rename() {
	const [editing, setEditing] = useState(false);
	const [name, setName] = useState(NAME);
	if (!editing)
		return (
			<div>
				<p>{name}</p>
				<Button label="Edit" onAct={() => setEditing(true)} />
			</div>
		);
	return (
		<FormField label="Name">
			<Input value={name} onChange={setName} autoFocus />
		</FormField>
	);
}

// A field that replaces what the viewer was reading takes the focus as it
// mounts, the caret at the end of its text.
export const AutoFocusTakesTheFocusAtTheEnd: StoryObj = {
	render: () => <Rename />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Edit" }));
		const field = canvas.getByRole("textbox", { name: "Name" });
		await waitFor(() => expect(document.activeElement).toBe(field));
		if (!(field instanceof HTMLInputElement))
			throw new Error("the field is not an input");
		await expect(field.selectionStart).toBe(NAME.length);
		await expect(field.selectionEnd).toBe(NAME.length);
	},
};

// A field that mounts with the page leaves the focus where it was.
export const LoadedFieldKeepsTheFocus: StoryObj = {
	render: () => (
		<FormField label="Name">
			<Input value={NAME} onChange={() => {}} />
		</FormField>
	),
	play: async ({ canvas }) => {
		const field = canvas.getByRole("textbox", { name: "Name" });
		await expect(document.activeElement).not.toBe(field);
	},
};
