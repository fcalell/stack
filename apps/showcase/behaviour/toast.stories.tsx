import { Button } from "@fcalell/plugin-react-ui/components/button";
import { Gate } from "@fcalell/plugin-react-ui/components/gate";
import { toast } from "@fcalell/plugin-react-ui/lib/toast";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen } from "storybook/test";

// A Gate hosts `toast()`: the toasts' layer is its `main`'s region.
export default {
	title: "Behaviour/Toast",
	parameters: { layout: "fullscreen" },
	render: () => (
		<Gate title="Deploys">
			<Button
				act="secondary"
				label="Deploy"
				onAct={() => toast("Deployment started", { state: "done" })}
			/>
			<Button
				act="secondary"
				label="Fail"
				onAct={() => toast("Couldn’t reach the API", { state: "failed" })}
			/>
		</Gate>
	),
} satisfies Meta;

// A toast is announced: its sentence lands in a live region, a plain one
// politely (the layer's region) and a failed one at once (an alert).
export const Announced: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const region = canvas.getByRole("region", { name: "Notifications" });
		await expect(region).toBeInTheDocument();
		await userEvent.click(canvas.getByRole("button", { name: "Deploy" }));
		const polite = await screen.findByText("Deployment started");
		await expect(polite.closest("[aria-live]")).toHaveAttribute(
			"aria-live",
			"polite",
		);
		await userEvent.click(canvas.getByRole("button", { name: "Fail" }));
		await expect(await screen.findByRole("alert")).toHaveTextContent(
			"Couldn’t reach the API",
		);
	},
};
