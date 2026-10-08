import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { Group } from "@fcalell/plugin-react-ui/components/group";
import { Input } from "@fcalell/plugin-react-ui/components/input";
import { List } from "@fcalell/plugin-react-ui/components/list";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

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

export default {
	title: "Behaviour/List",
	render: () => (
		<List
			items={FILES}
			row={{
				key: (entry) => entry.id,
				title: (entry) => entry.name,
				children: (entry) => entry.children,
			}}
		/>
	),
} satisfies Meta;

// A tree List follows the WAI-ARIA tree pattern: one Tab stop, Down and Up
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

function Runs(props: { meta: boolean }) {
	return (
		<List
			items={RUNS}
			row={{
				key: (run) => run.id,
				title: (run) => run.name,
				meta: props.meta ? (run) => [run.meta] : undefined,
			}}
		/>
	);
}

const edge = (element: Element | undefined) =>
	element ? getComputedStyle(element).borderBottomWidth : undefined;

const after = (element: Element | undefined) =>
	element ? getComputedStyle(element, "::after") : undefined;

// A row map that declares `meta` parts its rows by one hairline between them,
// drawn on each row but the last as a bar across the row's whole width (its
// ends at the row's, no curve) under the row's rounded wash; a map without it
// draws none, and a List in a Group leaves the group's hairline the only one.
export const Separators: StoryObj = {
	render: () => (
		<>
			<div data-testid="two-line">
				<Runs meta />
			</div>
			<div data-testid="one-line">
				<Runs meta={false} />
			</div>
			<div data-testid="grouped">
				<Group>
					<Runs meta />
				</Group>
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
		await expect(first && getComputedStyle(first).borderTopLeftRadius).toBe(
			"6px",
		);
		for (const row of rows("one-line")) {
			await expect(edge(row)).toBe("0px");
			await expect(after(row)?.content).toBe("none");
		}
		const grouped = rows("grouped");
		await expect(grouped).toHaveLength(2);
		await expect(edge(grouped[0])).toBe("1px");
		await expect(edge(grouped[0]?.firstElementChild ?? undefined)).toBe("0px");
	},
};

// A FormField in a Group stands as one of the card's items: at the card's
// inset, the same as the rows beside it, with the group's one hairline between.
export const FieldInAGroup: StoryObj = {
	render: () => (
		<div data-testid="card">
			<Group>
				<FormField label="Add host">
					<Input value="" onChange={() => {}} />
				</FormField>
				<Runs meta={false} />
			</Group>
		</div>
	),
	play: async ({ canvas }) => {
		const card = canvas.getByTestId("card").firstElementChild;
		const label = canvas.getByText("Add host").getBoundingClientRect().left;
		const title = canvas.getByText("Deploy api").getBoundingClientRect().left;
		await expect(label).toBeGreaterThan(
			card?.getBoundingClientRect().left ?? 0,
		);
		await expect(label).toBe(title);
		await expect(edge(card?.children[0])).toBe("1px");
	},
};
