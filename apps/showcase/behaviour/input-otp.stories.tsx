import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { InputOtp } from "@fcalell/plugin-react-ui/components/input-otp";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";

const done = fn();

function Code(props: { check?: (code: string) => unknown }) {
	const [code, setCode] = useState("");
	return (
		<FormField label="Code">
			<InputOtp
				length={6}
				value={code}
				onChange={setCode}
				onComplete={props.check ?? done}
			/>
		</FormField>
	);
}

export default { title: "Behaviour/InputOtp" } satisfies Meta;

// One named input takes the digits, drops anything else and reports the code
// once its last digit lands.
export const Typing: StoryObj = {
	render: () => <Code />,
	play: async ({ canvas, userEvent }) => {
		const input = canvas.getByRole("textbox", { name: "Code" });
		await userEvent.tab();
		await expect(input).toHaveFocus();
		await userEvent.keyboard("48x1");
		await expect(input).toHaveValue("481");
		await userEvent.keyboard("902");
		await waitFor(() => expect(done).toHaveBeenCalledWith("481902"));
	},
};

// A code being checked, its promise pending, says so and takes no more digits.
export const Checking: StoryObj = {
	render: () => <Code check={() => new Promise(() => {})} />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.tab();
		await userEvent.keyboard("481902");
		await expect(await canvas.findByRole("status")).toHaveTextContent(
			/checking/i,
		);
		await expect(canvas.getByRole("textbox", { name: "Code" })).toBeDisabled();
	},
};

// A refused code stands in the control's own line, under the boxes, and the
// next digit clears it.
export const Refused: StoryObj = {
	render: () => (
		<Code check={() => Promise.reject(new Error("That code is not right."))} />
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.tab();
		await userEvent.keyboard("481902");
		const line = await canvas.findByRole("alert");
		await expect(line).toHaveTextContent("That didn't go through.");
		const boxes = canvas.getByRole("textbox", { name: "Code" }).parentElement;
		await expect(line.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			(boxes as HTMLElement).getBoundingClientRect().bottom,
		);
		// The check disabled the input, which dropped its focus.
		await userEvent.tab();
		await userEvent.keyboard("{Backspace}");
		await waitFor(() => expect(canvas.queryByRole("alert")).toBeNull());
	},
};
