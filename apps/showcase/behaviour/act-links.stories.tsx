import { read } from "@fcalell/plugin-api/tanstack-query";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen } from "storybook/test";

// A link stands wherever an act is taken: a Pane's actions, a Section's empty
// act and a Picker's act that makes a new option, each an anchor to its route;
// a link with a `blocked` reason draws inert and says why, as a blocked act does.
export default {
	title: "Behaviour/Act links",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

const none = read({
	queryKey: ["act-links", "none"],
	queryFn: async () => [],
});

// A Pane's icon actions take a link beside an act that runs.
export const PaneActionsTakeALink: StoryObj = {
	render: () => (
		<Place>
			<Pane
				title="Requests"
				actions={[
					{ icon: "Plus", label: "New request", href: "/requests/new" },
					{ icon: "Download", label: "Export", onAct: () => {} },
				]}
			/>
		</Place>
	),
	play: async ({ canvas }) => {
		const link = await canvas.findByRole("link", { name: "New request" });
		await expect(link.getAttribute("href")).toBe("/requests/new");
		await expect(
			await canvas.findByRole("button", { name: "Export" }),
		).toBeVisible();
	},
};

// A blocked link is no anchor: it stands inert, as a blocked act does.
export const ABlockedLinkIsInert: StoryObj = {
	render: () => (
		<Place>
			<Pane
				title="Requests"
				actions={[
					{
						icon: "Footprints",
						label: "Walk",
						href: "/walk",
						blocked: "The page is missing.",
					},
				]}
			/>
		</Place>
	),
	play: async ({ canvas }) => {
		const walk = await canvas.findByRole("button", { name: "Walk" });
		await expect(canvas.queryByRole("link", { name: "Walk" })).toBeNull();
		await expect(walk).toHaveAttribute("aria-disabled", "true");
	},
};

// A Section's empty state, over a description, offers a link.
export const SectionEmptyActCanGo: StoryObj = {
	render: () => (
		<Place>
			<Pane title="Requests">
				<Section
					title="Queue"
					description="What waits on you."
					read={none}
					empty={{ act: { label: "File a request", href: "/requests/new" } }}
				/>
			</Pane>
		</Place>
	),
	play: async ({ canvas }) => {
		const link = await canvas.findByRole("link", { name: "File a request" });
		await expect(link.getAttribute("href")).toBe("/requests/new");
	},
};

// A Picker's act that makes a new option is a link to where it is made.
export const PickerActCanGo: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Picker
				label="Organization"
				options={[{ value: "acme", label: "Acme" }]}
				value="acme"
				onChange={() => {}}
				act={{
					icon: "Plus",
					label: "New organization",
					href: "/organizations/new",
				}}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			await canvas.findByRole("combobox", { name: "Organization" }),
		);
		const link = await screen.findByRole("link", { name: "New organization" });
		await expect(link.getAttribute("href")).toBe("/organizations/new");
	},
};
