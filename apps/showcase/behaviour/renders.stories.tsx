import {
	read,
	useQueryClient,
	useRead,
} from "@fcalell/plugin-api/tanstack-query";
import { Form } from "@fcalell/plugin-react-ui/components/form";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import type { RowItem } from "@fcalell/plugin-react-ui/components/section";
import { type Row, Section } from "@fcalell/plugin-react-ui/components/section";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import type { Run } from "@fcalell/ui-core/descriptors";
import { ORPCError } from "@orpc/client";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Profiler, useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";
import { through } from "./support.ts";

const press = fn();

// What a change renders: a row draws again only when its item changes, a long
// sheet mounts only the rows near its view, and a row's act that waits on a
// read of its own paints alone.
//
// A row is counted by its title: a strong run whose getter tallies each read.
// A row is built once per item (`once`), so a row whose item did not change is
// the same object and is neither compared nor drawn; the drawer alone reads a
// title, so a tally moves only when its row draws.
interface Item {
	id: string;
	name: string;
}

export default { title: "Behaviour/Renders" } satisfies Meta;

const tally = (ran: Map<string, number>, id: string, name: string): Run => ({
	get strong() {
		ran.set(id, (ran.get(id) ?? 0) + 1);
		return name;
	},
});

// A row per item, built once.
function once<T extends object, R>(make: (item: T) => R) {
	const made = new WeakMap<T, R>();
	return (item: T): R => {
		const known = made.get(item);
		if (known) return known;
		const built = make(item);
		made.set(item, built);
		return built;
	};
}

const noop = () => {};

// How many times each item's row read its title, which it does inside itself,
// only when it renders.
const ran = new Map<string, number>();
const rowOf = once(
	(each: Item): Row => ({
		key: each.id,
		title: tally(ran, each.id, each.name),
	}),
);

const ITEMS: readonly Item[] = ["a", "b", "c", "d"].map((id) => ({
	id,
	name: `Row ${id}`,
}));

const listed = read<readonly Item[]>({
	queryKey: ["renders", "items"],
	queryFn: () => Promise.resolve(ITEMS),
	staleTime: Number.POSITIVE_INFINITY,
});
const listedRows = listed.at((items) => items.map(rowOf));

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
						<Section items={listedRows} />
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
		for (const { id } of ITEMS) {
			if (id === "b")
				await expect(ran.get(id)).toBeGreaterThan(before.get(id) ?? 0);
			else await expect(ran.get(id)).toBe(before.get(id));
		}
	},
};

// The rows a thousand-item sheet drew, by item.
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
					<Section
						items={LONG.map(
							(each): Row => ({
								key: each.id,
								title: {
									get strong() {
										built.add(each.id);
										return each.name;
									},
								},
								onOpen: noop,
							}),
						)}
					/>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas }) => {
		await canvas.findByText("Long 0");
		// The titles were read for the mounted rows alone: a window of them, never the
		// thousand, and the last row is a spacer's room, not a node.
		await waitFor(() => expect(built.size).toBeGreaterThan(0));
		await expect(built.size).toBeGreaterThan(5);
		await expect(built.size).toBeLessThan(100);
		await expect(canvas.queryByText("Long 999")).toBeNull();
	},
};

const rules = readsAt("renders/rules");
const GATED = ["a", "b"].map((id) => ({ id, name: `Gated ${id}` }));
const edit = { label: "Edit", onAct: press };

function gated(rule: typeof rules.waiting) {
	return (
		<div className="h-[20rem]">
			<Place>
				<Pane title="Gated">
					<Section
						items={GATED.map(
							(each): Row => ({
								key: each.id,
								title: each.name,
								act: rule.at(() => edit),
							}),
						)}
					/>
				</Pane>
			</Place>
		</div>
	);
}

// The rows stand with their titles while the rules wait; each act's box is
// painted, inert, and nothing in the sheet waits.
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

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

// Commits a subtree took part in: a profiler reports only the commits in which
// something inside it rendered.
function counted(commits: { n: number }) {
	return () => {
		commits.n += 1;
	};
}

