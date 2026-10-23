import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

const pressed = fn();

export default {
	title: "Behaviour/EmptyAct",
} satisfies Meta;

// A Pane's empty state keeps its create act, with the plus (`lucide-plus` is
// the class Lucide gives the Plus glyph).
export const Create: StoryObj = {
	render: () => (
		<Place>
			<Pane
				title="Projects"
				read={readsAt("failed/create").empty}
				empty={{
					sentence: "A project holds the deploys of one app.",
					act: { label: "New project", onAct: pressed },
				}}
			/>
		</Place>
	),
	play: async ({ canvas }) => {
		const create = await canvas.findByRole("button", { name: "New project" });
		await expect(create.querySelector(".lucide-plus")).not.toBeNull();
	},
};
