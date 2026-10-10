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

// A click on a field draws no ring: the box takes the hover edge and the caret
// carries focus. Tab back to it rings the box on its edge, centred on the 1 px
// hairline (an offset of -1 px), and the hover edge gives way to the ring.
export const ClickIsQuietKeyboardRingsTheEdge: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const field = canvas.getByPlaceholderText("Add a host");
		const box = field.parentElement as HTMLElement;
		await userEvent.click(field);
		await expect(field).toHaveFocus();
		await expect(document.documentElement.dataset.modality).toBe("pointer");
		await expect(getComputedStyle(box).outlineStyle).toBe("none");
		const hover = getComputedStyle(box).borderTopColor;
		await userEvent.tab();
		await userEvent.tab({ shift: true });
		await expect(field).toHaveFocus();
		await expect(document.documentElement.dataset.modality).toBe("keyboard");
		const ring = getComputedStyle(box);
		await expect(ring.outlineStyle).toBe("solid");
		await expect(ring.outlineWidth).toBe("2px");
		await expect(ring.outlineOffset).toBe("-1px");
		await expect(hover).not.toBe("");
	},
};
