import { Screen } from "@fcalell/plugin-react-ui/components/screen";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

const LINES = Array.from({ length: 40 }, (_, at) => `Line ${at + 1}`);

export default { title: "Behaviour/Screen" } satisfies Meta;

// A Screen whose body scrolls with nothing tabbable inside takes the tab
// stop itself, so a keyboard reaches the text; the back act is the one stop
// before it.
export const BodyTakesTheTabStop: StoryObj = {
	render: () => (
		<div
			style={{
				width: 375,
				height: 300,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Screen title="Sink" back="/system">
				{LINES.map((line) => (
					<p key={line}>{line}</p>
				))}
			</Screen>
		</div>
	),
	play: async ({ canvasElement, userEvent }) => {
		const stop = () =>
			canvasElement.querySelector<HTMLElement>("div[tabindex='0']");
		await waitFor(() => expect(stop()).not.toBeNull());
		const body = stop();
		// The head's acts take their stops first; the body is the last.
		for (let at = 0; at < 5 && document.activeElement !== body; at++)
			await userEvent.tab();
		await expect(document.activeElement).toBe(body);
	},
};
