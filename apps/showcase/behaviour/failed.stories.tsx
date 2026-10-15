import { Failed } from "@fcalell/plugin-react-ui/components/failed";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";

// A failed read's act is the hairline one with no plus, a Pane's `empty` the
// filled create act with it. `lucide-plus` is the
// class Lucide gives the Plus glyph.
function Review() {
	const [tries, setTries] = useState(0);
	return (
		<>
			<Place>
				<Pane title="Review">
					<Failed
						sentence="Could not load the file."
						act={{ label: "Retry", onAct: () => setTries(tries + 1) }}
					/>
				</Pane>
			</Place>
			<output aria-label="Tries">{tries}</output>
		</>
	);
}

export default {
	title: "Behaviour/Failed",
	render: () => <Review />,
} satisfies Meta;

// A Failed's Retry runs the function it is given each time it is pressed and
// draws no plus; the mark is the alert glyph.
export const Retry: StoryObj = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		await expect(canvas.getByText("Could not load the file.")).toBeVisible();
		const retry = canvas.getByRole("button", { name: "Retry" });
		await expect(canvasElement.querySelector(".lucide-plus")).toBeNull();
		await expect(
			canvasElement.querySelector(".lucide-circle-alert"),
		).not.toBeNull();
		await userEvent.click(retry);
		await userEvent.click(retry);
		await expect(canvas.getByLabelText("Tries")).toHaveTextContent("2");
	},
};

// A Pane's empty state beside it keeps its create act, with the plus.
export const Create: StoryObj = {
	render: () => (
		<Place>
			<Pane
				title="Projects"
				read={readsAt("failed/create").empty}
				empty={{
					sentence: "A project holds the deploys of one app.",
					act: { label: "New project", onAct: () => {} },
				}}
			/>
		</Place>
	),
	play: async ({ canvas }) => {
		const create = await canvas.findByRole("button", { name: "New project" });
		await expect(create.querySelector(".lucide-plus")).not.toBeNull();
	},
};