// A read's first answer lands in one commit: the loaded rows draw once and the
// app's leaf flips once, the frame's painted form having drawn nothing else
// beyond that flip.
const firstRan = new Map<string, number>();
const firstRow = once(
	(each: Item): Row => ({
		key: each.id,
		title: tally(firstRan, each.id, each.name),
	}),
);
let leafReal = 0;
const first = read<readonly Item[]>({
	queryKey: ["renders", "first"],
	queryFn: async () => {
		await wait(150);
		return ITEMS;
	},
	staleTime: Number.POSITIVE_INFINITY,
});
const firstLeaf = read({
	queryKey: ["renders", "first-leaf"],
	queryFn: async () => {
		await wait(150);
		return { total: 4 };
	},
	staleTime: Number.POSITIVE_INFINITY,
});

function Total() {
	const value = useRead(firstLeaf.at((answer) => answer.total));
	if (value !== undefined) leafReal += 1;
	return <p>{value === undefined ? "Counting" : `Total ${value}`}</p>;
}

export const AFirstAnswerRendersEachLeafOnce: StoryObj = {
	render: () => (
		<div className="h-[20rem]">
			<Place>
				<Pane title="First">
					<Total />
					<Section items={first.at((items) => items.map(firstRow))} />
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas }) => {
		await canvas.findByText("Row d");
		await canvas.findByText("Total 4");
		// Anything the answer drew twice would have drawn by now.
		await wait(300);
		await expect(leafReal).toBe(1);
		// Every row drew the same number of times (once), and none has drawn again.
		const drew = firstRan.get("a");
		await expect(drew).toBeGreaterThan(0);
		for (const { id } of ITEMS) await expect(firstRan.get(id)).toBe(drew);
	},
};

// An act pressed renders its host: its row. The sibling rows do not draw.
const pressedRan = new Map<string, number>();
let release: () => void = () => {};
const slow = () =>
	new Promise<void>((done) => {
		release = done;
	});
const pressedRow = once(
	(each: Item): Row => ({
		key: each.id,
		title: tally(pressedRan, each.id, each.name),
		act: { label: `Archive ${each.id}`, onAct: each.id === "a" ? slow : noop },
	}),
);
const pressed = read<readonly Item[]>({
	queryKey: ["renders", "pressed"],
	queryFn: () => Promise.resolve(ITEMS),
	staleTime: Number.POSITIVE_INFINITY,
});

export const APressedActRendersItsHostOnly: StoryObj = {
	render: () => (
		<div className="h-[20rem]">
			<Place>
				<Pane title="Pressed">
					<Section items={pressed.at((items) => items.map(pressedRow))} />
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		await canvas.findByText("Row d");
		const act = await canvas.findByRole("button", { name: "Archive a" });
		await wait(100);
		const rows = new Map(pressedRan);
		await userEvent.click(act);
		await waitFor(() => expect(act).toHaveAttribute("aria-busy", "true"));
		release();
		await waitFor(() => expect(act).not.toHaveAttribute("aria-busy"));
		await wait(100);
		for (const id of ["b", "c", "d"])
			await expect(pressedRan.get(id)).toBe(rows.get(id));
	},
};

// A saved field renders that field, its leaf selecting what the save wrote,
// and nothing beside it; the field's line draws only on a refusal.
const sibling = { n: 0 };
const field = { n: 0 };
function savingServer(refuse: boolean) {
	const state = { notify: false };
	const setting = read({
		queryKey: ["renders", "saved", refuse],
		queryFn: async () => ({ notify: state.notify }),
		staleTime: Number.POSITIVE_INFINITY,
	});
	const save = async (notify: boolean) => {
		await wait(40);
		if (refuse) throw new ORPCError("BAD_REQUEST", { message: "not now" });
		state.notify = notify;
	};
	return { setting, save };
}

