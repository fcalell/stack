import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { sectionOf } from "./support.ts";

// A Section's head is busy exactly while the read it holds waits: a read says
// so, a selection of a read its Pane holds does not, and a body's own read is
// nothing of the head's. The count is the one it is given, or the length of an
// array read once it lands, and never drawn while the body waits.
const ITEMS = ["Notes", "Deploys", "Hosts", "Mail", "Docs"];
const ROW = { key: (name: string) => name, title: (name: string) => name };

export default {
	title: "Behaviour/Section loading",
} satisfies Meta;

const waits = readsAt("section-loading/waits");
const ready = readsAt("section-loading/ready");

export const HeadIsBusyAndCountedByItsRead: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections w-sheet max-w-full">
			<Section title="Counted" count={3}>
				<Group list={{ items: ITEMS, row: ROW }} />
			</Section>
			<Section title="Uncounted">
				<Group list={{ items: ITEMS, row: ROW }} />
			</Section>
			<Section title="Waiting" count={3} read={waits.waiting}>
				<Group list={{ items: waits.waiting, row: ROW }} />
			</Section>
			<div className="h-[20rem]">
				<Place>
					<Pane title="Held" read={waits.waiting}>
						<Section title="Selection" read={waits.waiting.at((rows) => rows)}>
							<Group list={{ items: waits.waiting, row: ROW }} />
						</Section>
					</Pane>
				</Place>
			</div>
			<Section title="Read" read={ready.ready}>
				<Group list={{ items: ready.ready, row: ROW }} />
			</Section>
		</div>
	),
	play: async ({ canvas }) => {
		const region = (name: string) => sectionOf(canvas, name);
		await expect(region("Counted")).not.toHaveAttribute("aria-busy");
		await expect(region("Waiting")).toHaveAttribute("aria-busy", "true");
		// A selection of the read its Pane holds is no holder: the Pane says it is busy.
		await expect(region("Selection")).not.toHaveAttribute("aria-busy");
		// The count is the prop, never the rows; none is drawn while waiting.
		const head = (name: string) => region(name).querySelector("h2");
		await expect(head("Counted")).toHaveTextContent(/^Counted\s*3$/);
		await expect(head("Uncounted")).toHaveTextContent(/^Uncounted$/);
		await expect(head("Waiting")).toHaveTextContent(/^Waiting$/);
		// An array read counts its own length once it lands.
		await waitFor(() => expect(head("Read")).toHaveTextContent(/^Read\s*3$/));
		await expect(region("Read")).not.toHaveAttribute("aria-busy");
	},
};
