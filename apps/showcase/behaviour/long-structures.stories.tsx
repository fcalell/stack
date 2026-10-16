import { BarChart } from "@fcalell/plugin-react-ui/components/bar-chart";
import { Comparison } from "@fcalell/plugin-react-ui/components/comparison";
import { List } from "@fcalell/plugin-react-ui/components/list";
import { OptionList } from "@fcalell/plugin-react-ui/components/option-list";
import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Picker } from "@fcalell/plugin-react-ui/components/picker";
import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { VIRTUAL_FROM } from "@fcalell/ui-core/window";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useState } from "react";
import { expect, screen, waitFor } from "storybook/test";
import { focused } from "./support.ts";

// The structures that stand on rows or bars beside the lists: a tree, an
// OptionList, a Comparison and a BarChart draw only what is near the
// scroller's view from `VIRTUAL_FROM` of them, the keyboard reaching the ones
// the window leaves unmounted.
export default {
	title: "Behaviour/Long structures",
	parameters: { layout: "fullscreen" },
} satisfies Meta;

type Story = StoryObj;

function Stage(props: { children: ReactNode }) {
	return (
		<div
			style={{
				width: 900,
				height: 700,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Place>
				<Pane title="Long">
					<Section title="Items">{props.children}</Section>
				</Pane>
			</Place>
		</div>
	);
}

const frame = () =>
	new Promise<void>((done) => requestAnimationFrame(() => done()));
async function frames(count = 3) {
	for (let at = 0; at < count; at++) await frame();
}

// The nearest ancestor that scrolls along an axis.
function scrollerOf(node: HTMLElement, axis: "x" | "y" = "y"): HTMLElement {
	for (let up = node.parentElement; up; up = up.parentElement) {
		const style = getComputedStyle(up);
		if ((axis === "y" ? style.overflowY : style.overflowX) === "auto")
			return up;
	}
	throw new Error("nothing scrolls around it");
}

// The most that can stand: the rows in the view and `OVERSCAN` past each edge,
// with room for the kept row.
const MOST = 60;

interface Node {
	id: string;
	name: string;
	children?: Node[];
}

// 25 branches of 39 leaves: a thousand nodes, every branch open.
const BRANCHES = 25;
const LEAVES = 39;
const TREE: Node[] = Array.from({ length: BRANCHES }, (_, at) => ({
	id: `b${at}`,
	name: `Branch ${at + 1}`,
	children: Array.from({ length: LEAVES }, (_, leaf) => ({
		id: `b${at}-${leaf}`,
		name: `Leaf ${at + 1}.${leaf + 1}`,
	})),
}));
const NODES = BRANCHES * (1 + LEAVES);

const TREE_ROW = {
	key: (node: Node) => node.id,
	title: (node: Node) => node.name,
	children: (node: Node) => node.children,
	onOpen: () => {},
};

const treeItems = (root: ParentNode) => [
	...root.querySelectorAll<HTMLElement>('[role="treeitem"]'),
];

// Every branch open, the rows in the order they stand.
const ORDER = TREE.flatMap((branch) => [
	branch.id,
	...(branch.children ?? []).map((leaf) => leaf.id),
]);

// The index of the visible row that holds focus, from the key it carries.
const at = () => ORDER.indexOf(focused().dataset.key ?? "");

function Tree() {
	return (
		<Stage>
			<List items={TREE} row={TREE_ROW} />
		</Stage>
	);
}

// A thousand nodes mount a window; Home and End reach rows it had not mounted
// and focus them, and the arrows walk every row from the first to the last and
// back, each one the next index, each one focused and mounted.
export const TreeWindows: Story = {
	render: () => <Tree />,
	play: async ({ canvas, canvasElement, userEvent }) => {
		await canvas.findByText("Branch 1");
		await frames();
		const mounted = () => treeItems(canvasElement).length;
		await waitFor(() => expect(mounted()).toBeLessThan(MOST));
		await expect(mounted()).toBeGreaterThan(0);

		// Each row says where it stands among its siblings, the unmounted ones
		// included.
		const [first, second] = treeItems(canvasElement);
		await expect(first?.getAttribute("aria-level")).toBe("1");
		await expect(first?.getAttribute("aria-setsize")).toBe(`${BRANCHES}`);
		await expect(first?.getAttribute("aria-posinset")).toBe("1");
		await expect(second?.getAttribute("aria-level")).toBe("2");
		await expect(second?.getAttribute("aria-setsize")).toBe(`${LEAVES}`);
		await expect(second?.getAttribute("aria-posinset")).toBe("1");

		// Tab lands on the tab stop, the first row.
		await userEvent.tab();
		await expect(at()).toBe(0);

		// End reaches the last row, far from the window, and focuses it.
		await userEvent.keyboard("{End}");
		await waitFor(() => expect(at()).toBe(NODES - 1));
		await expect(focused().textContent).toContain(`Leaf ${BRANCHES}.${LEAVES}`);
		await expect(focused().isConnected).toBe(true);
		await expect(mounted()).toBeLessThan(MOST);
		const view = scrollerOf(focused());
		const edge = view.getBoundingClientRect();
		const rect = focused().getBoundingClientRect();
		await expect(rect.bottom > edge.top && rect.top < edge.bottom).toBe(true);

		// Home goes back.
		await userEvent.keyboard("{Home}");
		await waitFor(() => expect(at()).toBe(0));
		await expect(mounted()).toBeLessThan(MOST);

		// The arrows reach every row, down and up.
		for (let index = 1; index < NODES; index++) {
			await userEvent.keyboard("{ArrowDown}");
			if (at() !== index) await waitFor(() => expect(at()).toBe(index));
			if (index % 100 === 0) await expect(mounted()).toBeLessThan(MOST);
		}
		await expect(focused().textContent).toContain(`Leaf ${BRANCHES}.${LEAVES}`);
		for (let index = NODES - 2; index >= 0; index--) {
			await userEvent.keyboard("{ArrowUp}");
			if (at() !== index) await waitFor(() => expect(at()).toBe(index));
			if (index % 100 === 0) await expect(mounted()).toBeLessThan(MOST);
		}
		await expect(focused().textContent).toContain("Branch 1");

		// Folding a branch moves the rows after it up, and the keys follow the
		// visible ones.
		await userEvent.keyboard("{ArrowLeft}");
		await waitFor(() =>
			expect(focused().getAttribute("aria-expanded")).toBe("false"),
		);
		await userEvent.keyboard("{ArrowDown}");
		await waitFor(() => expect(focused().textContent).toContain("Branch 2"));
		await expect(focused().dataset.key).toBe("b1");
	},
};

// 1000 options: one choice (a radiogroup) and several (boxes) mount a window;
// a radio says its place among all of them (a checkbox has no place to say).
function Options(props: { several?: boolean }) {
	const options = Array.from({ length: 1000 }, (_, at) => ({
		value: `o${at}`,
		label: `Option ${at + 1}`,
	}));
	const [one, setOne] = useState<string | null>("o0");
	const [many, setMany] = useState<string[]>([]);
	return (
		<Stage>
			{props.several ? (
				<OptionList options={options} value={many} onChange={setMany} />
			) : (
				<OptionList options={options} value={one} onChange={setOne} />
			)}
		</Stage>
	);
}

export const OptionListWindowsOneChoice: Story = {
	render: () => <Options />,
	play: async ({ canvas, canvasElement, userEvent }) => {
		await canvas.findByText("Option 1");
		await frames();
		const radios = () => [
			...canvasElement.querySelectorAll<HTMLElement>('[role="radio"]'),
		];
		await waitFor(() => expect(radios().length).toBeLessThan(MOST));
		const first = radios()[0];
		await expect(first?.getAttribute("aria-setsize")).toBe("1000");
		await expect(first?.getAttribute("aria-posinset")).toBe("1");
		await expect(canvas.queryByText("Option 1000")).toBeNull();

		// The arrows choose the next option, as an unwindowed group's do.
		first?.focus();
		await userEvent.keyboard("{ArrowDown}");
		await waitFor(() => expect(radios()[1]).toBeChecked());

		// The end of the list mounts its last option.
		const view = scrollerOf(first as HTMLElement);
		await waitFor(
			async () => {
				view.scrollTop = view.scrollHeight;
				await frames(2);
				await canvas.findByText("Option 1000");
			},
			{ timeout: 5000 },
		);
		await expect(radios().length).toBeLessThan(MOST);
		const last = radios().at(-1);
		await expect(last?.getAttribute("aria-posinset")).toBe("1000");
		// The chosen option stays mounted, the group's tab stop.
		await expect(
			radios().some((radio) => radio.getAttribute("aria-checked") === "true"),
		).toBe(true);
	},
};

export const OptionListWindowsSeveralChoices: Story = {
	render: () => <Options several />,
	play: async ({ canvas, canvasElement, userEvent }) => {
		await canvas.findByText("Option 1");
		await frames();
		const boxes = () => [
			...canvasElement.querySelectorAll<HTMLElement>('[role="checkbox"]'),
		];
		await waitFor(() => expect(boxes().length).toBeLessThan(MOST));
		await userEvent.click(canvas.getByRole("checkbox", { name: "Option 2" }));
		await waitFor(() =>
			expect(canvas.getByRole("checkbox", { name: "Option 2" })).toBeChecked(),
		);
	},
};

// 1000 facts: the head and a window of facts, the table reading its true size,
// the head kept at the end.
export const ComparisonWindows: Story = {
	render: () => (
		<Stage>
			<Comparison
				label="Facts"
				columns={["Left", "Right"]}
				items={Array.from({ length: 1000 }, (_, at) => ({
					id: `f${at}`,
					name: `Fact ${at + 1}`,
				}))}
				row={{
					key: (fact) => fact.id,
					label: (fact) => fact.name,
					values: (fact) => [`${fact.name} left`, `${fact.name} right`],
				}}
			/>
		</Stage>
	),
	play: async ({ canvas, canvasElement }) => {
		await canvas.findByText("Fact 1");
		await frames();
		const rows = () => [...canvasElement.querySelectorAll('[role="row"]')];
		await waitFor(() => expect(rows().length).toBeLessThan(MOST));
		await expect(canvas.getByRole("table")).toHaveAttribute(
			"aria-rowcount",
			"1001",
		);
		await expect(rows()[0]?.getAttribute("aria-rowindex")).toBe("1");
		await expect(rows()[1]?.getAttribute("aria-rowindex")).toBe("2");
		await expect(canvas.queryByText("Fact 1000")).toBeNull();

		const view = scrollerOf(canvas.getByText("Fact 1"));
		await waitFor(
			async () => {
				view.scrollTop = view.scrollHeight;
				await frames(2);
				await canvas.findByText("Fact 1000");
			},
			{ timeout: 5000 },
		);
		await expect(rows().length).toBeLessThan(MOST);
		await expect(rows().at(-1)?.getAttribute("aria-rowindex")).toBe("1001");
		// The head stays mounted whatever the scroll.
		await expect(rows()[0]?.getAttribute("aria-rowindex")).toBe("1");
		await expect(
			canvas.getByRole("columnheader", { name: "Left" }),
		).toBeInTheDocument();
	},
};

// 1000 bars: the plot keeps a bar's width and scrolls sideways, and only the
// bars and the times near its view stand.
export const BarChartWindows: Story = {
	render: () => (
		<Stage>
			<BarChart
				label="Requests"
				items={Array.from({ length: 1000 }, (_, at) => ({
					id: `d${at}`,
					day: `D${at + 1}`,
					total: (at % 17) + 1,
				}))}
				bar={{
					key: (day) => day.id,
					value: (day) => day.total,
					at: (day) => day.day,
				}}
			/>
		</Stage>
	),
	play: async ({ canvas }) => {
		const plot = await canvas.findByRole("img", { name: "Requests" });
		await frames();
		const bars = plot.lastElementChild as HTMLElement;
		const times = plot.parentElement?.lastElementChild as HTMLElement;
		const standing = (box: HTMLElement) =>
			[...box.children].filter((child) => !child.hasAttribute("aria-hidden"));
		await waitFor(() => expect(standing(bars).length).toBeLessThan(MOST));
		await expect(standing(bars).length).toBeGreaterThan(0);
		await waitFor(() => expect(standing(times).length).toBeLessThan(MOST));
		await expect(canvas.queryByText("D1000")).toBeNull();
		await expect(canvas.getByText("D1")).toBeInTheDocument();

		const view = scrollerOf(plot, "x");
		await expect(view.scrollWidth).toBeGreaterThan(view.clientWidth * 10);
		await waitFor(
			async () => {
				view.scrollLeft = view.scrollWidth;
				await frames(2);
				await canvas.findByText("D1000");
			},
			{ timeout: 5000 },
		);
		await expect(standing(bars).length).toBeLessThan(MOST);
		await expect(standing(times).length).toBeLessThan(MOST);
		await expect(canvas.queryByText("D1")).toBeNull();
		// The bars and the times stand over the same columns.
		const lastBar = standing(bars).at(-1)?.getBoundingClientRect();
		const lastTime = standing(times).at(-1)?.getBoundingClientRect();
		await expect(
			Math.abs((lastBar?.left ?? 0) - (lastTime?.left ?? 1)),
		).toBeLessThan(1);
	},
};

// Under `VIRTUAL_FROM` a chart keeps its fit: no scroller, every bar.
export const BarChartBelowTheCountFits: Story = {
	render: () => (
		<Stage>
			<BarChart
				label="Requests"
				items={Array.from({ length: VIRTUAL_FROM - 1 }, (_, at) => ({
					id: `d${at}`,
					total: (at % 7) + 1,
				}))}
				bar={{ key: (day) => day.id, value: (day) => day.total }}
			/>
		</Stage>
	),
	play: async ({ canvas }) => {
		const plot = await canvas.findByRole("img", { name: "Requests" });
		const bars = plot.lastElementChild as HTMLElement;
		await expect(bars.children.length).toBe(VIRTUAL_FROM - 1);
		const main = plot.parentElement?.parentElement as HTMLElement;
		await expect(getComputedStyle(main).overflowX).toBe("visible");
	},
};

// A pick of a thousand options: the popover draws a window of them, the arrow
// keys carry the highlight past it, and a search narrows them all.
const REPOS = Array.from({ length: 1000 }, (_, at) => ({
	value: `r${at}`,
	label: `Repo ${at + 1}`,
}));

function Repo() {
	const [repo, setRepo] = useState("r0");
	return (
		<Picker label="Repo" options={REPOS} value={repo} onChange={setRepo} />
	);
}

export const PickerWindows: Story = {
	render: () => (
		<Stage>
			<Repo />
		</Stage>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("combobox", { name: /Repo/ }));
		const list = await screen.findByRole("listbox");
		await waitFor(() =>
			expect(list.querySelectorAll('[role="option"]').length).toBeGreaterThan(
				0,
			),
		);
		const options = () => list.querySelectorAll('[role="option"]');
		await expect(options().length).toBeLessThan(MOST);
		await expect(options()[0]?.getAttribute("aria-setsize")).toBe("1000");
		await expect(screen.queryByText("Repo 1000")).toBeNull();

		// The arrows carry the highlight through the window and past it, each
		// highlighted option mounted and in view.
		for (let step = 1; step <= 80; step++) {
			await userEvent.keyboard("{ArrowDown}");
			await waitFor(() => {
				const lit = list.querySelector("[data-highlighted]");
				expect(lit?.getAttribute("aria-posinset")).toBe(`${step + 1}`);
			});
		}
		const lit = list.querySelector("[data-highlighted]") as HTMLElement;
		const edge = list.getBoundingClientRect();
		const rect = lit.getBoundingClientRect();
		await expect(
			rect.top >= edge.top - 1 && rect.bottom <= edge.bottom + 1,
		).toBe(true);
		await expect(options().length).toBeLessThan(MOST);

		// ArrowUp from the first wraps to the last, far from the window.
		await userEvent.keyboard("{Home}");
		await userEvent.keyboard("{ArrowUp}");
		await waitFor(() => {
			const wrapped = list.querySelector("[data-highlighted]");
			expect(wrapped?.getAttribute("aria-posinset")).toBe("1000");
		});

		// A search narrows all of them.
		await userEvent.keyboard("{Control>}a{/Control}Repo 1000");
		await waitFor(() => expect(options().length).toBe(1));
		await userEvent.keyboard("{Enter}");
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		await expect(
			canvas.getByRole("combobox", { name: /Repo/ }),
		).toHaveTextContent("Repo 1000");
	},
};

// On touch the pick opens a sheet: the same thousand options draw a window,
// and the arrows move the focus over every one, wrapping at the ends.
export const PickerSheetWindows: Story = {
	tags: ["touch"],
	globals: {
		density: "touch",
		viewport: { value: "narrow", isRotated: false },
	},
	parameters: {
		viewport: {
			options: {
				narrow: {
					name: "Narrow",
					styles: { width: "375px", height: "700px" },
					type: "mobile",
				},
			},
		},
	},
	render: () => (
		<Stage>
			<Repo />
		</Stage>
	),
	play: async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole("button", { name: /Repo/ }));
		const list = await screen.findByRole("listbox", { name: "Repo" });
		const options = () => list.querySelectorAll('[role="option"]');
		await waitFor(() => expect(options().length).toBeGreaterThan(0));
		await expect(options().length).toBeLessThan(MOST);
		await expect(options()[0]?.getAttribute("aria-setsize")).toBe("1000");
		await waitFor(() =>
			expect(focused().getAttribute("aria-posinset")).toBe("1"),
		);
		await userEvent.keyboard("{End}");
		await waitFor(() =>
			expect(focused().getAttribute("aria-posinset")).toBe("1000"),
		);
		await expect(focused().isConnected).toBe(true);
		await expect(options().length).toBeLessThan(MOST);
		await userEvent.keyboard("{ArrowDown}");
		await waitFor(() =>
			expect(focused().getAttribute("aria-posinset")).toBe("1"),
		);
		for (let step = 2; step <= 60; step++) {
			await userEvent.keyboard("{ArrowDown}");
			await waitFor(() =>
				expect(focused().getAttribute("aria-posinset")).toBe(`${step}`),
			);
		}
		await userEvent.keyboard("{Enter}");
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		await expect(
			canvas.getByRole("button", { name: /Repo/ }),
		).toHaveTextContent("Repo 60");
	},
};
