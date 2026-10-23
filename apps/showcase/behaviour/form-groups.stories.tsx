import { Form } from "@fcalell/plugin-react-ui/components/form";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";

// A form of groups draws each as a group named by its title, stacked in order
// over the form's one bar, the fields of every group on the form's columns.
export default {
	title: "Behaviour/Form groups",
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={orpc.forms.save}
				given={{ workspaceId: "acme" }}
				groups={[
					{
						title: "General",
						description: "How the workspace appears.",
						fields: {
							name: { label: "Name" },
							about: { label: "Address" },
						},
					},
					{
						title: "Email",
						fields: { notify: { label: "Failed deploys" } },
					},
					{
						title: "Digest",
						fields: { digest: { label: "Frequency" } },
					},
				]}
			/>
		</div>
	),
} satisfies Meta;

export const GroupsStandInOrderOverOneBar: StoryObj = {
	play: async ({ canvas }) => {
		const groups = ["General", "Email", "Digest"].map((name) =>
			canvas.getByRole("group", { name }),
		);
		await expect(canvas.getAllByRole("group")).toHaveLength(3);
		await expect(canvas.getByText("How the workspace appears.")).toBeVisible();
		// Each group stands under the one before it.
		for (const at of [0, 1]) {
			const above = groups[at]?.getBoundingClientRect();
			const below = groups[at + 1]?.getBoundingClientRect();
			if (!above || !below) throw new Error("a group is not drawn");
			await expect(below.top).toBeGreaterThanOrEqual(above.bottom);
		}
		// The fields of every group stand on the form's columns.
		const name = canvas.getByRole("textbox", { name: /^Name/ });
		const address = canvas.getByRole("textbox", { name: /^Address/ });
		await expect(address.getBoundingClientRect().left).toBeCloseTo(
			name.getBoundingClientRect().left,
			0,
		);
		// The bar stands in the form's foot, under the last group.
		const save = canvas.getByRole("button", { name: "Save" });
		await expect(save.getBoundingClientRect().top).toBeGreaterThan(
			groups[2]?.getBoundingClientRect().bottom ?? 0,
		);
	},
};
