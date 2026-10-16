import {
	read,
	useQueryClient,
	useRead,
} from "@fcalell/plugin-api/tanstack-query";
import { FormField } from "@fcalell/plugin-react-ui/components/form-field";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { readsAt } from "@fcalell/plugin-react-ui/showcase/waiting";
import { ORPCError } from "@orpc/client";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMutation } from "@tanstack/react-query";
import { Profiler, useState } from "react";
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
					<List
						items={first}
						row={{
							key: (each) => each.id,
							title: (each) => {
								firstRan.set(each.id, (firstRan.get(each.id) ?? 0) + 1);
								return each.name;
							},
						}}
					/>
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
		for (const { id } of ITEMS) await expect(firstRan.get(id)).toBe(1);
	},
};

// An act pressed renders its host: its row. The frame, which calls `key` for
// every item each time it renders, and the sibling rows do not draw.
const pressedRan = new Map<string, number>();
let pressedKeys = 0;
let release: () => void = () => {};
const slow = () =>
	new Promise<void>((done) => {
		release = done;
	});
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
					<List
						items={pressed}
						row={{
							key: (each) => {
								if (each.id === "a") pressedKeys += 1;
								return each.id;
							},
							title: (each) => {
								pressedRan.set(each.id, (pressedRan.get(each.id) ?? 0) + 1);
								return each.name;
							},
							act: (each) => ({
								label: `Archive ${each.id}`,
								onAct: each.id === "a" ? slow : () => {},
							}),
						}}
					/>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		await canvas.findByText("Row d");
		const act = await canvas.findByRole("button", { name: "Archive a" });
		await wait(100);
		const rows = new Map(pressedRan);
		const keys = pressedKeys;
		await userEvent.click(act);
		await waitFor(() => expect(act).toHaveAttribute("aria-busy", "true"));
		release();
		await waitFor(() => expect(act).not.toHaveAttribute("aria-busy"));
		await wait(100);
		await expect(pressedKeys).toBe(keys);
		for (const id of ["b", "c", "d"])
			await expect(pressedRan.get(id)).toBe(rows.get(id));
	},
};

// A saved control renders that control, the leaf selecting what the save
// wrote, and nothing else; the field's line draws only on a refusal.
const sibling = { n: 0 };
const field = { n: 0 };
function savingServer(refuse: boolean) {
	const state = { value: false };
	const setting = read({
		queryKey: ["renders", "saved", refuse],
		queryFn: async () => ({ value: state.value }),
		staleTime: Number.POSITIVE_INFINITY,
	});
	const save = async (value: boolean) => {
		await wait(40);
		if (refuse) throw new ORPCError("BAD_REQUEST", { message: "not now" });
		state.value = value;
	};
	return { setting, save };
}

function Saved(props: { refuse: boolean }) {
	const [srv] = useState(() => savingServer(props.refuse));
	const client = useQueryClient();
	const [on] = useState(() => srv.setting.at((answer) => answer.value));
	const mutation = useMutation({
		mutationFn: srv.save,
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: srv.setting.options.queryKey });
		},
	});
	return (
		<>
			<Profiler id="sibling" onRender={counted(sibling)}>
				<p>Beside</p>
			</Profiler>
			<Profiler id="field" onRender={counted(field)}>
				<FormField
					label="Notify"
					switch={{ checked: on, onChange: (v) => mutation.mutateAsync(v) }}
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
	getByRole: (role: string, options: { name: string }) => HTMLElement;
}) {
	const flip = () => canvas.getByRole("switch", { name: "Notify" });
	await waitFor(() => expect(flip().hasAttribute("inert")).toBe(false));
	return flip();
}

export const ASavedControlRendersTheControlAndNoLine: StoryObj = {
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

export const ARefusedControlRendersItsLineAlone: StoryObj = {
	render: () => saved(true),
	play: async ({ canvas, userEvent }) => {
		const flip = await flipped(canvas);
		await wait(100);
		const beside = sibling.n;
		await expect(canvas.queryByText("Not now.")).toBeNull();
		await userEvent.click(flip);
		await expect(await canvas.findByText("Not now.")).toBeVisible();
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
const TASK_ROW = {
	key: (each: Task) => each.id,
	title: (each: Task) => {
		shiftRan.set(each.id, (shiftRan.get(each.id) ?? 0) + 1);
		return each.name;
	},
	status: (each: Task) => ({ state: each.state, label: each.state }),
};

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
					<List items={tasks} row={TASK_ROW} />
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
		await expect(shiftRan.get("new")).toBe(1);
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
		for (const { id } of TASKS)
			await expect(shiftRan.get(id)).toBe(
				(before.get(id) ?? 0) + (id === "t7" ? 1 : 0),
			);
	},
};

// A tree's rows read their depth, fold and tab stop from the List, none from
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
const nodes = read<readonly Node[]>({
	queryKey: ["renders", "nodes"],
	queryFn: () => Promise.resolve(NODES),
	staleTime: Number.POSITIVE_INFINITY,
});

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
						<List
							items={nodes}
							row={{
								key: (each: Node) => each.id,
								title: (each: Node) => {
									treeRan.set(each.id, (treeRan.get(each.id) ?? 0) + 1);
									return each.name;
								},
								status: (each: Node) => ({
									state: each.state,
									label: each.state,
								}),
								children: (each: Node) => each.children,
							}}
						/>
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
		for (const [id, ran] of before)
			await expect(treeRan.get(id)).toBe(
				ran + (id === "b2-3" || id === "b2" ? 1 : 0),
			);
	},
};
