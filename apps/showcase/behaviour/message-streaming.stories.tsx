import { Message } from "@fcalell/plugin-react-ui/components/message";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

export default {
	title: "Behaviour/Message streaming",
	render: () => (
		<div style={{ width: 480, maxWidth: "100%" }}>
			<Message
				author="other"
				name="Lead"
				streaming
				body="Open **the *redeploy and run `npm test"
			/>
			<Message author="other" name="Lead" body="A *finished reply" />
		</div>
	),
} satisfies Meta;

// A reply still arriving draws its open emphasis, strong run and code span in
// their own forms; a finished one leaves the same unmatched marker as text.
export const OpenMarkersDrawTheirForm: StoryObj = {
	play: async ({ canvas, canvasElement }) => {
		const [streamed, finished] = canvasElement.querySelectorAll("article");
		await expect(streamed?.querySelector("strong")?.textContent).toContain(
			"the",
		);
		await expect(streamed?.querySelector("em")?.textContent).toContain(
			"redeploy",
		);
		await expect(streamed?.querySelector("code")?.textContent).toBe("npm test");
		await expect(finished?.querySelector("em")).toBeNull();
		await expect(canvas.getByText(/A \*finished reply/)).toBeVisible();
	},
};
