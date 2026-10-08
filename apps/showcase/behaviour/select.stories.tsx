import { Field } from "@base-ui/react/field";
import { Select } from "@fcalell/plugin-react-ui/components/select";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, waitFor } from "storybook/test";
import { focused } from "./support.ts";

const REGIONS = [
	{ value: "eu-central-1", label: "Frankfurt" },
	{ value: "eu-west-1", label: "Ireland" },
	{ value: "us-east-1", label: "Virginia" },
	{ value: "us-west-2", label: "Oregon" },
];

function Region() {
	const [region, setRegion] = useState("eu-central-1");
	return (
		<Field.Root>
			<Field.Label nativeLabel={false} render={<div />}>
				Region
			</Field.Label>
			<Select value={region} onChange={setRegion} options={REGIONS} />
		</Field.Root>
	);
}

export default {
	title: "Behaviour/Select",
	render: () => <Region />,
} satisfies Meta;

// A listbox takes focus when it opens, moves by the arrow keys and typeahead,
// Enter picks, and Escape closes it and returns focus to the trigger.
export const Listbox: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("combobox");
		await userEvent.click(trigger);
		const list = await screen.findByRole("listbox");
		await waitFor(() => expect(list).toContainElement(focused()));
		const options = screen.getAllByRole("option");
		await expect(options[0]).toHaveAttribute("aria-selected", "true");
		await userEvent.keyboard("{ArrowDown}");
		await waitFor(() => expect(options[1]).toHaveAttribute("data-highlighted"));
		await userEvent.keyboard("v");
		await waitFor(() => expect(options[2]).toHaveAttribute("data-highlighted"));
		await userEvent.keyboard("{Enter}");
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		await expect(trigger).toHaveTextContent("Virginia");
		await waitFor(() => expect(trigger).toHaveFocus());
		await userEvent.click(trigger);
		await screen.findByRole("listbox");
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		await waitFor(() => expect(trigger).toHaveFocus());
	},
};

const REGIONS_BLOCKED = [
	{ value: "eu-central-1", label: "Frankfurt" },
	{ value: "eu-west-1", label: "Ireland", blocked: "Full until June" },
	{ value: "us-east-1", label: "Virginia", blocked: "Not offered" },
	{ value: "us-west-2", label: "Oregon" },
];

function Blocked(props: { width: number }) {
	const [region, setRegion] = useState("us-east-1");
	return (
		<div style={{ width: props.width, maxWidth: "100%" }}>
			<Field.Root>
				<Field.Label nativeLabel={false} render={<div />}>
					Region
				</Field.Label>
				<Select value={region} onChange={setRegion} options={REGIONS_BLOCKED} />
			</Field.Root>
		</div>
	);
}

// A blocked option shows its reason in the disabled ink in a two-line row,
// picks nothing by pointer or key (Base UI's select lets the arrows reach a
// disabled option, as a menu does); the blocked option in the
// value is drawn and operable as a chosen one, with no reason.
function blocks(width: number): StoryObj {
	return {
		render: () => <Blocked width={width} />,
		play: async ({ canvas, userEvent }) => {
			const trigger = canvas.getByRole("combobox");
			await expect(trigger).toHaveTextContent("Virginia");
			await userEvent.click(trigger);
			const list = await screen.findByRole("listbox");
			const [frankfurt, ireland, virginia, oregon] =
				screen.getAllByRole("option");
			await expect(ireland).toHaveAttribute("aria-disabled", "true");
			await expect(virginia).not.toHaveAttribute("aria-disabled");
			await expect(virginia).toHaveAttribute("aria-selected", "true");
			await expect(screen.queryByText("Not offered")).toBeNull();
			const reason = screen.getByText("Full until June");
			await expect(getComputedStyle(reason).color).not.toBe(
				getComputedStyle(screen.getByText("Frankfurt")).color,
			);
			await expect(ireland?.getBoundingClientRect().height).toBeGreaterThan(
				frankfurt?.getBoundingClientRect().height ?? 0,
			);
			await waitFor(() => expect(list).toContainElement(focused()));
			await userEvent.keyboard("{ArrowUp}");
			await waitFor(() => expect(ireland).toHaveAttribute("data-highlighted"));
			await userEvent.keyboard("{Enter}");
			await expect(screen.getByRole("listbox")).toBeInTheDocument();
			await expect(trigger).toHaveTextContent("Virginia");
			await userEvent.click(ireland as HTMLElement);
			await expect(screen.getByRole("listbox")).toBeInTheDocument();
			await expect(trigger).toHaveTextContent("Virginia");
			await userEvent.click(oregon as HTMLElement);
			await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
			await expect(trigger).toHaveTextContent("Oregon");
			await userEvent.click(trigger);
			await screen.findByText("Not offered");
		},
	};
}

export const Blocked320 = blocks(320);
export const Blocked1440 = blocks(1440);

// The list is a popover wide whatever the trigger's width, and no label in it
// clips.
export const ListIsPopoverWide: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("combobox"));
		const list = await screen.findByRole("listbox");
		const popup = list.closest("[data-side]") ?? list;
		const popover = Number.parseFloat(
			getComputedStyle(document.documentElement).getPropertyValue(
				"--container-popover",
			),
		);
		expect(popup.getBoundingClientRect().width).toBeGreaterThanOrEqual(
			popover - 1,
		);
		for (const option of screen.getAllByRole("option")) {
			const label = option.firstElementChild?.firstElementChild;
			if (label) {
				expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth);
			}
		}
	},
};
