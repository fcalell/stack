import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";

// A FormField's form follows the descriptor it is given: `switch` draws the
// Switch at the label's end, centred on its label block.
export default {
	title: "Behaviour/FormField",
} satisfies Meta;

function Notify() {
	const [on, setOn] = useState(false);
	return (
		<div className="w-sheet max-w-full">
			<FormField
				label="Notify on failure"
				description="An email the moment a deploy fails."
				switch={{ checked: on, onChange: setOn }}
			/>
		</div>
	);
}

export const SwitchStandsAtTheLabelsEnd: StoryObj = {
	render: () => <Notify />,
	play: async ({ canvas, userEvent }) => {
		const toggle = canvas.getByRole("switch", { name: "Notify on failure" });
		const label = canvas.getByText("Notify on failure");
		const note = canvas.getByText("An email the moment a deploy fails.");
		const at = toggle.getBoundingClientRect();
		const named = label.getBoundingClientRect();
		const noted = note.getBoundingClientRect();
		// Beside the label block, past its end, not under it.
		await expect(at.left).toBeGreaterThanOrEqual(named.right);
		await expect(at.top).toBeLessThan(noted.bottom);
		// Centred on the block the label and the description make.
		const block = (named.top + noted.bottom) / 2;
		await expect(at.top + at.height / 2).toBeCloseTo(block, 0);
		// The field draws it and wires it: it flips.
		await expect(toggle).toHaveAttribute("aria-checked", "false");
		await userEvent.click(toggle);
		await expect(toggle).toHaveAttribute("aria-checked", "true");
	},
};
