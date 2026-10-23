import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { sectionOf } from "./support.ts";

const noop = () => {};
const reads = readsAt("section-empty");

export default { title: "Behaviour/Section empty" } satisfies Meta;

// A Section's empty form stands in a hairline frame, so it never reads as part
// of the head. Under a description it says no sentence of its own, only the
// word for none, or holds the act alone; without one it says its sentence.
export const EmptyStandsInAHairlineFrame: StoryObj = {
	render: () => (
		<Place>
			<Pane title="Empties">
				<Section
					title="Reviews"
					description="Who looked at this deploy."
					read={reads.empty}
				/>
				<Section
					title="Webhooks"
					description="Where Acme posts deploy events."
					read={reads.empty}
					empty={{ act: { label: "Add endpoint", onAct: noop } }}
				/>
				<Section
					title="Plain"
					read={reads.empty}
					empty={{ sentence: "Nothing needs you." }}
				/>
				<Section title="Generic" read={reads.empty} />
			</Pane>
		</Place>
	),
	play: async ({ canvas }) => {
		const framed = (element: HTMLElement) => {
			const box = element.closest<HTMLElement>("div[class*='border']");
			return box !== null && getComputedStyle(box).borderTopWidth === "1px";
		};
		const described = within(sectionOf(canvas, "Reviews"));
		const none = await described.findByText("None");
		await expect(framed(none)).toBe(true);
		const acted = within(sectionOf(canvas, "Webhooks"));
		const add = await acted.findByRole("button", { name: "Add endpoint" });
		await expect(framed(add)).toBe(true);
		await expect(acted.queryByText("None")).toBeNull();
		const plain = within(sectionOf(canvas, "Plain"));
		await expect(framed(await plain.findByText("Nothing needs you."))).toBe(
			true,
		);
		const generic = within(sectionOf(canvas, "Generic"));
		await expect(framed(await generic.findByText("Nothing here yet."))).toBe(
			true,
		);
	},
};
