import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor, within } from "storybook/test";

// A Picker in a FormField is the field's pick: its box stands at the field's
// height with the placeholder in its ink while nothing is chosen, it takes the
// field's error and disabled states, and its touch sheet is titled by the
// field's label.
export default { title: "Behaviour/Picker in a field" } satisfies Meta;

const REGIONS = [
	{ value: "eu", label: "Europe" },
	{ value: "us", label: "United States" },
	{ value: "ap", label: "Asia Pacific" },
];

const ROLES = [
	{ value: "owner", label: "Owner" },
	{ value: "admin", label: "Admin" },
	{ value: "member", label: "Member" },
];

function Region(props: { error?: string; disabled?: boolean }) {
	const [region, setRegion] = useState<string>();
	return (
		<div className="flex w-popover max-w-full flex-col gap-fields">
			<FormField label="Name" input={{ value: "Acme", onChange: () => {} }} />
			<FormField
				label="Default region"
				error={props.error}
				disabled={props.disabled}
				picker={{
					value: region,
					onChange: setRegion,
					options: REGIONS,
					placeholder: "Choose a region",
				}}
			/>
		</div>
	);
}

// The box stands as tall as an input's, draws the placeholder (not the field's
// label) while nothing is chosen, and shows the pick once made.
export const TheFieldBox: StoryObj = {
	render: () => <Region />,
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("combobox", { name: "Default region" });
		await expect(trigger).toHaveTextContent("Choose a region");
		const input = canvas.getByRole("textbox", { name: "Name" });
		await expect(trigger.getBoundingClientRect().height).toBeCloseTo(
			(input.parentElement as HTMLElement).getBoundingClientRect().height,
			1,
		);
		await userEvent.click(trigger);
		await userEvent.click(
			await screen.findByRole("option", { name: "United States" }),
		);
		await waitFor(() => expect(trigger).toHaveTextContent("United States"));
		await expect(trigger).not.toHaveTextContent("Choose a region");
	},
};

// An error draws the box's error edge, as an input's; disabled takes no press.
export const TheFieldsStates: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-fields">
			<div data-testid="error">
				<Region error="Pick a region." />
			</div>
			<div data-testid="off">
				<Region disabled />
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const bad = within(canvas.getByTestId("error"));
		await expect(bad.getByText("Pick a region.")).toBeVisible();
		await expect(
			getComputedStyle(bad.getByRole("combobox", { name: "Default region" }))
				.borderTopColor,
		).not.toBe(
			getComputedStyle(
				within(canvas.getByTestId("off")).getByRole("combobox", {
					name: "Default region",
				}),
			).borderTopColor,
		);
		await expect(
			within(canvas.getByTestId("off")).getByRole("combobox", {
				name: "Default region",
			}),
		).toBeDisabled();
	},
};

function Roles() {
	const [roles, setRoles] = useState<string[]>([]);
	return (
		<div className="w-popover max-w-full">
			<FormField
				label="Allowed roles"
				picker={{
					value: roles,
					onChange: setRoles,
					options: ROLES,
					placeholder: "Choose roles",
				}}
			/>
		</div>
	);
}

// A pick of several in a field shows the placeholder until a value is ticked,
// then one chip per value; the list stays open across the ticks.
export const SeveralInAField: StoryObj = {
	render: () => <Roles />,
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("combobox", { name: "Allowed roles" });
		await expect(trigger).toHaveTextContent("Choose roles");
		await userEvent.click(trigger);
		await userEvent.click(await screen.findByRole("option", { name: "Admin" }));
		await userEvent.click(screen.getByRole("option", { name: "Member" }));
		await expect(screen.getByRole("listbox")).toBeVisible();
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		await expect(canvas.getByText("Admin")).toBeVisible();
		await expect(canvas.getByText("Member")).toBeVisible();
		await expect(trigger).not.toHaveTextContent("Choose roles");
	},
};

const REPOS = Array.from({ length: 1000 }, (_, at) => ({
	value: `r${at}`,
	label: `Repo ${at + 1}`,
}));
const MOST = 60;

function Repo() {
	const [repo, setRepo] = useState("r0");
	return (
		<div className="w-popover max-w-full">
			<FormField
				label="Default repo"
				picker={{ value: repo, onChange: setRepo, options: REPOS }}
			/>
		</div>
	);
}

// A long list in a field windows as a bare picker's does: a few dozen rows
// mount of a thousand, and the arrows carry the highlight through them.
export const LongListWindows: StoryObj = {
	render: () => <Repo />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			canvas.getByRole("combobox", { name: "Default repo" }),
		);
		const list = await screen.findByRole("listbox");
		const options = () => list.querySelectorAll('[role="option"]');
		await waitFor(() => expect(options().length).toBeGreaterThan(0));
		await expect(options().length).toBeLessThan(MOST);
		await expect(options()[0]?.getAttribute("aria-setsize")).toBe("1000");
		// The arrows carry the highlight on through the window.
		for (let step = 1; step <= 40; step++) {
			await userEvent.keyboard("{ArrowDown}");
			await waitFor(() => {
				const lit = list.querySelector("[data-highlighted]");
				expect(lit?.getAttribute("aria-posinset")).toBe(`${step + 1}`);
			});
		}
		await expect(options().length).toBeLessThan(MOST);
	},
};

const TOUCH = {
	tags: ["touch"],
	globals: {
		density: "touch",
		viewport: { value: "narrow", isRotated: false },
	},
	parameters: {
		viewport: {
			options: {
				narrow: {
					name: "Narrow",
					styles: { width: "375px", height: "700px" },
					type: "mobile",
				},
			},
		},
	},
} satisfies StoryObj;

// On touch the pick opens a sheet titled by the field's label, whose rows are
// the field's options.
export const TheSheetTakesTheFieldsLabel: StoryObj = {
	...TOUCH,
	render: () => <Region />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(
			canvas.getByRole("button", { name: "Default region" }),
		);
		const sheet = await screen.findByRole("dialog", {
			name: "Default region",
		});
		await expect(
			within(sheet).getByRole("listbox", { name: "Default region" }),
		).toBeVisible();
		await userEvent.click(
			within(sheet).getByRole("option", { name: "Europe" }),
		);
		await waitFor(() =>
			expect(
				canvas.getByRole("button", { name: "Default region" }),
			).toHaveTextContent("Europe"),
		);
	},
};

// A long list in a field's sheet windows too.
export const LongListWindowsOnTouch: StoryObj = {
	...TOUCH,
	render: () => <Repo />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: "Default repo" }));
		const list = await screen.findByRole("listbox", { name: "Default repo" });
		const options = () => list.querySelectorAll('[role="option"]');
		await waitFor(() => expect(options().length).toBeGreaterThan(0));
		await expect(options().length).toBeLessThan(MOST);
		await expect(options()[0]?.getAttribute("aria-setsize")).toBe("1000");
	},
};
