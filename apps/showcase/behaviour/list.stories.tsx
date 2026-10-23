import {
	type Row,
	type RowItem,
	Section,
} from "@fcalell/plugin-react-ui/components/section";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, waitFor } from "storybook/test";

const pressed = fn();

interface Entry {
	id: string;
	name: string;
	children?: Entry[];
}

const FILES: Entry[] = [
	{
		id: "src",
		name: "src",
		children: [
			{ id: "app", name: "app.ts" },
			{ id: "lib", name: "lib", children: [{ id: "date", name: "date.ts" }] },
		],
	},
	{ id: "readme", name: "README.md" },
];

type ListItem = RowItem;

const toEntry = (entry: Entry): ListItem => ({
	key: entry.id,
	title: entry.name,
	children: entry.children?.map(toEntry),
});

export default {
	title: "Behaviour/Section sheet",
	render: () => <Section items={FILES.map(toEntry)} />,
} satisfies Meta;

// A tree sheet follows the WAI-ARIA tree pattern: one Tab stop, Down and Up
// move by visible row, Left folds a branch (or goes to its parent) and Right
// unfolds it (or goes to its first child), Home and End jump to the ends.
export const Tree: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		await expect(canvas.getByRole("tree")).toBeInTheDocument();
		const items = () => canvas.getAllByRole("treeitem");
		await expect(items().filter((item) => item.tabIndex === 0)).toHaveLength(1);
		await userEvent.tab();
		await expect(items()[0]).toHaveFocus();
		await expect(items()[0]).toHaveAttribute("aria-expanded", "true");
		await userEvent.keyboard("{ArrowDown}");
		await expect(items()[1]).toHaveFocus();
		await expect(items()[1]).toHaveAttribute("aria-level", "2");
		await userEvent.keyboard("{ArrowUp}{ArrowLeft}");
		await waitFor(() =>
			expect(items()[0]).toHaveAttribute("aria-expanded", "false"),
		);
		await expect(items()).toHaveLength(2);
		await userEvent.keyboard("{ArrowRight}");
		await waitFor(() =>
			expect(items()[0]).toHaveAttribute("aria-expanded", "true"),
		);
		await userEvent.keyboard("{End}");
		await expect(items().at(-1)).toHaveFocus();
		await userEvent.keyboard("{Home}");
		await expect(items()[0]).toHaveFocus();
	},
};

const RUNS = [
	{ id: "a", name: "Deploy api", meta: "2 min ago" },
	{ id: "b", name: "Deploy web", meta: "9 min ago" },
];

const runs = (meta: boolean): Row[] =>
	RUNS.map((run) => ({
		key: run.id,
		title: run.name,
		meta: meta ? [run.meta] : undefined,
	}));

const edge = (element: Element | undefined) =>
	element ? getComputedStyle(element).borderBottomWidth : undefined;

const after = (element: Element | undefined) =>
	element ? getComputedStyle(element, "::after") : undefined;

