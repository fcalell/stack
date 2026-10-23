import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor } from "storybook/test";

const pressed = fn();

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

// A record's overline is visible text beside its title, not part of its
// region's name: the name is the title alone ("Product detail", never "Page
// Product detail").
export const OverlineIsNotTheName: StoryObj = {
	render: () => (
		<Shell places={PLACES}>
			<Pane
				title="Product detail"
				record={{ within: "Catalog", overline: ["Page"] }}
			/>
		</Shell>
	),
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByRole("region", { name: "Product detail" }),
		).toBeVisible();
		await expect(canvas.getByText("Page")).toBeVisible();
	},
};

// A Pane with no overline keeps its title as its name.
export const TitleAlone: StoryObj = {
	render: () => (
		<Shell places={PLACES}>
			<Pane title="Settings" />
		</Shell>
	),
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByRole("region", { name: "Settings" }),
		).toBeVisible();
	},
};

const gone = readsAt("landmarks").missing;

// A record that is not there fills its page with the missing form, whose
// sentence is the page's h1: the record's title never lands.
export const MissingIsTheHeading: StoryObj = {
	render: () => (
		<Shell places={PLACES}>
			<Pane title={gone.at(() => "Record")} read={gone}>
				<p>The record.</p>
			</Pane>
		</Shell>
	),
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByRole("heading", {
				level: 1,
				name: "Couldn't find this.",
			}),
		).toBeVisible();
	},
};

// A missing record with a Pane after it names its column at the Pane's level:
// its sentence is an h2, and the Pane after it holds the page's one h1.
export const MissingBesideIsAnH2: StoryObj = {
	render: () => (
		<Shell places={PLACES}>
			<Pane title={gone.at(() => "Record")} read={gone}>
				<p>The record.</p>
			</Pane>
			<Pane title="Detail" />
		</Shell>
	),
	play: async ({ canvas, canvasElement }) => {
		await expect(
			await canvas.findByRole("heading", {
				level: 2,
				name: "Couldn't find this.",
			}),
		).toBeVisible();
		await expect(
			canvas.getByRole("heading", { level: 1, name: "Detail" }),
		).toBeVisible();
		await expect(canvasElement.querySelectorAll("h1")).toHaveLength(1);
	},
};

// An open menu's popup stands inside the Shell's main landmark.
export const MenuOpenStaysInMain: StoryObj = {
	render: () => (
		<Shell places={PLACES}>
			<Pane title="Workflow">
				<Section
					title="Team"
					more={[
						{ label: "Duplicate", onAct: pressed },
						{ label: "Delete", onAct: pressed, destructive: true },
					]}
				/>
			</Pane>
		</Shell>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			await canvas.findByRole("button", { name: "More Team" }),
		);
		const menu = await screen.findByRole("menu");
		await waitFor(() => expect(menu.closest("main")).not.toBeNull());
	},
};
