import { Form } from "@fcalell/plugin-react-ui/components/form";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";

// A form's field follows the control its schema derives: a boolean draws the
// Switch at the label's end, centred on its label block.
export default {
	title: "Behaviour/FormField",
} satisfies Meta;

export const SwitchStandsAtTheLabelsEnd: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={orpc.forms.submit}
				given={{
					workspaceId: "acme",
					title: "Add the checkout event",
					kind: "change",
					seats: 3,
				}}
				fields={{
					urgent: {
						label: "Notify on failure",
						description: "An email the moment a deploy fails.",
					},
				}}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		const toggle = await canvas.findByRole("switch", {
			name: "Notify on failure",
		});
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
