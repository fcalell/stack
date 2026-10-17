import { ListRow } from "@fcalell/plugin-react-ui/components/list-row";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

// A row's marks (status, warning, lock, chip) stand whole in its end group or
// fold away, the last first: the text group keeps two fifths of the row, the
// first mark always stands, and none is ever cut to an ellipsis. A folded mark
// is not drawn, and stays in the row's content for a screen reader.
export default {
	title: "Behaviour/ListRowMarksFold",
} satisfies Meta;

// The same scenarios in a phone at the touch density.
function touch(story: StoryObj, width: number): StoryObj {
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
						styles: { width: `${width}px`, height: "812px" },
						type: "mobile",
					},
				},
			},
		},
	};
}

// A deploys list's row: the age over a status and a chip, a leading avatar and
// the more act beside them.
function Deploy(props: { width: number }) {
	return (
		<div style={{ width: props.width }} className="max-w-full">
			<ListRow
				leading={{ avatar: { name: "Ana Ruiz" } }}
				title="Cache the build output"
				meta={["a41c9e2", "main"]}
				trailing={{ age: new Date(Date.now() - 2 * 60_000).toISOString() }}
				status={{ state: "active", label: "Building" }}
				chip={{ family: "teal", label: "Production" }}
				more={[{ label: "Copy", icon: "Copy", onAct: () => {} }]}
			/>
		</div>
	);
}

// Whole: the text is not cut, whatever its box says of it.
const whole = (element: HTMLElement) =>
	expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth);

// At 320 the status stands whole and the chip folds; the title keeps its two
// fifths of the row.
export const FoldsTheChipAt320: StoryObj = {
	render: () => <Deploy width={320} />,
	play: async ({ canvas }) => {
		const status = canvas.getByText("Building");
		await expect(status).toBeVisible();
		await whole(status);
		const chip = canvas.getByText("Production");
		await expect(chip).not.toBeVisible();
		// Not drawn, but still the row's content.
		await expect(chip).toBeInTheDocument();
		const text = canvas.getByText("Cache the build output").parentElement;
		const row = text?.parentElement;
		if (!text || !row) throw new Error("the row has no box");
		const style = getComputedStyle(row);
		const inner =
			row.clientWidth -
			Number.parseFloat(style.paddingLeft) -
			Number.parseFloat(style.paddingRight);
		await expect(text.getBoundingClientRect().width).toBeGreaterThanOrEqual(
			inner * 0.4 - Number.parseFloat(style.columnGap) - 1,
		);
		await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
	},
};
export const FoldsTheChipAt320Touch = touch(FoldsTheChipAt320, 320);

// At 1280 both marks stand, the status before the chip.
export const BothMarksAt1280: StoryObj = {
	render: () => <Deploy width={1280} />,
	play: async ({ canvas }) => {
		const status = canvas.getByText("Building");
		const chip = canvas.getByText("Production");
		await expect(status).toBeVisible();
		await expect(chip).toBeVisible();
		await whole(status);
		await whole(chip);
		await expect(status.getBoundingClientRect().right).toBeLessThanOrEqual(
			chip.getBoundingClientRect().left,
		);
	},
};
export const BothMarksAt1280Touch = touch(BothMarksAt1280, 1280);

// The marks return as the row widens, one at a time, the first never leaving.
export const MarksReturnAsTheRowWidens: StoryObj = {
	render: () => <Deploy width={320} />,
	play: async ({ canvas, canvasElement }) => {
		const box = canvasElement.querySelector<HTMLElement>("div[style]");
		if (!box) throw new Error("the row has no box");
		const chip = canvas.getByText("Production");
		await expect(chip).not.toBeVisible();
		box.style.width = "640px";
		await waitFor(() => expect(chip).toBeVisible());
		await expect(canvas.getByText("Building")).toBeVisible();
		box.style.width = "320px";
		await waitFor(() => expect(chip).not.toBeVisible());
		await expect(canvas.getByText("Building")).toBeVisible();
	},
};

// A press on a passive mark opens the row: the hit under the end group gets
// it, since the marks are click-through.
const hitAtCentre = async (mark: HTMLElement) => {
	const at = mark.getBoundingClientRect();
	const found = document.elementFromPoint(
		at.left + at.width / 2,
		at.top + at.height / 2,
	);
	const hit = found?.closest("[data-hit]");
	if (!hit) throw new Error("a press on the mark does not reach the hit");
	await expect(hit.tagName).toBe("A");
};

export const AStatusLetsAPressThrough: StoryObj = {
	render: () => (
		<div style={{ width: 320 }} className="max-w-full">
			<ListRow
				title="Cache the build output"
				href="/deploys/1"
				status={{ state: "active", label: "Building" }}
			/>
		</div>
	),
	play: async ({ canvas }) => hitAtCentre(canvas.getByText("Building")),
};
export const AStatusLetsAPressThroughTouch = touch(
	AStatusLetsAPressThrough,
	320,
);

export const MarksBesideAValueLetAPressThrough: StoryObj = {
	render: () => (
		<div style={{ width: 320 }} className="max-w-full">
			<ListRow
				title="Cache the build output"
				href="/deploys/1"
				trailing={{ age: new Date(Date.now() - 2 * 60_000).toISOString() }}
				status={{ state: "active", label: "Building" }}
				chip={{ family: "teal", label: "Production" }}
			/>
		</div>
	),
	play: async ({ canvas }) => hitAtCentre(canvas.getByText("Building")),
};
export const MarksBesideAValueLetAPressThroughTouch = touch(
	MarksBesideAValueLetAPressThrough,
	320,
);
