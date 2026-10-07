import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

const act = () => {};

export default {
	title: "Behaviour/ActionBar",
} satisfies Meta;

// An end bar whose acts need more than its container wraps them to a further
// row: every act stands inside the container's edges, the filled act last.
export const WrapsInsideItsContainer: StoryObj = {
	render: () => (
		<div data-testid="column" className="w-list max-w-full">
			<ActionBar
				acts={[
					{ label: "Cut the scope in the thread", onAct: act },
					{ label: "Split the work in its thread", onAct: act },
					{ label: "Accept the flags as known limits", onAct: act },
					{ label: "Continue refining", onAct: act },
				]}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		const column = canvas.getByTestId("column").getBoundingClientRect();
		const buttons = canvas.getAllByRole("button");
		for (const button of buttons) {
			const box = button.getBoundingClientRect();
			await expect(box.left).toBeGreaterThanOrEqual(column.left);
			await expect(box.right).toBeLessThanOrEqual(column.right);
		}
		const last = buttons.at(-1)?.getBoundingClientRect();
		const first = buttons[0]?.getBoundingClientRect();
		await expect(last?.top).toBeGreaterThan(first?.top ?? 0);
	},
};

// The last blocked act's reason stands under the acts without a press.
export const BlockedReasonAtRest: StoryObj = {
	render: () => (
		<ActionBar
			acts={[
				{ label: "Cancel", onAct: act },
				{
					label: "Approve",
					onAct: act,
					blocked: "1 sensitive file not yet opened.",
				},
			]}
		/>
	),
	play: async ({ canvas }) => {
		const reason = canvas.getByText("1 sensitive file not yet opened.");
		await expect(reason).toBeVisible();
		const approve = canvas.getByRole("button", { name: "Approve" });
		await expect(reason.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			approve.getBoundingClientRect().bottom,
		);
	},
};
