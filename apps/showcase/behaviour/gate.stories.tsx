import { Button } from "@fcalell/plugin-react-ui/components/button";
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

function FirstRun() {
	return (
		<Gate
			title="Deploy your first app"
			description={[
				"Connect a repository and Acme builds and deploys every push to main.",
			]}
		>
			<Button label="Connect a repository" onAct={() => {}} />
			<Button act="secondary" label="Start from a template" onAct={() => {}} />
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

// A first run is a titled Gate: its title is the page's one h1 and its
// buttons are the body. The column stands centred across and down the
// viewport while it fits, and at the top on touch, as every step does.
async function expectColumn(canvasElement: HTMLElement, width: number) {
	const { page } = await import("vitest/browser");
	await page.viewport(width, 844);
	await waitFor(() => expect(window.innerWidth).toBe(width));
	const titles = canvasElement.querySelectorAll("h1");
	await expect(titles).toHaveLength(1);
	await expect(titles[0]).toHaveTextContent("Deploy your first app");
	const column = titles[0]?.parentElement?.parentElement;
	if (!column) throw new Error("the first run's column is not drawn");
	return column;
}

export const FirstRunCentred: StoryObj = {
	render: () => <FirstRun />,
	play: async ({ canvasElement }) => {
		const column = await expectColumn(canvasElement, 1440);
		await waitFor(() => {
			const box = column.getBoundingClientRect();
			const centre = {
				x: box.left + box.width / 2,
				y: box.top + box.height / 2,
			};
			expect(Math.abs(centre.x - window.innerWidth / 2)).toBeLessThan(1);
			expect(Math.abs(centre.y - window.innerHeight / 2)).toBeLessThan(1);
		});
	},
};

// On touch the column stands at the top of the page, for the keyboard.
export const FirstRunAtTopOnTouch: StoryObj = {
	render: () => <FirstRun />,
	globals: { density: "touch" },
	play: async ({ canvasElement }) => {
		const column = await expectColumn(canvasElement, 390);
		await waitFor(() => {
			const box = column.getBoundingClientRect();
			expect(
				Math.abs(box.left + box.width / 2 - window.innerWidth / 2),
			).toBeLessThan(1);
			expect(box.top).toBeLessThan(window.innerHeight / 4);
		});
	},
};
