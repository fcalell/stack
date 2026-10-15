import { combine } from "@fcalell/plugin-api/tanstack-query";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { sectionOf } from "./support.ts";

// A frame holds the reads of its `read` that no enclosing frame holds, so a
// Section over a `combine` draws the failure, the stale line and the paused
// line of any one of its reads, and a Section over a selection of a read its
// Pane already holds draws nothing of that read's: the Pane does.
const ROW = { key: (name: string) => name, title: (name: string) => name };
const BODY = (items: ReturnType<typeof readsAt>["ready"]) => (
	<Group list={{ items, row: ROW }} />
);

export default { title: "Behaviour/Frame holds" } satisfies Meta;

const failed = readsAt("frame-holds/failed");
const stale = readsAt("frame-holds/stale");
const paused = readsAt("frame-holds/paused");
const both = (a: typeof failed.ready, b: typeof failed.ready) =>
	combine([a, b], (x, y) => [...x, ...y]);

export const CombineDrawsAnyReadsState: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections w-sheet max-w-full">
			<Section title="Failed" read={both(failed.ready, failed.failing)}>
				{BODY(failed.ready)}
			</Section>
			<Section title="Stale" read={both(stale.ready, stale.stale)}>
				{BODY(stale.ready)}
			</Section>
			<Section title="Paused" read={both(paused.ready, paused.paused)}>
				{BODY(paused.ready)}
			</Section>
		</div>
	),
	play: async ({ canvas }) => {
		const region = (name: string) => within(sectionOf(canvas, name));
		// One of its reads failed with no data: the failed form with Retry.
		await region("Failed").findByText("This didn't load.");
		await expect(
			region("Failed").getByRole("button", { name: "Retry" }),
		).toBeVisible();
		// The reads that hold data and could not refresh, or wait for a
		// connection, draw their lines under the heading.
		await region("Stale").findByText("Couldn't refresh.");
		await expect(
			region("Stale").getByRole("button", { name: "Retry" }),
		).toBeVisible();
		await region("Paused").findByText("Waiting for a connection.");
		await expect(
			region("Paused").queryByRole("button", { name: "Retry" }),
		).toBeNull();
	},
};

const above = readsAt("frame-holds/above");
const bare = readsAt("frame-holds/bare");

export const SelectionUnderItsHolderDrawsAsToday: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-sections">
			<div className="h-[20rem]" data-testid="held">
				<Place>
					<Pane title="Held" read={above.stale}>
						<Section title="Inner" read={above.stale.at((rows) => rows)}>
							{BODY(above.stale)}
						</Section>
					</Pane>
				</Place>
			</div>
			<div className="h-[20rem]" data-testid="bare">
				<Place>
					<Pane title="Bare">
						<Section title="Inner" read={both(bare.ready, bare.failing)}>
							{BODY(bare.ready)}
						</Section>
					</Pane>
				</Place>
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const held = within(await canvas.findByTestId("held"));
		// The Pane holds the read: its line stands once, and the Section under
		// it, holding nothing, says nothing of it.
		await held.findByText("Couldn't refresh.");
		await expect(held.getAllByText("Couldn't refresh.").length).toBe(1);
		await expect(held.getAllByRole("button", { name: "Retry" }).length).toBe(1);
		await expect(sectionOf(held, "Inner")).not.toHaveAttribute("aria-busy");
		// A Pane with no read holds nothing: the Section holds both its reads and
		// draws the failure in its own place, the Pane's title standing.
		const bareBox = within(await canvas.findByTestId("bare"));
		await bareBox.findByText("This didn't load.");
		await expect(bareBox.getByRole("heading", { name: "Bare" })).toBeVisible();
		await expect(
			within(sectionOf(bareBox, "Inner")).getByText("This didn't load."),
		).toBeVisible();
	},
};
