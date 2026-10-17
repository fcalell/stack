import { ItemHeader } from "@fcalell/plugin-react-ui/components/item-header";
import { Menu } from "@fcalell/plugin-react-ui/components/menu";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor } from "storybook/test";

// The document rules the a11y run leaves off for a frame (the preview lists
// them) stand on in these stories: the three below are what they guard, and
// the rest of the run keeps its defaults, so a story here fails on a region
// without a unique name, a page with no h1 and a popup outside every landmark.
const RULES = ["landmark-unique", "page-has-heading-one", "region"];
const CHECKED = {
	a11y: {
		config: {
			rules: [
				...RULES.map((id) => ({ id, enabled: true })),
				...["bypass", "heading-order"].map((id) => ({ id, enabled: false })),
			],
		},
	},
};

const PLACES: PlaceSpec[] = [{ route: "/work", label: "Work", icon: "House" }];

export default {
	title: "Behaviour/Landmarks",
	parameters: { layout: "fullscreen", ...CHECKED },
} satisfies Meta;

// A record and a run beside it are both titled after the unit; each Pane's
// region is named by its overline too ("Run Fix login"), so the two differ.
export const SameTitle: StoryObj = {
	render: () => (
		<Shell places={PLACES}>
			<Place>
				<Pane title="Fix login">
					<ItemHeader overline={["Request"]} />
				</Pane>
				<Pane title="Fix login">
					<ItemHeader overline={["Run"]} />
				</Pane>
			</Place>
		</Shell>
	),
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByRole("region", { name: "Request Fix login" }),
		).toBeVisible();
		await expect(
			canvas.getByRole("region", { name: "Run Fix login" }),
		).toBeVisible();
	},
};

// A Pane with no overline keeps its title as its name.
export const TitleAlone: StoryObj = {
	render: () => (
		<Shell places={PLACES}>
			<Place>
				<Pane title="Settings" />
			</Place>
		</Shell>
	),
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByRole("region", { name: "Settings" }),
		).toBeVisible();
	},
};

const gone = readsAt("landmarks").missing;

// A record that is not there fills its page with the Missing form, whose
// sentence is the page's h1: the record's title never lands.
export const MissingIsTheHeading: StoryObj = {
	render: () => (
		<Shell places={PLACES}>
			<Place>
				<Pane title={gone.at(() => "Record")} read={gone}>
					<p>The record.</p>
				</Pane>
			</Place>
		</Shell>
	),
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByRole("heading", {
				level: 1,
				name: "This no longer exists.",
			}),
		).toBeVisible();
	},
};

// An open menu's popup stands inside the Shell's main landmark.
export const MenuOpenStaysInMain: StoryObj = {
	render: () => (
		<Shell places={PLACES}>
			<Place>
				<Pane title="Workflow">
					<Menu
						label="More"
						items={[
							{ label: "Duplicate", onAct: () => {} },
							{ label: "Delete", onAct: () => {}, destructive: true },
						]}
					/>
				</Pane>
			</Place>
		</Shell>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(await canvas.findByRole("button", { name: "More" }));
		const menu = await screen.findByRole("menu");
		await waitFor(() => expect(menu.closest("main")).not.toBeNull());
	},
};
