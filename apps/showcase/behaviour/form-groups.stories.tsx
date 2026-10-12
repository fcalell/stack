import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const noop = () => {};

// A form of groups draws each as a fieldset named by its legend, the groups the
// sections step apart and each group's parts the fields step apart.
export default {
	title: "Behaviour/Form groups",
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				bar={{ acts: [{ label: "Save", onAct: noop }] }}
				groups={[
					{
						title: "General",
						description: "How the workspace appears.",
						fields: (
							<>
								<FormField label="Name">
									<Input value="Acme" onChange={noop} />
								</FormField>
								<FormField label="Address">
									<Input value="acme" onChange={noop} />
								</FormField>
							</>
						),
					},
					{
						title: "Email",
						fields: (
							<FormField
								label="Failed deploys"
								switch={{ checked: true, onChange: noop }}
							/>
						),
					},
					{
						title: "Billing",
						fields: (
							<FormField label="Contact">
								<Input value="ana@acme.dev" onChange={noop} />
							</FormField>
						),
					},
				]}
			/>
		</div>
	),
} satisfies Meta;

// A step's size in px, read off a probe wearing its class.
function step(root: Element, className: string): number {
	const probe = document.createElement("div");
	probe.className = className;
	root.append(probe);
	const size = Number.parseFloat(getComputedStyle(probe).paddingBottom);
	probe.remove();
	return size;
}

export const GroupsAreFieldsetsASectionsStepApart: StoryObj = {
	play: async ({ canvas, canvasElement }) => {
		const sets = [...canvasElement.querySelectorAll("fieldset")];
		await expect(sets).toHaveLength(3);
		// Each is a group named by its legend.
		for (const [at, name] of ["General", "Email", "Billing"].entries()) {
			await expect(sets[at]?.querySelector("legend")).toHaveTextContent(name);
			await expect(canvas.getByRole("group", { name })).toBe(sets[at]);
		}
		// The groups stand the sections step apart.
		const sections = step(canvasElement, "pb-sections");
		for (const at of [0, 1]) {
			const above = sets[at]?.getBoundingClientRect();
			const below = sets[at + 1]?.getBoundingClientRect();
			if (!above || !below) throw new Error("a group is not drawn");
			await expect(below.top - above.bottom).toBeCloseTo(sections, 0);
		}
		// A group's parts stand the fields step apart, the legend a pair over them.
		const fields = step(canvasElement, "pb-fields");
		const general = sets[0] as HTMLElement;
		await expect(Number.parseFloat(getComputedStyle(general).rowGap)).toBe(
			fields,
		);
		const name = canvas.getByRole("textbox", { name: "Name" });
		const address = canvas.getByRole("textbox", { name: "Address" });
		await expect(
			address.getBoundingClientRect().top - name.getBoundingClientRect().bottom,
		).toBeGreaterThan(fields);
		const legend = general.querySelector("legend") as HTMLElement;
		await expect(Number.parseFloat(getComputedStyle(legend).marginBottom)).toBe(
			step(canvasElement, "pb-pair"),
		);
		// The bar stands in the form's foot, under the last group.
		const save = canvas.getByRole("button", { name: "Save" });
		await expect(save.getBoundingClientRect().top).toBeGreaterThan(
			sets[2]?.getBoundingClientRect().bottom ?? 0,
		);
	},
};
