import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, waitFor } from "storybook/test";

function Step() {
	const [email, setEmail] = useState("");
	return (
		<Gate title="Sign in">
			<FormField label="Email">
				<Input value={email} onChange={setEmail} />
			</FormField>
		</Gate>
	);
}

export default {
	title: "Behaviour/Gate",
	parameters: { layout: "fullscreen" },
	render: () => <Step />,
} satisfies Meta;

// A step that opens hands focus to its first field.
export const FirstField: StoryObj = {
	play: async ({ canvas }) => {
		await waitFor(() =>
			expect(canvas.getByRole("textbox", { name: "Email" })).toHaveFocus(),
		);
	},
};
