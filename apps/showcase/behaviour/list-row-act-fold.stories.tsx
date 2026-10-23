import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Shell } from "@fcalell/plugin-react-ui/components/shell";
import type { PlaceSpec } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, screen, waitFor } from "storybook/test";

const pressed = fn();

// A row's labelled act stands whole in its end group or folds into the row's
// more menu, as a Pane head's acts do: the row stays one line, the text group
// keeps its two fifths, and an act that does not fit beside that floor is the
// menu's first item, which runs it. It comes back where there is room.
export default {
	title: "Behaviour/ListRowActFold",
} satisfies Meta;

// The same scenarios in a phone at the touch density.
function touch(story: StoryObj, width: number): StoryObj {
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
						styles: { width: `${width}px`, height: "812px" },
						type: "mobile",
					},
				},
			},
		},
	};
}

const approve = fn();
const NAME = "Release notes for 2.4";

function Review(props: {
	width?: number;
	blocked?: string;
	more?: boolean;
	act?: string;
}) {
	return (
		<div style={{ width: props.width }} className="max-w-full">
			<Section
				items={[
					{
						key: "review",
						title: NAME,
						meta: ["docs · release/2.4"],
						trailing: { value: "40 min" },
						status: { tone: "waiting", label: "Waiting" },
						act: {
							label: props.act ?? "Approve and merge",
							onAct: approve,
							blocked: props.blocked,
						},
						more: props.more
							? [{ label: "Copy link", icon: "Copy", onAct: pressed }]
							: undefined,
					},
				]}
			/>
		</div>
	);
}

const rowOf = (canvas: { getByText: (text: string) => HTMLElement }) => {
	const row = canvas.getByText(NAME).parentElement?.parentElement;
	if (!row) throw new Error("the row has no box");
	return row;
};
// The act's buttons that stand: a folded act is inert, out of the accessibility
// tree, which the query does not read.
const standing = (canvas: {
	queryAllByRole: (role: string, options: { name: string }) => HTMLElement[];
}) =>
	canvas
		.queryAllByRole("button", { name: "Approve and merge" })
		.filter((button) => !button.closest("[inert]"));
const menuOf = (canvas: {
	getByRole: (role: string, options: { name: RegExp }) => HTMLElement;
}) => canvas.getByRole("button", { name: /more/i });

// At 320 the act does not fit beside the text group's floor: the row is one
// line, the act is not drawn, and the more menu holds it first.
export const FoldsIntoTheRowMenuAt320: StoryObj = {
	render: () => <Review width={320} />,
	play: async ({ canvas, userEvent }) => {
		approve.mockClear();
		const row = rowOf(canvas);
		await expect(standing(canvas)).toHaveLength(0);
		await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
		// One line: the title and the menu stand on the row's middle.
		const title = canvas.getByText(NAME).getBoundingClientRect();
		const menu = menuOf(canvas).getBoundingClientRect();
		await expect(row.getBoundingClientRect().height).toBeLessThan(
			title.height * 4,
		);
		await expect(menu.left).toBeGreaterThanOrEqual(title.right - 0.5);
		await userEvent.click(menuOf(canvas));
		const item = await screen.findByRole("menuitem", {
			name: "Approve and merge",
		});
		await userEvent.click(item);
		await waitFor(() => expect(approve).toHaveBeenCalledTimes(1));
	},
};
export const FoldsIntoTheRowMenuAt320Touch = {
	...touch(FoldsIntoTheRowMenuAt320, 320),
	tags: ["touch"],
};

// With room the act stands in the end group and the row holds no menu.
export const StandsAt1280: StoryObj = {
	render: () => <Review width={1280} />,
	play: async ({ canvas }) => {
		const [act] = standing(canvas);
		if (!act) throw new Error("the act does not stand");
		await expect(act).toBeVisible();
		await expect(canvas.queryByRole("button", { name: /more/i })).toBeNull();
		const row = rowOf(canvas);
		const box = row.getBoundingClientRect();
		const mid = (box.top + box.bottom) / 2;
		const own = act.getBoundingClientRect();
		await expect(Math.abs((own.top + own.bottom) / 2 - mid)).toBeLessThan(1);
	},
};

// A row that has a menu of its own folds the act in ahead of its items.
export const FoldsAheadOfTheRowsOwnMenu: StoryObj = {
	render: () => <Review width={320} more />,
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(menuOf(canvas));
		const items = await screen.findAllByRole("menuitem");
		await expect(items.map((item) => item.textContent)).toEqual([
			"Approve and merge",
			"Copy link",
		]);
	},
};
export const FoldsAheadOfTheRowsOwnMenuTouch = {
	...touch(FoldsAheadOfTheRowsOwnMenu, 320),
	tags: ["touch"],
};

// A blocked act keeps its reason in the menu, disabled, and runs nothing.
export const AFoldedBlockedActKeepsItsReason: StoryObj = {
	render: () => <Review width={320} blocked="Waiting on two reviews" />,
	play: async ({ canvas, userEvent }) => {
		approve.mockClear();
		await userEvent.click(menuOf(canvas));
		const item = await screen.findByRole("menuitem", {
			name: /Approve and merge/,
		});
		await expect(item).toHaveTextContent("Waiting on two reviews");
		await expect(item).toHaveAttribute("aria-disabled", "true");
		await userEvent.click(item);
		await expect(approve).not.toHaveBeenCalled();
	},
};
export const AFoldedBlockedActKeepsItsReasonTouch = {
	...touch(AFoldedBlockedActKeepsItsReason, 320),
	tags: ["touch"],
};

// The act comes back as the row widens, and folds again as it narrows.
function Resizable() {
	const [width, setWidth] = useState(320);
	return (
		<>
			<button type="button" onClick={() => setWidth(width === 320 ? 960 : 320)}>
				Resize
			</button>
			<Review width={width} />
		</>
	);
}

export const ComesBackWhenThereIsRoom: StoryObj = {
	render: () => <Resizable />,
	play: async ({ canvas, userEvent }) => {
		await expect(standing(canvas)).toHaveLength(0);
		await userEvent.click(canvas.getByRole("button", { name: "Resize" }));
		await waitFor(() => expect(standing(canvas)).toHaveLength(1));
		await expect(canvas.queryByRole("button", { name: /more/i })).toBeNull();
		await userEvent.click(canvas.getByRole("button", { name: "Resize" }));
		await waitFor(() => expect(standing(canvas)).toHaveLength(0));
	},
};

// In a Pane on the phone, as an app draws it: the row is one line, its act in
// the menu.
const PLACES: PlaceSpec[] = [
	{ route: "/overview", label: "Overview", icon: "House" },
];

const InAPaneOnThePhone: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => (
		<Shell places={PLACES}>
			<Pane title="Reviews">
				<Review act="Approve and merge into the release branch" />
			</Pane>
		</Shell>
	),
	play: async ({ canvas }) => {
		const row = rowOf(canvas);
		await expect(menuOf(canvas)).toBeVisible();
		await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
		await expect(row.getBoundingClientRect().height).toBeLessThan(80);
	},
};
export const InAPaneOnThePhoneTouch = {
	...touch(InAPaneOnThePhone, 320),
	tags: ["touch"],
};
