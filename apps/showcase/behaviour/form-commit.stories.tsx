import { Form } from "@fcalell/plugin-react-ui/components/form";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, waitFor } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";
import { through } from "./support.ts";

const sent = fn();
const closed = fn();
const saved = through(orpc.forms.save, async (input) => {
	sent(input);
	return { id: "settings-1" };
});

const GIVEN = { workspaceId: "acme" };

// A form that commits by field draws no bar: each field sends `given` and its
// own key once its control commits.
export default {
	title: "Behaviour/Form commit",
	parameters: { layout: "fullscreen" },
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={saved}
				given={GIVEN}
				commit="field"
				fields={{
					name: { label: "Workspace name" },
					notify: { label: "Notify" },
					digest: { label: "Digest", locked: "Only owners change it." },
				}}
			/>
		</div>
	),
} satisfies Meta;

export const NoBarAndATextSendsOnBlur: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		const name = await canvas.findByRole("textbox", {
			name: /Workspace name/,
		});
		await expect(canvas.queryByRole("button", { name: "Save" })).toBeNull();
		await userEvent.type(name, "Acme");
		await expect(sent).not.toHaveBeenCalled();
		await userEvent.tab();
		await waitFor(() =>
			expect(sent).toHaveBeenCalledWith({ ...GIVEN, name: "Acme" }),
		);
	},
};

export const ASwitchSendsOnItsChange: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		await userEvent.click(
			await canvas.findByRole("switch", { name: /Notify/ }),
		);
		await waitFor(() =>
			expect(sent).toHaveBeenCalledWith({ ...GIVEN, notify: true }),
		);
	},
};

// A locked field stands inert with its reason under it.
export const LockedStandsInertWithItsReason: StoryObj = {
	play: async ({ canvas }) => {
		await canvas.findByText("Only owners change it.");
		await expect(
			canvas.getByRole("combobox", { name: /Digest/ }),
		).toBeDisabled();
	},
};

const renamed = through(orpc.forms.rename, async (input) => {
	sent(input);
	return { id: "workspace-1" };
});

// A required key the form itself shows is no missing `given`: the field sends
// itself with the given keys.
export const ARequiredFieldOfTheFormCommitsItself: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={renamed}
				given={GIVEN}
				commit="field"
				fields={{ name: { label: "Name" } }}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		await userEvent.type(
			await canvas.findByRole("textbox", { name: /Name/ }),
			"Acme",
		);
		await userEvent.tab();
		await waitFor(() =>
			expect(sent).toHaveBeenCalledWith({ ...GIVEN, name: "Acme" }),
		);
	},
};

// An optional enum's empty choice sends the key absent, and no error stands
// under the field.
export const AnOptionalPickCommittedEmptySendsNoKey: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={saved}
				given={GIVEN}
				commit="field"
				fields={{ region: { label: "Region" } }}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		sent.mockClear();
		await userEvent.click(
			await canvas.findByRole("combobox", { name: /Region/ }),
		);
		await userEvent.click(await screen.findByRole("option", { name: "eu" }));
		await waitFor(() =>
			expect(sent).toHaveBeenLastCalledWith({ ...GIVEN, region: "eu" }),
		);
		await userEvent.click(canvas.getByRole("combobox", { name: /Region/ }));
		await userEvent.click(await screen.findByRole("option", { name: "None" }));
		await waitFor(() => expect(sent).toHaveBeenLastCalledWith(GIVEN));
		await expect(sent).toHaveBeenCalledTimes(2);
		await expect(canvas.queryByRole("alert")).toBeNull();
	},
};

// Acts stand in a bar of their own under the fields, the last filled.
export const ActsStandInABarOfTheirOwn: StoryObj = {
	render: () => (
		<div className="w-sheet max-w-full">
			<Form
				act={saved}
				given={GIVEN}
				commit="field"
				fields={{ name: { label: "Workspace name" } }}
				acts={[{ label: "Close", onAct: closed }]}
			/>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		closed.mockClear();
		await userEvent.click(await canvas.findByRole("button", { name: "Close" }));
		await expect(closed).toHaveBeenCalledTimes(1);
		await expect(canvas.queryByRole("button", { name: "Save" })).toBeNull();
	},
};
