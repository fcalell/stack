import { Form } from "@fcalell/plugin-react-ui/components/form";
import { ORPCError } from "@orpc/client";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor, within } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";
import { over, through } from "./support.ts";

// A pick in a Form is the field's pick: its box stands at the field's height,
// it takes the field's error and locked states, and its touch sheet is titled
// by the field's label. The pick is a string field given `options`.
export default { title: "Behaviour/Picker in a field" } satisfies Meta;

const REGIONS = [
	{ value: "eu", label: "Europe" },
	{ value: "us", label: "United States" },
	{ value: "ap", label: "Asia Pacific" },
];

const CHANNELS = [
	{ value: "email", label: "Email" },
	{ value: "slack", label: "Slack" },
	{ value: "sms", label: "SMS" },
] as const;

// The keys `forms.submit` needs beside the channels the stories draw.
const GIVEN = {
	workspaceId: "acme",
	title: "Acme",
	kind: "change",
	seats: 1,
	urgent: false,
} as const;
const channels = over(async () => ({ id: "request-1" }));

const placed = through(orpc.forms.place, async () => ({ id: "place-1" }));
const refused = through(orpc.forms.place, () =>
	Promise.reject(
		new ORPCError("BAD_REQUEST", {
			message: "Input validation failed",
			data: { issues: [{ path: ["region"], message: "Pick a region" }] },
		}),
	),
);

function Region(props: { refuse?: boolean; locked?: string }) {
	return (
		<div className="flex w-popover max-w-full flex-col gap-stack">
			<Form
				act={props.refuse ? refused : placed}
				given={{ workspaceId: "acme" }}
				values={{ name: "Acme", region: "eu" }}
				fields={{
					name: { label: "Name" },
					region: {
						label: "Default region",
						locked: props.locked,
						options: REGIONS,
					},
				}}
			/>
		</div>
	);
}

// The box stands as tall as an input's and shows the pick once made.
export const TheFieldBox: StoryObj = {
	render: () => <Region />,
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("combobox", { name: "Default region" });
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
	},
};

// An issue the server refused draws the box's error edge, as an input's; a
// locked field takes no press.
export const TheFieldsStates: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-stack">
			<div data-testid="error">
				<Region refuse />
			</div>
			<div data-testid="off">
				<Region locked="Ask an owner." />
			</div>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		const bad = within(canvas.getByTestId("error"));
		await userEvent.click(bad.getByRole("button", { name: "Save" }));
		await waitFor(() => expect(bad.getByText("Pick a region.")).toBeVisible());
		const off = within(canvas.getByTestId("off")).getByRole("combobox", {
			name: "Default region",
		});
		await expect(
			getComputedStyle(bad.getByRole("combobox", { name: "Default region" }))
				.borderTopColor,
		).not.toBe(getComputedStyle(off).borderTopColor);
		await expect(off).toBeDisabled();
	},
};

function Channels() {
	return (
		<div className="w-popover max-w-full">
			<Form
				act={channels}
				given={GIVEN}
				fields={{ channels: { label: "Channels", options: CHANNELS } }}
			/>
		</div>
	);
}

// A pick of several in a field shows one chip per ticked value; the list stays
// open across the ticks.
export const SeveralInAField: StoryObj = {
	render: () => <Channels />,
	play: async ({ canvas, userEvent }) => {
		const trigger = canvas.getByRole("combobox", { name: /Channels/ });
		await userEvent.click(trigger);
		await userEvent.click(await screen.findByRole("option", { name: "Slack" }));
		await userEvent.click(screen.getByRole("option", { name: "SMS" }));
		// Open across both ticks: the layer's fade in may still be under way.
		await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		await expect(canvas.getByText("Slack")).toBeVisible();
		await expect(canvas.getByText("SMS")).toBeVisible();
	},
};

const REPOS = Array.from({ length: 1000 }, (_, at) => ({
	value: `r${at}`,
	label: `Repo ${at + 1}`,
}));
const MOST = 60;

function Repo() {
	return (
		<div className="w-popover max-w-full">
			<Form
				act={placed}
				given={{ workspaceId: "acme", name: "Acme" }}
				values={{ region: "r0" }}
				fields={{ region: { label: "Default repo", options: REPOS } }}
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
	tags: ["touch"],
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
	tags: ["touch"],
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

// The list is a popover, at the popover's width (215 to 300 in the pattern),
// whatever the width of the box that opens it: a field in a 640 sheet opens the
// same list as one in a 240 column.
function Wide(props: { width: number }) {
	return (
		<div style={{ width: props.width }} className="max-w-full">
			<Form
				act={placed}
				given={{ workspaceId: "acme", name: "Acme" }}
				fields={{ region: { label: "Default region", options: REGIONS } }}
			/>
		</div>
	);
}

function listWidth(width: number): StoryObj {
	return {
		render: () => <Wide width={width} />,
		play: async ({ canvas, userEvent }) => {
			const trigger = canvas.getByRole("combobox", { name: "Default region" });
			await userEvent.click(trigger);
			const list = await screen.findByRole("listbox");
			// The popup is the nearest ancestor that draws the float's shadow.
			let box: HTMLElement | null = list;
			while (box && getComputedStyle(box).boxShadow === "none")
				box = box.parentElement;
			if (!box) throw new Error("the list has no popup");
			await waitFor(() =>
				expect(box?.getBoundingClientRect().width).toBeLessThanOrEqual(300),
			);
			await expect(box.getBoundingClientRect().width).toBeGreaterThanOrEqual(
				215,
			);
		},
	};
}

export const ListWidthInASheet = listWidth(596);
export const ListWidthInAColumn = listWidth(240);
