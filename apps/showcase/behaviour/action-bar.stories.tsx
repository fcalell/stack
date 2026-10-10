import { ActionBar } from "@fcalell/plugin-react-ui/components/action-bar";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { Swaps } from "@fcalell/plugin-react-ui/showcase/frames/action-bar";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect } from "storybook/test";

const act = () => {};

export default {
	title: "Behaviour/ActionBar",
} satisfies Meta;

// An end bar whose acts need more than its container wraps them to a further
// row: every act stands inside the container's edges, the filled act last.
export const WrapsInsideItsContainer: StoryObj = {
	render: () => (
		<div data-testid="column" className="w-list max-w-full">
			<ActionBar
				acts={[
					{ label: "Cut the scope in the thread", onAct: act },
					{ label: "Split the work in its thread", onAct: act },
					{ label: "Accept the flags as known limits", onAct: act },
					{ label: "Continue refining", onAct: act },
				]}
			/>
		</div>
	),
	play: async ({ canvas }) => {
		const column = canvas.getByTestId("column").getBoundingClientRect();
		const buttons = canvas.getAllByRole("button");
		for (const button of buttons) {
			const box = button.getBoundingClientRect();
			await expect(box.left).toBeGreaterThanOrEqual(column.left);
			await expect(box.right).toBeLessThanOrEqual(column.right);
		}
		const last = buttons.at(-1)?.getBoundingClientRect();
		const first = buttons[0]?.getBoundingClientRect();
		await expect(last?.top).toBeGreaterThan(first?.top ?? 0);
	},
};

// The last blocked act's reason stands under the acts without a press.
export const BlockedReasonAtRest: StoryObj = {
	render: () => (
		<ActionBar
			acts={[
				{ label: "Cancel", onAct: act },
				{
					label: "Approve",
					onAct: act,
					blocked: "1 sensitive file not yet opened.",
				},
			]}
		/>
	),
	play: async ({ canvas }) => {
		const reason = canvas.getByText("1 sensitive file not yet opened.");
		await expect(reason).toBeVisible();
		const approve = canvas.getByRole("button", { name: "Approve" });
		await expect(reason.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			approve.getBoundingClientRect().bottom,
		);
	},
};

// A bar given `pending` stands the pending form at the loaded bar's height, so
// what is below keeps its top: the loaded bar and the pending one, each over a
// line, are the same height and the line sits at the same offset, for one, two
// and three acts and for a four-act bar that wraps.
const swapsInPlace: StoryObj = {
	render: () => <Swaps />,
	play: async ({ canvasElement }) => {
		const loaded = [...canvasElement.querySelectorAll("[data-swap=loaded]")];
		await expect(loaded).toHaveLength(4);
		for (const before of loaded) {
			const after = before.parentElement?.querySelector("[data-swap=pending]");
			const top = (box?: Element | null) =>
				box?.lastElementChild?.getBoundingClientRect().top ?? 0;
			const box = (element?: Element | null) =>
				element?.getBoundingClientRect() ?? new DOMRect();
			await expect(box(after).height).toBeCloseTo(box(before).height, 0);
			await expect(top(after) - box(after).top).toBeCloseTo(
				top(before) - box(before).top,
				0,
			);
		}
	},
};

// The acts under a pending form take no focus, no press and no announcement,
// and Enter in a field does not submit through them.
let pressed = 0;
const heldActs: StoryObj = {
	render: () => (
		<Form>
			<FormField label="Name">
				<Input value="Acme" onChange={act} />
			</FormField>
			<ActionBar
				acts={[
					{ label: "Close", onAct: act },
					{
						label: "Merge",
						onAct: () => {
							pressed++;
						},
					},
				]}
				pending={{ sentence: "Merging", act: { label: "Cancel", onAct: act } }}
			/>
		</Form>
	),
	play: async ({ canvas, userEvent }) => {
		pressed = 0;
		await expect(canvas.queryByRole("button", { name: "Merge" })).toBeNull();
		await expect(canvas.getAllByRole("button")).toHaveLength(1);
		await userEvent.type(canvas.getByRole("textbox"), "{Enter}");
		await expect(pressed).toBe(0);
	},
};

// A bar that has drawn a blocked act's reason keeps the line's box once the act
// unblocks, so the bar's height and the offset of what stands below differ by 0.
const REASON = "1 sensitive file not yet opened.";
function Unblocks(props: { pending?: boolean }) {
	const [blocked, setBlocked] = useState<string | undefined>(REASON);
	return (
		<div>
			<div data-testid="bar">
				<ActionBar
					acts={[
						{ label: "Cancel", onAct: act },
						{ label: "Approve", onAct: act, blocked },
					]}
					pending={
						props.pending && blocked === undefined
							? { sentence: "Approving" }
							: undefined
					}
				/>
			</div>
			<p data-testid="below">Provenance</p>
			<button type="button" onClick={() => setBlocked(undefined)}>
				Open the file
			</button>
		</div>
	);
}
const heldLine: StoryObj = {
	render: () => <Unblocks />,
	play: async ({ canvas, userEvent }) => {
		const box = (id: string) => canvas.getByTestId(id).getBoundingClientRect();
		const before = { bar: box("bar").height, below: box("below").top };
		await expect(canvas.getByText(REASON)).toBeVisible();
		await userEvent.click(
			canvas.getByRole("button", { name: "Open the file" }),
		);
		await expect(canvas.getByRole("button", { name: "Approve" })).toBeEnabled();
		await expect(box("bar").height).toBe(before.bar);
		await expect(box("below").top).toBe(before.below);
		// The kept line is not seen and not read.
		await expect(canvas.getByText(REASON)).not.toBeVisible();
		await expect(canvas.queryByRole("alert")).toBeNull();
	},
};
// A bar that never showed a reason draws no line.
const noLineNoHold: StoryObj = {
	render: () => <ActionBar acts={[{ label: "Approve", onAct: act }]} />,
	play: async ({ canvasElement }) => {
		await expect(canvasElement.querySelector("p")).toBeNull();
	},
};
// A pending bar replacing a bar that holds a reason line keeps that bar's height.
const pendingHoldsLine: StoryObj = {
	render: () => <Unblocks pending />,
	play: async ({ canvas, userEvent }) => {
		const box = (id: string) => canvas.getByTestId(id).getBoundingClientRect();
		const before = { bar: box("bar").height, below: box("below").top };
		await userEvent.click(
			canvas.getByRole("button", { name: "Open the file" }),
		);
		await expect(canvas.getByText("Approving")).toBeVisible();
		await expect(box("bar").height).toBe(before.bar);
		await expect(box("below").top).toBe(before.below);
	},
};
export const UnblockingKeepsTheReasonLine = heldLine;
export const AnUnblockedBarThatNeverBlockedHasNoLine = noLineNoHold;
export const PendingReplacingABlockedBarKeepsItsHeight = pendingHoldsLine;

export const SwapKeepsTheBarsHeight = swapsInPlace;
export const PendingHoldsTheActsInert = heldActs;

// The same scenarios in a 390 px phone at the touch density.
function touch(story: StoryObj): StoryObj {
	return {
		...story,
		tags: ["touch"],
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

export const SwapKeepsTheBarsHeightTouch = touch(swapsInPlace);
export const PendingHoldsTheActsInertTouch = touch(heldActs);
export const UnblockingKeepsTheReasonLineTouch = touch(heldLine);
export const PendingReplacingABlockedBarKeepsItsHeightTouch =
	touch(pendingHoldsLine);
