import { Group } from "@fcalell/plugin-react-ui/components/group";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { sectionOf } from "./support.ts";

// A collection is a frame of its items: its failed, missing and empty forms
// come from its own selection alone, in its own box, with the generic
// sentences, whatever stands above it. A frame above that holds the same read
// unmounts it when the read fails, and draws the failure alone.
const ROW = { key: (name: string) => name, title: (name: string) => name };
const COLUMNS = [{ key: "name", label: "Name", cell: (name: string) => name }];
const TABLE_ROW = { id: (name: string) => name };

export default { title: "Behaviour/Collections" } satisfies Meta;

const alone = readsAt("collections/alone");

export const StandaloneListFailsInItsBoxBelowAToolbar: StoryObj = {
	render: () => (
		<div className="h-[24rem]">
			<Place>
				<Pane title="Members">
					<Toolbar
						search={{ value: "", onChange: () => {}, placeholder: "Search" }}
					/>
					<List items={alone.failing} row={ROW} />
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas }) => {
		await canvas.findByText("This didn't load.");
		// The toolbar stands; the list's box holds the failure and its Retry.
		await expect(canvas.getByPlaceholderText("Search")).toBeVisible();
		await expect(canvas.getByRole("button", { name: "Retry" })).toBeVisible();
	},
};

const above = readsAt("collections/above");

export const ListUnderAFrameHoldingItsReadIsUnmountedWithIt: StoryObj = {
	render: () => (
		<div className="h-[24rem]">
			<Place>
				<Pane title="Held">
					<Section title="Inner" read={above.failing}>
						<List items={above.failing} row={ROW} />
						<Group list={{ items: above.failing, row: ROW }} />
						<Table items={above.failing} columns={COLUMNS} row={TABLE_ROW} />
					</Section>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas }) => {
		await canvas.findByText("This didn't load.");
		// The Section alone draws the flags: one failure, one Retry.
		await expect(canvas.getAllByText("This didn't load.").length).toBe(1);
		await expect(canvas.getAllByRole("button", { name: "Retry" }).length).toBe(
			1,
		);
	},
};

const sides = readsAt("collections/sides");

export const SiblingCollectionsEachDrawTheirOwnForm: StoryObj = {
	render: () => (
		<div className="h-[48rem]">
			<Place>
				<Pane title="Forms">
					<Section title="Failed">
						<Group list={{ items: sides.failing, row: ROW }} />
					</Section>
					<Section title="Missing">
						<List items={sides.missing} row={ROW} />
					</Section>
					<Section title="Table">
						<Table items={sides.failing} columns={COLUMNS} row={TABLE_ROW} />
					</Section>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas }) => {
		const failed = within(sectionOf(canvas, "Failed"));
		await failed.findByText("This didn't load.");
		await expect(failed.getByRole("button", { name: "Retry" })).toBeVisible();
		const missing = within(sectionOf(canvas, "Missing"));
		await missing.findByText("This no longer exists.");
		const table = within(sectionOf(canvas, "Table"));
		await table.findByText("This didn't load.");
		await expect(table.getByRole("button", { name: "Retry" })).toBeVisible();
	},
};

const emptied = readsAt("collections/empty");

export const EmptyCollectionDrawsTheGenericSentenceWhateverStandsAbove: StoryObj =
	{
		render: () => (
			<div className="h-[48rem]">
				<Place>
					<Pane title="Empty">
						<Section title="List">
							<List items={emptied.empty} row={ROW} />
						</Section>
						<Section title="Group">
							<Group list={{ items: emptied.empty, row: ROW }} />
						</Section>
						<Section title="Table">
							<Table items={emptied.empty} columns={COLUMNS} row={TABLE_ROW} />
						</Section>
						<Section title="Under a read" read={emptied.ready}>
							<List items={emptied.empty} row={ROW} />
						</Section>
					</Pane>
				</Place>
			</div>
		),
		play: async ({ canvas }) => {
			for (const name of ["List", "Group", "Table", "Under a read"]) {
				const section = within(sectionOf(canvas, name));
				await section.findByText("Nothing here yet.");
			}
		},
	};

const stale = readsAt("collections/stale");
const paused = readsAt("collections/paused");

export const HeldCollectionDrawsItsStaleAndPausedLineAboveItsRows: StoryObj = {
	render: () => (
		<div className="h-[48rem]">
			<Place>
				<Pane title="Lines">
					<Section title="Stale">
						<List items={stale.stale} row={ROW} />
					</Section>
					<Section title="Paused">
						<Group list={{ items: paused.paused, row: ROW }} />
					</Section>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas }) => {
		const lines = within(sectionOf(canvas, "Stale"));
		await lines.findByText("Couldn't refresh.");
		await expect(lines.getByRole("button", { name: "Retry" })).toBeVisible();
		// The rows stand under it.
		await expect(lines.getByText("Ana Ruiz")).toBeVisible();
		const paused = within(sectionOf(canvas, "Paused"));
		await paused.findByText("Waiting for a connection.");
		await expect(paused.getByText("Ana Ruiz")).toBeVisible();
	},
};
