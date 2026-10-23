import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { type Row, Section } from "@fcalell/plugin-react-ui/components/section";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { sectionOf } from "./support.ts";

// A Section's head is busy exactly while the read it holds waits: a read says
// so, and a selection of a read its Pane holds does not. The count is the
// length of the loaded rows, and never drawn while the body waits.
const ITEMS = ["Notes", "Deploys", "Hosts", "Mail", "Docs"];
const toRow = (name: string): Row => ({ key: name, title: name });
const rows = (items: ReturnType<typeof readsAt>["ready"]) =>
	items.at((names) => names.map(toRow));

export default {
	title: "Behaviour/Section loading",
} satisfies Meta;

const waits = readsAt("section-loading/waits");
const ready = readsAt("section-loading/ready");

export const HeadIsBusyAndCountedByItsRead: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-section w-sheet max-w-full">
			<Section title="Counted" items={ITEMS.map(toRow)} />
			<Section title="Waiting" items={rows(waits.waiting)} />
			<div className="h-[20rem]">
				<Place>
					<Pane title="Held" read={waits.waiting}>
						<Section title="Selection" items={rows(waits.waiting)} />
					</Pane>
				</Place>
			</div>
			<Section title="Read" items={rows(ready.ready)} />
		</div>
	),
	play: async ({ canvas }) => {
		const region = (name: string) => sectionOf(canvas, name);
		await expect(region("Counted")).not.toHaveAttribute("aria-busy");
		await expect(region("Waiting")).toHaveAttribute("aria-busy", "true");
		// A selection of the read its Pane holds is no holder: the Pane says it is busy.
		await expect(region("Selection")).not.toHaveAttribute("aria-busy");
		// The count is the loaded rows' length; none is drawn while waiting.
		const head = (name: string) => region(name).querySelector("h2");
		await expect(head("Counted")).toHaveTextContent(/^Counted\s*5$/);
		await expect(head("Waiting")).toHaveTextContent(/^Waiting$/);
		// A selection counts its rows once it lands.
		await waitFor(() => expect(head("Read")).toHaveTextContent(/^Read\s*3$/));
		await expect(region("Read")).not.toHaveAttribute("aria-busy");
	},
};
