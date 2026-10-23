import { read } from "@fcalell/plugin-api/tanstack-query";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Toolbar } from "@fcalell/plugin-react-ui/components/toolbar";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";
import { through } from "./support.ts";

// A control given options as a selection paints its trigger while they wait,
// and holds their read itself: once it has ended it says so in its own line
// under the control, the trigger inert, whether or not a frame stands above.
// A read nothing asked for paints still, with no sentence.
const CHOICES = [
	{ value: "eu", label: "Europe" },
	{ value: "us", label: "United States" },
];

let made = 0;
// A read that rejects until `heal`, then answers the choices.
function healing() {
	const state = { healed: false };
	const options = read({
		queryKey: ["options-state", made++],
		queryFn: async () => {
			if (!state.healed) throw new Error("Not yet.");
			return CHOICES;
		},
		retry: false,
		staleTime: Number.POSITIVE_INFINITY,
	});
	return { state, options };
}

const failing = healing();
const idle = read({
	queryKey: ["options-state", "idle"],
	queryFn: () => Promise.resolve(CHOICES),
	enabled: false,
});
const gone = read(
	{
		queryKey: ["options-state", "gone"],
		queryFn: () => Promise.reject(new Error("Gone.")),
		retry: false,
	},
	{ missing: () => true },
);

export default { title: "Behaviour/Options state" } satisfies Meta;

// A Picker in a toolbar, outside any frame, says its options did not load and
// offers Retry, which refetches them; the picker then opens on the rows.
export const APickerOutsideAnyFrameSaysItsOptionsFailed: StoryObj = {
	render: () => (
		<Toolbar>
			<Picker
				label="Region"
				options={failing.options}
				value="eu"
				onChange={fn()}
			/>
		</Toolbar>
	),
	play: async ({ canvas, userEvent }) => {
		await canvas.findByText("This didn't load.");
		const trigger = canvas.getByRole("combobox", { name: /Region/ });
		await expect(trigger.closest("[inert]")).not.toBeNull();
		failing.state.healed = true;
		await userEvent.click(canvas.getByRole("button", { name: "Retry" }));
		await waitFor(() =>
			expect(canvas.queryByText("This didn't load.")).toBeNull(),
		);
		await waitFor(() => expect(trigger.closest("[inert]")).toBeNull());
		await expect(trigger).toHaveTextContent("Europe");
	},
};

// Options nothing has asked for paint the trigger still and say nothing; a
// missing read says `missing`, with nothing to retry.
export const IdleOptionsPaintStillAndMissingOnesSayMissing: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-section">
			<div data-testid="idle">
				<Picker label="Idle" options={idle} value="eu" onChange={fn()} />
			</div>
			<div data-testid="gone">
				<Picker label="Gone" options={gone} value="eu" onChange={fn()} />
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		const gone = within(await canvas.findByTestId("gone"));
		await gone.findByText("Couldn't find this.");
		await expect(gone.queryByRole("button", { name: "Retry" })).toBeNull();
		const still = within(canvas.getByTestId("idle"));
		await expect(still.queryByText("This didn't load.")).toBeNull();
		await expect(still.queryByText("Couldn't find this.")).toBeNull();
		await expect(
			still.getByRole("combobox", { name: /Idle/ }).closest("[inert]"),
		).not.toBeNull();
	},
};

const picking = healing();
const placed = through(orpc.forms.place, async () => ({ id: "place-1" }));
const listing = healing();

// A form's pick and a list Picker over failed options say it in their own line.
export const AFormsPickAndAnOptionListSayTheirOptionsFailed: StoryObj = {
	render: () => (
		<div className="flex flex-col gap-section">
			<div data-testid="pick">
				<Form
					act={placed}
					given={{ workspaceId: "acme", name: "Acme" }}
					values={{ region: "eu" }}
					fields={{ region: { label: "Region", options: picking.options } }}
				/>
			</div>
			<div data-testid="list">
				<Picker
					fit="list"
					label="Options"
					items={listing.options}
					option={{
						value: (choice) => choice.value,
						label: (choice) => choice.label,
					}}
					value="eu"
					onChange={fn()}
				/>
			</div>
		</div>
	),
	play: async ({ canvas }) => {
		for (const id of ["pick", "list"]) {
			const box = within(await canvas.findByTestId(id));
			await box.findByText("This didn't load.");
			await expect(box.getByRole("button", { name: "Retry" })).toBeVisible();
		}
	},
};
