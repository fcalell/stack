import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Sheet } from "@fcalell/plugin-react-ui/components/sheet";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, waitFor, within } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";
import { through } from "./support.ts";

const act = () => {};

// A form's bar is its act and, while the fields cannot make an input yet, the
// reason it is blocked: beside the act on the desktop, kept and unseen once the
// act unblocks on touch.
export default {
	title: "Behaviour/Form bar",
} satisfies Meta;

const save = through(orpc.forms.rename, async () => ({ id: "workspace-1" }));
const REASON = "Type a value";

// One required field: empty, the form's Save is blocked; `values` fills it.
function Named(props: { values?: { name: string } }) {
	return (
		<Form
			act={save}
			given={{ workspaceId: "acme" }}
			fields={{ name: { label: "Name" } }}
			values={props.values}
		/>
	);
}

// The blocked act's reason stands at rest without a press: beside the act on
// the desktop (before it, on its row), under it on touch.
const blockedAtRest: StoryObj = {
	render: () => <Named />,
	play: async ({ canvas }) => {
		const reason = await canvas.findByText(REASON);
		// A line fades in on `fast`: it is seen once the fade has run.
		await waitFor(() => expect(reason).toBeVisible());
		const save = canvas
			.getByRole("button", { name: "Save" })
			.getBoundingClientRect();
		const at = reason.getBoundingClientRect();
		if (document.documentElement.dataset.density === "touch")
			await expect(at.top).toBeGreaterThanOrEqual(save.bottom);
		else {
			await expect(at.right).toBeLessThanOrEqual(save.left);
			await expect(at.top).toBeGreaterThanOrEqual(save.top - 1);
			await expect(at.bottom).toBeLessThanOrEqual(save.bottom + 1);
		}
	},
};
export const BlockedReasonAtRest = blockedAtRest;

// On touch a bar that has drawn a blocked act's reason keeps the line's box
// once the act unblocks, so the form's height and the offset of what stands
// below differ by 0. On the desktop no line is held: see `UnblockingHoldsNoLineBesideTheActs` below.
function Unblocks() {
	return (
		<div>
			<div data-testid="form">
				<Named />
			</div>
			<p data-testid="below">Provenance</p>
		</div>
	);
}
const heldLine: StoryObj = {
	render: () => <Unblocks />,
	play: async ({ canvas, userEvent }) => {
		const box = (id: string) => canvas.getByTestId(id).getBoundingClientRect();
		const before = { form: box("form").height, below: box("below").top };
		await waitFor(() => expect(canvas.getByText(REASON)).toBeVisible());
		await userEvent.type(canvas.getByRole("textbox", { name: "Name" }), "Acme");
		await expect(
			canvas.getByRole("button", { name: "Save" }),
		).not.toHaveAttribute("aria-disabled", "true");
		await expect(box("form").height).toBe(before.form);
		await expect(box("below").top).toBe(before.below);
		// The kept line is not seen and not read.
		await expect(canvas.getByText(REASON)).not.toBeVisible();
		await expect(canvas.queryByRole("alert")).toBeNull();
	},
};
// A bar that never showed a reason draws no line.
const noLineNoHold: StoryObj = {
	render: () => <Named values={{ name: "Acme" }} />,
	play: async ({ canvasElement }) => {
		await expect(canvasElement.querySelector("p")).toBeNull();
	},
};
export const AnUnblockedBarThatNeverBlockedHasNoLine = noLineNoHold;

// On the desktop the end bar is one wrapping row: the reason stands at its
// start, beside the act, so the row is as tall as the act and no line is held.
// A form blocked then unblocked is the height of one never blocked, and the
// reason sits on the act's row at 1440.
function Beside(props: { width: number }) {
	return (
		<div style={{ width: props.width }}>
			<div data-testid="bar">
				<Named />
			</div>
			<div data-testid="never">
				<Named values={{ name: "Acme" }} />
			</div>
		</div>
	);
}
export const UnblockingHoldsNoLineBesideTheActs: StoryObj = {
	render: () => <Beside width={1440} />,
	play: async ({ canvas, userEvent }) => {
		const box = (id: string) => canvas.getByTestId(id).getBoundingClientRect();
		const reason = canvas.getByText(REASON);
		await waitFor(() => expect(reason).toBeVisible());
		const reasonBox = reason.getBoundingClientRect();
		const bar = within(canvas.getByTestId("bar"));
		const save = bar.getByRole("button", { name: "Save" });
		const saveBox = save.getBoundingClientRect();
		// The reason stands on the act's row, before it.
		await expect(reasonBox.right).toBeLessThanOrEqual(saveBox.left);
		await expect(reasonBox.top).toBeGreaterThanOrEqual(saveBox.top - 1);
		await expect(reasonBox.bottom).toBeLessThanOrEqual(saveBox.bottom + 1);
		// The form is as tall as one never blocked.
		await expect(box("bar").height).toBe(box("never").height);
		await userEvent.type(bar.getByRole("textbox", { name: "Name" }), "Acme");
		await expect(save).not.toHaveAttribute("aria-disabled", "true");
		await expect(box("bar").height).toBe(box("never").height);
		await expect(canvas.queryByText(REASON)).toBeNull();
	},
};

// A reason too long for the row wraps to a line under the acts: a sheet's
// foot, Cancel and the blocked submit.
const LONG =
	"1 sensitive file not yet opened, and the reviewer who owns the release has not yet signed off on the migration.";
export const ALongReasonWrapsUnderTheActs: StoryObj = {
	render: () => (
		<Sheet
			open
			onClose={act}
			title="Review the release"
			submit={{ label: "Approve", onAct: act, blocked: LONG }}
		/>
	),
	play: async () => {
		const reason = await screen.findByText(LONG);
		await waitFor(() => expect(reason).toBeVisible());
		const dialog = screen.getByRole("dialog");
		const approve = within(dialog)
			.getByRole("button", { name: "Approve" })
			.getBoundingClientRect();
		const at = reason.getBoundingClientRect();
		await expect(at.top).toBeGreaterThanOrEqual(approve.bottom);
		await expect(at.right).toBeLessThanOrEqual(
			dialog.getBoundingClientRect().right + 1,
		);
	},
};

// The same scenarios in a 390 px phone at the touch density.
function touch(story: StoryObj): StoryObj {
	return {
		...story,
		globals: {
			density: "touch",
			viewport: { value: "phone", isRotated: false },
		},
		parameters: {
			viewport: {
				options: {
					phone: {
						name: "Phone",
						styles: { width: "390px", height: "812px" },
						type: "mobile",
					},
				},
			},
		},
	};
}

export const BlockedReasonAtRestTouch = {
	...touch(blockedAtRest),
	tags: ["touch"],
};
export const UnblockingKeepsTheReasonLine = {
	...touch(heldLine),
	tags: ["touch"],
};
