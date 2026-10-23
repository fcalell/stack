import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import { Slider } from "@fcalell/plugin-react-ui/components/slider";
import { Stats } from "@fcalell/plugin-react-ui/components/stats";
import { Switch } from "@fcalell/plugin-react-ui/components/switch";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";

// The options a pick reads its value's type from: the value is the setting's text.
const REGIONS: { value: string; label: string }[] = [
	{ value: "eu", label: "Europe" },
	{ value: "us", label: "United States" },
];

// A control whose value is a selection over a read that ended (failed or
// missing) stands with no value (no switch position, no segment, an empty
// pick, an empty meter) and is blocked like an ended act: a press or a
// keystroke changes nothing and says `readFailed` (`missing`) where the
// control already says a refused save: a toast. Nothing about the box moves.
export default {
	title: "Behaviour/Ended controls",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

const PLACES: PlaceSpec[] = [
	{ route: "/overview", label: "Overview", icon: "House" },
];

function Page(props: { children: ReactNode }) {
	return (
		<Shell places={PLACES}>
			<Pane title="Settings">{props.children}</Pane>
		</Shell>
	);
}

// A failed toast is hidden from the tree until it is focused, its acts
// included, so axe's `aria-hidden-focus` flags them.
const TOASTING = {
	a11y: {
		config: { rules: [{ id: "aria-hidden-focus", enabled: false }] },
	},
};

const FAILED = "This didn't load.";
const GONE = "Couldn't find this.";
const CHOICES = [
	{ value: "day", label: "Day" },
	{ value: "week", label: "Week" },
];

// A selection over the read of the key's state; nothing answers it.
const at = (key: string, state: "failing" | "missing" = "failing") =>
	readsAt(`ended-controls/${key}`)[state];

const flagOf = (key: string, state?: "failing" | "missing") =>
	at(key, state).at((rows) => rows.length > 0);
const textOf = (key: string) => at(key).at((rows) => rows.join(", "));
const numberOf = (key: string) => at(key).at((rows) => rows.length);

// The control is live (not painted) once its read ended.
const ended = (control: () => HTMLElement) =>
	waitFor(() => expect(control()).not.toHaveAttribute("inert"));

// The press said why where a bare control says a refusal.
// Pressing on leaves the toast standing as it is, not a stack of them.
const stands = () => screen.queryAllByText(FAILED).length;
const once = async (more: () => Promise<unknown>) => {
	const before = stands();
	await more();
	await new Promise((done) => setTimeout(done, 200));
	await expect(stands()).toBe(before);
};

const toasted = async (sentence = FAILED) =>
	expect((await screen.findAllByText(sentence)).length).toBeGreaterThan(0);

const flipped = fn();
export const SwitchOverAFailedReadStandsOffAndSaysWhy: StoryObj = {
	parameters: TOASTING,
	render: () => (
		<Page>
			<Switch label="Notify" checked={flagOf("switch")} onChange={flipped} />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const flip = () => canvas.getByRole("switch", { name: "Notify" });
		await ended(flip);
		await expect(flip()).toHaveAttribute("aria-checked", "false");
		await expect(screen.queryByText(FAILED)).toBeNull();
		await userEvent.click(flip());
		await toasted();
		await expect(flip()).toHaveAttribute("aria-checked", "false");
		await expect(flipped).not.toHaveBeenCalled();
	},
};

const switched = fn();
export const SwitchOverAMissingReadSaysItIsGone: StoryObj = {
	parameters: TOASTING,
	render: () => (
		<Page>
			<Switch
				label="Notify"
				checked={flagOf("switch-missing", "missing")}
				onChange={switched}
			/>
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const flip = () => canvas.getByRole("switch", { name: "Notify" });
		await ended(flip);
		await userEvent.click(flip());
		await toasted(GONE);
		await expect(flip()).toHaveAttribute("aria-checked", "false");
		await expect(switched).not.toHaveBeenCalled();
	},
};

const boxed = fn();
export const CheckboxOverAFailedReadStandsEmptyAndSaysWhy: StoryObj = {
	parameters: TOASTING,
	render: () => (
		<Page>
			<Switch label="Agree" checked={flagOf("checkbox")} onChange={boxed} />
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const box = () => canvas.getByRole("checkbox", { name: "Agree" });
		await ended(box);
		await expect(box()).toHaveAttribute("aria-checked", "false");
		await userEvent.click(box());
		await toasted();
		await expect(box()).toHaveAttribute("aria-checked", "false");
		await expect(boxed).not.toHaveBeenCalled();
	},
};

const segmented = fn();
export const SegmentedControlOverAFailedReadChoosesNothing: StoryObj = {
	parameters: TOASTING,
	render: () => (
		<Page>
			<Picker
				fit="segments"
				label="Period"
				options={CHOICES}
				value={textOf("segments")}
				onChange={segmented}
			/>
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const group = () => canvas.getByRole("radiogroup", { name: "Period" });
		await ended(group);
		await expect(
			canvas.queryAllByRole("radio", { checked: true }),
		).toHaveLength(0);
		await userEvent.click(canvas.getByRole("radio", { name: "Week" }));
		await toasted();
		await expect(
			canvas.queryAllByRole("radio", { checked: true }),
		).toHaveLength(0);
		await expect(segmented).not.toHaveBeenCalled();
	},
};

const slid = fn();
export const SliderOverAFailedReadHasNoValueAndSaysWhy: StoryObj = {
	parameters: TOASTING,
	render: () => (
		<Page>
			<Slider
				label="Level"
				value={numberOf("slider")}
				onChange={slid}
				min={0}
				max={10}
			/>
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const thumb = () => canvas.getByRole("slider");
		await waitFor(() => expect(thumb().closest("[inert]")).toBeNull());
		await expect(thumb()).toHaveAttribute("aria-valuenow", "0");
		await userEvent.click(thumb());
		await userEvent.keyboard("{ArrowRight}");
		await toasted();
		await once(() => userEvent.keyboard("{ArrowRight}{ArrowRight}"));
		await expect(thumb()).toHaveAttribute("aria-valuenow", "0");
		await expect(slid).not.toHaveBeenCalled();
	},
};

const typed = fn();
export const InputOverAFailedReadIsEmptyAndTakesNoKeystroke: StoryObj = {
	parameters: TOASTING,
	render: () => (
		<Page>
			<Input
				kind="text"
				placeholder="Name"
				value={textOf("input")}
				onChange={typed}
			/>
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const box = () => canvas.getByPlaceholderText("Name");
		await waitFor(() => expect(box().closest("[inert]")).toBeNull());
		await expect(box()).toHaveValue("");
		await userEvent.click(box());
		await userEvent.keyboard("a");
		await toasted();
		await once(() => userEvent.keyboard("bc"));
		// Once the toast has left, the next keystroke says it again.
		await waitFor(() => expect(stands()).toBe(0), { timeout: 9000 });
		await userEvent.keyboard("d");
		await toasted();
		await expect(box()).toHaveValue("");
		await expect(typed).not.toHaveBeenCalled();
	},
};

const written = fn();
export const TextAreaOverAFailedReadIsEmptyAndTakesNoKeystroke: StoryObj = {
	parameters: TOASTING,
	render: () => (
		<Page>
			<Input
				kind="prose"
				placeholder="About"
				value={textOf("text-area")}
				onChange={written}
			/>
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const box = () => canvas.getByPlaceholderText("About");
		await waitFor(() => expect(box().closest("[inert]")).toBeNull());
		await expect(box()).toHaveValue("");
		await userEvent.click(box());
		await userEvent.keyboard("a");
		await toasted();
		await once(() => userEvent.keyboard("bc"));
		await expect(box()).toHaveValue("");
		await expect(written).not.toHaveBeenCalled();
	},
};

const picked = fn();
export const PickerOverAFailedReadIsEmptyAndOpensNothing: StoryObj = {
	parameters: TOASTING,
	render: () => (
		<Page>
			<Picker
				label="Region"
				options={REGIONS}
				value={textOf("picker")}
				onChange={picked}
			/>
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		const trigger = () => canvas.getByRole("combobox", { name: "Region" });
		await ended(trigger);
		await expect(trigger()).toHaveTextContent("Region");
		await userEvent.click(trigger());
		await toasted();
		await expect(screen.queryByRole("listbox")).toBeNull();
		await expect(screen.queryByRole("option")).toBeNull();
		await expect(picked).not.toHaveBeenCalled();
	},
};

export const MeterOverAFailedReadStandsEmpty: StoryObj = {
	render: () => (
		<Page>
			<Stats
				items={[{ label: "Quota", value: numberOf("meter"), bound: 100 }]}
			/>
		</Page>
	),
	play: async ({ canvas }) => {
		await waitFor(() => expect(canvas.getByText("Quota")).toBeVisible());
		await waitFor(() => expect(document.querySelector("[inert]")).toBeNull());
		await expect(canvas.queryByRole("meter")).toBeNull();
		await expect(canvas.queryByText(/%/)).toBeNull();
	},
};

const chosen = fn();
export const ListOverAFailedReadChoosesNothing: StoryObj = {
	parameters: TOASTING,
	render: () => (
		<Page>
			<Picker
				fit="list"
				label="Period"
				options={CHOICES}
				value={textOf("list")}
				onChange={chosen}
			/>
		</Page>
	),
	play: async ({ canvas, userEvent }) => {
		await waitFor(() =>
			expect(
				canvas.getByRole("radio", { name: "Day" }).closest("label"),
			).not.toHaveAttribute("inert"),
		);
		await userEvent.click(canvas.getByRole("radio", { name: "Week" }));
		await toasted();
		await expect(
			canvas.queryAllByRole("radio", { checked: true }),
		).toHaveLength(0);
		await expect(chosen).not.toHaveBeenCalled();
	},
};

// Every control over a failed read in one column, for a look at the box that
// stands empty.
export const EveryControlOverAFailedRead: StoryObj = {
	parameters: TOASTING,
	render: () => (
		<Page>
			<Switch label="Notify" checked={flagOf("all-switch")} onChange={fn()} />
			<Switch label="Agree" checked={flagOf("all-checkbox")} onChange={fn()} />
			<Picker
				fit="segments"
				label="Period"
				options={CHOICES}
				value={textOf("all-segments")}
				onChange={fn()}
			/>
			<Slider
				label="Level"
				value={numberOf("all-slider")}
				onChange={fn()}
				min={0}
				max={10}
			/>
			<Input
				kind="text"
				placeholder="Name"
				value={textOf("all-input")}
				onChange={fn()}
			/>
			<Input
				kind="prose"
				placeholder="About"
				value={textOf("all-text-area")}
				onChange={fn()}
			/>
			<Picker
				label="Region"
				options={REGIONS}
				value={textOf("all-picker")}
				onChange={fn()}
			/>
			<Stats
				items={[{ label: "Quota", value: numberOf("all-meter"), bound: 100 }]}
			/>
			<Section
				items={[
					{
						label: "Alerts",
						switch: { checked: flagOf("all-row-switch"), onChange: fn() },
					},
				]}
			/>
		</Page>
	),
};
