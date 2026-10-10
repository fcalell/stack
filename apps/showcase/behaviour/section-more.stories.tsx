import { Prose } from "@fcalell/plugin-react-ui/components/prose";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";

const noop = () => {};

const MORE = [
	{ label: "Move up", onAct: noop },
	{ label: "Move down", onAct: noop },
	{ label: "Remove the block", onAct: noop, destructive: true },
];

function Frame(props: { width: number; children: ReactNode }) {
	return (
		<div style={{ width: props.width, maxWidth: "100%" }}>{props.children}</div>
	);
}

export default {
	title: "Behaviour/Section more",
} satisfies Meta;

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) throw new Error("not drawn");
	return value;
}

const TITLE = "Operating principles for the agent";

// A block's head: the title, its Edit act and its more, on the head row.
function head(width: number): StoryObj {
	return {
		render: () => (
			<Frame width={width}>
				<Section
					title={TITLE}
					description="What the agent weighs before it acts."
					act={{ label: "Edit", onAct: noop }}
					more={MORE}
				>
					<Prose markdown="Prose." />
				</Section>
			</Frame>
		),
		play: async ({ canvas }) => {
			const title = await canvas.findByText(TITLE);
			const edit = canvas.getByRole("button", { name: "Edit" });
			const more = canvas.getByRole("button", { name: `More ${TITLE}` });
			const t = title.getBoundingClientRect();
			const e = edit.getBoundingClientRect();
			const m = more.getBoundingClientRect();
			// The more follows the act at the head's end, inside the frame.
			await expect(m.left).toBeGreaterThanOrEqual(e.right - 0.5);
			await expect(m.right).toBeLessThanOrEqual(width + 0.5);
			// The title keeps a readable measure.
			await expect(t.width).toBeGreaterThan(Math.min(width, 375) * 0.4);
			// The act and the more stand together on one line.
			await expect(
				Math.abs(m.top + m.height / 2 - (e.top + e.height / 2)),
			).toBeLessThan(2);
			if (width <= 480) {
				// On touch the pair wraps under the title.
				await expect(e.top).toBeGreaterThanOrEqual(t.bottom - 0.5);
			} else {
				await expect(e.left).toBeGreaterThanOrEqual(t.right - 0.5);
			}
		},
	};
}

function touch(story: StoryObj, width = 375): StoryObj {
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

export const HeadHoldsActAndMore375 = touch(head(375));
export const HeadHoldsActAndMore1440 = head(1440);

// The more opens its menu and leaves a foldable Section as it was; the title
// still folds it.
export const FoldableMoreDoesNotToggle: StoryObj = {
	render: () => (
		<Frame width={900}>
			<Section title="Tools" folded more={MORE}>
				<Prose markdown="The body." />
			</Section>
		</Frame>
	),
	play: async ({ canvas }) => {
		const toggle = await canvas.findByRole("button", {
			name: "Tools",
			exact: true,
		});
		const more = canvas.getByRole("button", { name: "More Tools" });
		await expect(toggle).toHaveAttribute("aria-expanded", "false");
		await userEvent.click(more);
		await screen.findByRole("menu");
		await expect(toggle).toHaveAttribute("aria-expanded", "false");
		await userEvent.keyboard("{Escape}");
		await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
		await expect(toggle).toHaveAttribute("aria-expanded", "false");
		await userEvent.click(toggle);
		await expect(toggle).toHaveAttribute("aria-expanded", "true");
		await userEvent.click(more);
		await screen.findByRole("menu");
		await expect(toggle).toHaveAttribute("aria-expanded", "true");
		await userEvent.keyboard("{Escape}");
	},
};

// The destructive item reads apart from the plain ones.
export const DestructiveItemIsMarked: StoryObj = {
	render: () => (
		<Frame width={900}>
			<Section title="Block" more={MORE} />
		</Frame>
	),
	play: async ({ canvas }) => {
		await userEvent.click(
			await canvas.findByRole("button", { name: "More Block" }),
		);
		const menu = await screen.findByRole("menu");
		const ink = (name: string) =>
			getComputedStyle(
				must(
					within(menu).getByRole("menuitem", { name }).querySelector("span"),
				),
			).color;
		await expect(ink("Remove the block")).not.toBe(ink("Move up"));
		await expect(ink("Move up")).toBe(ink("Move down"));
	},
};
