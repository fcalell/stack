import { read, useQueryClient } from "@fcalell/plugin-api/tanstack-query";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";

// What a change renders: a row draws again only when its item changes, a long
// list builds and mounts only the rows near its view, and a row's act that
// waits on a read of its own paints alone.
interface Item {
	id: string;
	name: string;
}

export default { title: "Behaviour/Renders" } satisfies Meta;

// How many times each item's row ran its slots, which it does inside itself,
// only when it renders.
const ran = new Map<string, number>();
const ROW = {
	key: (each: Item) => each.id,
	title: (each: Item) => {
		ran.set(each.id, (ran.get(each.id) ?? 0) + 1);
		return each.name;
	},
};

const ITEMS: readonly Item[] = ["a", "b", "c", "d"].map((id) => ({
	id,
	name: `Row ${id}`,
}));

const listed = read<readonly Item[]>({
	queryKey: ["renders", "items"],
	queryFn: () => Promise.resolve(ITEMS),
	staleTime: Number.POSITIVE_INFINITY,
});

function Rename() {
	const client = useQueryClient();
	return (
		<button
			type="button"
			onClick={() =>
				client.setQueryData(
					listed.options.queryKey,
					ITEMS.map((each) =>
						each.id === "b" ? { ...each, name: "Row b renamed" } : each,
					),
				)
			}
		>
			Rename
		</button>
	);
}

// The read answers a new list in which one item changed: structural sharing
// keeps the other items' references, so the list renders and only that row
// with it.
export const OneChangedItemRendersExactlyThatRow: StoryObj = {
	render: () => (
		<>
			<Rename />
			<div className="h-[20rem]">
				<Place>
					<Pane title="Rows">
						<List items={listed} row={ROW} />
					</Pane>
				</Place>
			</div>
		</>
	),
	play: async ({ canvas, userEvent }) => {
		await canvas.findByText("Row b");
		const before = new Map(ran);
		await userEvent.click(canvas.getByRole("button", { name: "Rename" }));
		await canvas.findByText("Row b renamed");
		for (const { id } of ITEMS)
			await expect(ran.get(id)).toBe(
				(before.get(id) ?? 0) + (id === "b" ? 1 : 0),
			);
	},
};

// The rows a thousand-item list built, by item.
const built = new Set<string>();
const LONG: readonly Item[] = Array.from({ length: 1000 }, (_, at) => ({
	id: `r${at}`,
	name: `Long ${at}`,
}));

export const WindowOverAThousandRowsMountsOnlyTheWindow: StoryObj = {
	render: () => (
		<div style={{ width: 900, height: 700, display: "flex" }}>
			<Place>
				<Pane title="Long">
					<List
						items={LONG}
						row={{
							key: (each) => each.id,
							title: (each) => {
								built.add(each.id);
								return each.name;
							},
							onOpen: () => {},
						}}
					/>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas }) => {
		await canvas.findByText("Long 0");
		// The slots ran for the mounted rows alone: a window of them, never the
		// thousand, and the last row is a spacer's room, not a node.
		await waitFor(() => expect(built.size).toBeGreaterThan(0));
		await expect(built.size).toBeGreaterThan(5);
		await expect(built.size).toBeLessThan(100);
		await expect(canvas.queryByText("Long 999")).toBeNull();
	},
};

const rules = readsAt("renders/rules");
const GATED = ["a", "b"].map((id) => ({ id, name: `Gated ${id}` }));
const edit = { label: "Edit", onAct: () => {} };

function gated(rule: typeof rules.waiting) {
	return (
		<div className="h-[20rem]">
			<Place>
				<Pane title="Gated">
					<List
						items={GATED}
						row={{
							key: (each) => each.id,
							title: (each) => each.name,
							act: () => rule.at(() => edit),
						}}
					/>
				</Pane>
			</Place>
		</div>
	);
}

// The rows stand with their titles while the rules wait; each act's box is
// painted, inert, and nothing in the list waits.
export const AGatedRowActPaintsAlone: StoryObj = {
	render: () => gated(rules.waiting),
	play: async ({ canvas, canvasElement }) => {
		await canvas.findByText("Gated a");
		await canvas.findByText("Gated b");
		// A painted act is a button box, inert, with nothing to read.
		await waitFor(() =>
			expect(canvasElement.querySelectorAll("button[inert]")).toHaveLength(2),
		);
		await expect(canvas.queryByRole("button", { name: "Edit" })).toBeNull();
	},
};

// Once the rules failed the act stands blocked with the failed sentence, never
// a false yes, and the rows stay.
export const AGatedRowActIsBlockedUnderFailedRules: StoryObj = {
	render: () => gated(rules.failing),
	play: async ({ canvas }) => {
		await canvas.findByText("Gated a");
		const acts = await canvas.findAllByRole("button", {
			name: "This didn't load.",
		});
		await expect(acts).toHaveLength(2);
		for (const act of acts) await expect(act).toHaveAttribute("aria-disabled");
		await expect(canvas.queryByRole("button", { name: "Edit" })).toBeNull();
	},
};

export const AGatedRowActDrawsOnceTheRulesAnswer: StoryObj = {
	render: () => gated(rules.ready),
	play: async ({ canvas }) => {
		await expect(
			await canvas.findAllByRole("button", { name: "Edit" }),
		).toHaveLength(2);
	},
};