// A sheet's rows with `meta` parts are parted by one hairline between them,
// drawn on each row but the last as a bar across the row's whole width (its
// ends at the row's, no curve); rows without it draw none.
export const Separators: StoryObj = {
	render: () => (
		<>
			<div data-testid="two-line">
				<Section items={runs(true)} />
			</div>
			<div data-testid="one-line">
				<Section items={runs(false)} />
			</div>
			<div data-testid="grouped">
				<Section items={runs(true)} />
			</div>
		</>
	),
	play: async ({ canvas }) => {
		const rows = (id: string) => [
			...(canvas.getByTestId(id).firstElementChild?.children ?? []),
		];
		const two = rows("two-line");
		await expect(two).toHaveLength(2);
		const [first, last] = two;
		const line = after(first);
		await expect(edge(first)).toBe("0px");
		await expect(line?.position).toBe("absolute");
		await expect(line?.height).toBe("1px");
		await expect(line?.left).toBe("0px");
		await expect(line?.right).toBe("0px");
		await expect(line?.bottom).toBe("0px");
		await expect(line?.width).toBe(`${first?.getBoundingClientRect().width}px`);
		await expect(line?.borderTopLeftRadius).toBe("0px");
		await expect(line?.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
		await expect(edge(last)).toBe("0px");
		await expect(after(last)?.content).toBe("none");
		// The row's wash is rounded at the row radius; the hairline stays straight.
		await expect(first && getComputedStyle(first).borderTopLeftRadius).toBe(
			"6px",
		);
		for (const row of rows("one-line")) {
			await expect(edge(row)).toBe("0px");
			await expect(after(row)?.content).toBe("none");
		}
		const grouped = rows("grouped");
		await expect(grouped).toHaveLength(2);
		// The group's hairline is the same bar, between its rows and none after
		// the last, and no row carries a border.
		await expect(edge(grouped[0])).toBe("0px");
		await expect(after(grouped[0])?.height).toBe("1px");
		await expect(after(grouped[0])?.position).toBe("absolute");
		await expect(after(grouped[1])?.content).toBe("none");
		await expect(edge(grouped[0]?.firstElementChild ?? undefined)).toBe("0px");
	},
};

// A row's wash is the row radius (6, inside the rubric's 4 to 6) wherever the
// row stands: in a bare sheet, whose rows bleed the card's inset, and in the card
// the sheet stands on, where the row keeps its role's radius and the card's
// clip rounds the outer corners.
export const RowWashIsRounded: StoryObj = {
	render: () => (
		<>
			<div data-testid="bare" style={{ width: 520 }}>
				<Section
					items={RUNS.map((run) => ({
						key: run.id,
						title: run.name,
						href: `#${run.id}`,
					}))}
				/>
			</div>
			<div data-testid="card" style={{ width: 520 }}>
				<Section
					items={RUNS.map((run) => ({
						key: run.id,
						title: run.name,
						href: `#${run.id}`,
					}))}
				/>
			</div>
		</>
	),
	play: async ({ canvas }) => {
		const bare =
			canvas.getByTestId("bare").firstElementChild?.firstElementChild;
		const card = canvas.getByTestId("card").firstElementChild;
		const grouped = card?.firstElementChild;
		if (!bare || !card || !grouped) throw new Error("the rows are not drawn");
		await expect(bare.getBoundingClientRect().width).toBeGreaterThan(500);
		for (const row of [bare, grouped])
			await expect(getComputedStyle(row).borderTopLeftRadius).toBe("6px");
		await expect(getComputedStyle(card).overflow).toBe("hidden");
	},
};

// A tree is one tab stop: a row's own controls (its more menu) stand in the tab
// order only on the row that holds the stop, and follow it as the arrow keys
// move it, so a tree of many rows with acts is never a stop per row.
export const TreeActsFollowTheStop: StoryObj = {
	render: () => (
		<Section
			items={FILES.map(function withMore(entry): ListItem {
				return {
					...toEntry(entry),
					more: [{ label: "Remove", icon: "Trash2", onAct: pressed }],
					children: entry.children?.map(withMore),
				};
			})}
		/>
	),
	play: async ({ canvas, userEvent }) => {
		const items = () => canvas.getAllByRole("treeitem");
		const stops = () =>
			[
				...canvas
					.getByRole("tree")
					.querySelectorAll<HTMLElement>("button, a, [role=treeitem]"),
			].filter((element) => element.tabIndex >= 0);
		// The first row and its more menu: no other row's.
		await expect(stops()).toHaveLength(2);
		await userEvent.tab();
		await expect(items()[0]).toHaveFocus();
		await userEvent.keyboard("{ArrowDown}");
		await expect(items()[1]).toHaveFocus();
		const stood = stops();
		await expect(stood).toHaveLength(2);
		await expect(items()[1]).toBe(stood[0]);
		await expect(items()[1]).toContainElement(stood[1] as HTMLElement);
	},
};