function Saved(props: { refuse: boolean }) {
	const [srv] = useState(() => savingServer(props.refuse));
	const client = useQueryClient();
	const act = through(
		orpc.forms.save,
		async (input) => {
			await srv.save(input.notify as boolean);
			return { id: "settings-1" };
		},
		() => {
			void client.invalidateQueries({ queryKey: srv.setting.options.queryKey });
		},
	);
	return (
		<>
			<Profiler id="sibling" onRender={counted(sibling)}>
				<p>Beside</p>
			</Profiler>
			<Profiler id="field" onRender={counted(field)}>
				<Form
					act={act}
					given={{ workspaceId: "acme" }}
					values={srv.setting}
					commit="field"
					fields={{ notify: { label: "Notify" } }}
				/>
			</Profiler>
		</>
	);
}

function saved(refuse: boolean) {
	return (
		<div className="h-[20rem]">
			<Place>
				<Pane title="Saved">
					<Saved refuse={refuse} />
				</Pane>
			</Place>
		</div>
	);
}

async function flipped(canvas: {
	getByRole: (role: string, options: { name: RegExp }) => HTMLElement;
}) {
	const flip = () => canvas.getByRole("switch", { name: /Notify/ });
	await waitFor(() => expect(flip().hasAttribute("inert")).toBe(false));
	return flip();
}

export const ASavedFieldRendersTheFieldAndNoLine: StoryObj = {
	render: () => saved(false),
	play: async ({ canvas, userEvent }) => {
		const flip = await flipped(canvas);
		await wait(100);
		const beside = sibling.n;
		const held = field.n;
		await userEvent.click(flip);
		await expect(flip).toHaveAttribute("aria-checked", "true");
		await wait(300);
		await expect(flip).toHaveAttribute("aria-checked", "true");
		await expect(canvas.queryByText("Not now.")).toBeNull();
		await expect(sibling.n).toBe(beside);
		await expect(field.n).toBeGreaterThan(held);
	},
};

export const ARefusedFieldRendersItsLineAlone: StoryObj = {
	render: () => saved(true),
	play: async ({ canvas, userEvent }) => {
		const flip = await flipped(canvas);
		await wait(100);
		const beside = sibling.n;
		await expect(canvas.queryByText("Not now.")).toBeNull();
		await userEvent.click(flip);
		await waitFor(() => expect(canvas.getByText("Not now.")).toBeVisible());
		await expect(flip).toHaveAttribute("aria-checked", "false");
		await expect(sibling.n).toBe(beside);
	},
};

// A row landing at the top moves every row below it, and a row's place is no
// prop of its own: the rows below draw nothing again. Fifty rows stand, under
// the window's count, so every one is mounted.
const SHIFT_ROWS = 50;
const shiftRan = new Map<string, number>();
interface Task {
	id: string;
	name: string;
	state: "running" | "done";
}
const TASKS: readonly Task[] = Array.from({ length: SHIFT_ROWS }, (_, at) => ({
	id: `t${at}`,
	name: `Task ${at}`,
	state: "running",
}));
const tasks = read<readonly Task[]>({
	queryKey: ["renders", "tasks"],
	queryFn: () => Promise.resolve(TASKS),
	staleTime: Number.POSITIVE_INFINITY,
});
const taskRow = once(
	(each: Task): Row => ({
		key: each.id,
		title: tally(shiftRan, each.id, each.name),
		status: { tone: each.state, label: each.state },
	}),
);
const taskRows = tasks.at((now) => now.map(taskRow));

function Tasks() {
	const client = useQueryClient();
	const set = (next: (now: readonly Task[]) => readonly Task[]) =>
		client.setQueryData<readonly Task[]>(tasks.options.queryKey, (now) =>
			next(now ?? TASKS),
		);
	return (
		<>
			<button
				type="button"
				onClick={() =>
					set((now) => [
						{ id: "new", name: "New task", state: "running" },
						...now,
					])
				}
			>
				Insert
			</button>
			<button
				type="button"
				onClick={() =>
					set((now) =>
						now.map((each) =>
							each.id === "t7" ? { ...each, state: "done" } : each,
						),
					)
				}
			>
				Finish
			</button>
		</>
	);
}

