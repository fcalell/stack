import { Field } from "@base-ui/react/field";
import { InputOtp } from "@fcalell/plugin-react-ui/components/input-otp";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";

const done = fn();

function Code(props: { loading?: boolean }) {
	const [code, setCode] = useState("");
	return (
		<Field.Root>
			<Field.Label>Code</Field.Label>
			<InputOtp
				length={6}
				value={code}
				onChange={setCode}
				onComplete={done}
				loading={props.loading}
			/>
		</Field.Root>
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

// A code being checked is announced and takes no more digits, yet stays read.
export const Checking: StoryObj = {
	render: () => <Code loading />,
	play: async ({ canvas }) => {
		await expect(canvas.getByRole("status")).toHaveTextContent(/checking/i);
		await expect(canvas.getByRole("textbox", { name: "Code" })).toHaveAttribute(
			"aria-disabled",
			"true",
		);
	},
};
