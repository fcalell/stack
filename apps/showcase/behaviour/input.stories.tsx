import { Input } from "@fcalell/plugin-react-ui/components/input";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn } from "storybook/test";

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