const taskList = (
	<>
		<Tasks />
		<div className="h-[20rem]">
			<Place>
				<Pane title="Tasks">
					<Section items={taskRows} />
				</Pane>
			</Place>
		</div>
	</>
);

export const ARowAtTheTopRendersThatRowAlone: StoryObj = {
	render: () => taskList,
	play: async ({ canvas, userEvent }) => {
		await canvas.findByText("Task 49");
		const before = new Map(shiftRan);
		await userEvent.click(canvas.getByRole("button", { name: "Insert" }));
		await canvas.findByText("New task");
		await wait(100);
		await expect(shiftRan.get("new")).toBeGreaterThan(0);
		for (const { id } of TASKS)
			await expect(shiftRan.get(id)).toBe(before.get(id));
	},
};

export const AStatusChangeRendersThatRowAlone: StoryObj = {
	render: () => taskList,
	play: async ({ canvas, userEvent }) => {
		await canvas.findByText("Task 49");
		const before = new Map(shiftRan);
		await userEvent.click(canvas.getByRole("button", { name: "Finish" }));
		await canvas.findByText("done");
		await wait(100);
		for (const { id } of TASKS) {
			if (id === "t7")
				await expect(shiftRan.get(id)).toBeGreaterThan(before.get(id) ?? 0);
			else await expect(shiftRan.get(id)).toBe(before.get(id));
		}
	},
};

// A tree's rows read their depth, fold and tab stop from the Section, none from
// their place among the visible rows: a status change on one leaf renders that
// leaf and its branch (whose item holds it), no other row.
interface Node {
	id: string;
	name: string;
	state: "running" | "done";
	children?: Node[];
}
const treeRan = new Map<string, number>();
const NODES: readonly Node[] = Array.from({ length: 5 }, (_, at) => ({
	id: `b${at}`,
	name: `Branch ${at}`,
	state: "running",
	children: Array.from({ length: 5 }, (_, leaf) => ({
		id: `b${at}-${leaf}`,
		name: `Leaf ${at}.${leaf}`,
		state: "running",
	})),
}));
const nodeRow = once(
	(each: Node): RowItem => ({
		key: each.id,
		title: tally(treeRan, each.id, each.name),
		status: { tone: each.state, label: each.state },
		children: each.children?.map(nodeRow),
	}),
);
const nodes = read<readonly Node[]>({
	queryKey: ["renders", "nodes"],
	queryFn: () => Promise.resolve(NODES),
	staleTime: Number.POSITIVE_INFINITY,
});
const nodeRows = nodes.at((now) => now.map(nodeRow));

function Finish() {
	const client = useQueryClient();
	return (
		<button
			type="button"
			onClick={() =>
				client.setQueryData<readonly Node[]>(nodes.options.queryKey, (now) =>
					(now ?? NODES).map((branch) => ({
						...branch,
						children: branch.children?.map((leaf) =>
							leaf.id === "b2-3" ? { ...leaf, state: "done" } : leaf,
						),
					})),
				)
			}
		>
			Finish leaf
		</button>
	);
}

export const AStatusChangeInATreeRendersThatRowAndItsBranch: StoryObj = {
	render: () => (
		<>
			<Finish />
			<div className="h-[30rem]">
				<Place>
					<Pane title="Tree">
						<Section items={nodeRows} />
					</Pane>
				</Place>
			</div>
		</>
	),
	play: async ({ canvas, userEvent }) => {
		await canvas.findByText("Leaf 4.4");
		await wait(100);
		const before = new Map(treeRan);
		await userEvent.click(canvas.getByRole("button", { name: "Finish leaf" }));
		await canvas.findByText("done");
		await wait(100);
		for (const [id, ran] of before) {
			if (id === "b2-3" || id === "b2")
				await expect(treeRan.get(id)).toBeGreaterThan(ran);
			else await expect(treeRan.get(id)).toBe(ran);
		}
	},
};
