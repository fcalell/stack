import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { TableColumn } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor } from "storybook/test";
import { hover } from "./mouse.ts";

interface Task {
	id: string;
	task: string;
	schedule: string;
	retries: number;
}

const TASKS: Task[] = [
	{ id: "backup", task: "Nightly backup", schedule: "0 3 * * *", retries: 3 },
	{
		id: "invoices",
		task: "Invoice sweep",
		schedule: "*/15 * * * *",
		retries: 5,
	},
	{
		id: "reindex",
		task: "Search reindex",
		schedule: "0 */6 * * *",
		retries: 1,
	},
];

const COLUMNS: TableColumn<Task>[] = [
	{ key: "task", label: "Task", width: "1/4", cell: (task) => task.task },
	{
		key: "schedule",
		label: "Schedule",
		width: "measure-short",
		cell: (task) => task.schedule,
	},
	{
		key: "retries",
		label: "Retries",
		kind: "number",
		cell: (task) => task.retries,
	},
];

const open = () => {};

export default {
	title: "Behaviour/Table",
	parameters: { layout: "fullscreen" },
	render: () => (
		<Place>
			<Pane title="Cron tasks" wide>
				<Table
					columns={COLUMNS}
					items={TASKS}
					row={{ id: (task) => task.id }}
					onOpen={open}
				/>
			</Pane>
		</Place>
	),
} satisfies Meta;

// A column `width` px wide in a 1920 px page: the box the Table's form is
// chosen by, whatever the page is.
function Sized(props: { width: number }) {
	return (
		<div
			style={{
				width: 1920,
				height: 700,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Place>
				<Pane title="Cron tasks" wide>
					<div style={{ width: props.width }}>
						<Table
							columns={COLUMNS}
							items={TASKS}
							row={{ id: (task) => task.id }}
							onOpen={open}
						/>
					</div>
				</Pane>
			</Place>
		</div>
	);
}

// Only the live form is in the document: from `tablet` (768) of its own width
// the grid, below it the list.
export const FromTablet: StoryObj = {
	render: () => <Sized width={768} />,
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getByRole("grid")).toBeInTheDocument();
		await expect(canvas.getAllByText("Nightly backup")).toHaveLength(1);
		await expect(canvasElement.querySelectorAll("table")).toHaveLength(1);
	},
};

export const BelowTablet: StoryObj = {
	render: () => <Sized width={767} />,
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getAllByText("Nightly backup")).toHaveLength(1);
		await expect(canvasElement.querySelectorAll("table")).toHaveLength(0);
	},
};

// A table in a 512 px column of a 1920 px page draws the list its column holds,
// not a grid that scrolls sideways under it.
export const NarrowColumnOfAWidePage: StoryObj = {
	render: () => <Sized width={512} />,
	play: async ({ canvas, canvasElement }) => {
		await expect(canvas.getAllByText("Nightly backup")).toHaveLength(1);
		await expect(canvasElement.querySelectorAll("table")).toHaveLength(0);
		for (const element of canvasElement.querySelectorAll("*"))
			if (getComputedStyle(element).overflowX === "auto")
				await expect(element.scrollWidth).toBeLessThanOrEqual(
					element.clientWidth + 1,
				);
	},
};

// A grid with a cell cursor: one Tab stop, the arrow keys move it by cell,
// Home and End to the row's ends, Ctrl+End to the last cell.
export const Grid: StoryObj = {
	play: async ({ canvas, canvasElement, userEvent }) => {
		await expect(canvas.getByRole("grid")).toBeInTheDocument();
		const cells = (row: number) =>
			canvas.getAllByRole("row")[row + 1]?.querySelectorAll<HTMLElement>("td");
		const stops = [...canvasElement.querySelectorAll("td")].filter(
			(cell) => cell.tabIndex === 0,
		);
		await expect(stops).toHaveLength(1);
		await userEvent.tab();
		await expect(cells(0)?.[0]).toHaveFocus();
		await userEvent.keyboard("{ArrowRight}");
		await expect(cells(0)?.[1]).toHaveFocus();
		await userEvent.keyboard("{ArrowDown}");
		await expect(cells(1)?.[1]).toHaveFocus();
		await userEvent.keyboard("{End}");
		await expect(cells(1)?.[2]).toHaveFocus();
		await userEvent.keyboard("{Home}");
		await expect(cells(1)?.[0]).toHaveFocus();
		await userEvent.keyboard("{Control>}{End}{/Control}");
		await expect(cells(2)?.[2]).toHaveFocus();
		await userEvent.keyboard("{ArrowUp}{ArrowLeft}");
		await expect(cells(1)?.[1]).toHaveFocus();
	},
};

const WIDE: TableColumn<Task>[] = [
	{ key: "task", label: "Task", cell: (task) => task.task },
	...["a", "b", "c", "d", "e", "f"].map((key) => ({
		key,
		label: `Column ${key}`,
		cell: (task: Task) => `${task.id} ${key}`,
	})),
];

// The grid scrolls sideways on every pointer under its frozen leading column,
// and a cell the keyboard reaches scrolls clear of it by the scroller's
// padding at its start: the cell never stands under the frozen column, and
// focusing the frozen cell itself leaves the scroll where it is.
const clears: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => (
		<div
			style={{
				width: 816,
				height: 500,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Place>
				<Pane title="Cron tasks" wide>
					<div style={{ width: 800 }}>
						<Table
							columns={WIDE}
							items={TASKS}
							row={{ id: (task) => task.id }}
							onOpen={open}
						/>
					</div>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas, userEvent }) => {
		const grid = canvas.getByRole("grid");
		const scroller = grid.parentElement;
		if (!scroller) throw new Error("the grid has no scroller");
		await expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
		const cell = (column: number) =>
			canvas.getAllByRole("row")[1]?.querySelectorAll<HTMLElement>("td")[
				column
			];
		const frozen = cell(0);
		if (!frozen) throw new Error("no frozen cell");
		await userEvent.tab();
		await expect(frozen).toHaveFocus();
		for (let column = 1; column <= 6; column++) {
			await userEvent.keyboard("{ArrowRight}");
			await expect(cell(column)).toHaveFocus();
			const at = cell(column)?.getBoundingClientRect();
			await expect(at?.left).toBeGreaterThanOrEqual(
				frozen.getBoundingClientRect().right - 0.5,
			);
		}
		for (let column = 5; column >= 1; column--) {
			await userEvent.keyboard("{ArrowLeft}");
			await expect(cell(column)).toHaveFocus();
			await expect(
				cell(column)?.getBoundingClientRect().left,
			).toBeGreaterThanOrEqual(frozen.getBoundingClientRect().right - 0.5);
		}
		const scrolled = scroller.scrollLeft;
		await userEvent.keyboard("{ArrowLeft}");
		await expect(frozen).toHaveFocus();
		await expect(scroller.scrollLeft).toBe(scrolled);
	},
};

export const FrozenColumnClearsTheFocus: StoryObj = clears;

export const FrozenColumnClearsTheFocusOnTouch: StoryObj = {
	...clears,
	tags: ["touch"],
	globals: { density: "touch" },
};

// Columns that do not fit their column (800 px, a grid from `tablet`) keep their
// floor and the grid scrolls, on a fine pointer as on a touch one: no column squeezes below the
// short measure, no cell's content is cut by its neighbours, and the leading
// column stays frozen with its hairline.
export const WideColumnsScroll: StoryObj = {
	parameters: { layout: "fullscreen" },
	render: () => (
		<div
			style={{
				width: 1280,
				height: 500,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Place>
				<Pane title="Cron tasks" wide>
					<div style={{ width: 800 }}>
						<Table
							columns={WIDE}
							items={TASKS}
							row={{ id: (task) => task.id }}
							onOpen={open}
						/>
					</div>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas }) => {
		const grid = canvas.getByRole("grid");
		const scroller = grid.parentElement;
		if (!scroller) throw new Error("the grid has no scroller");
		await expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
		const floor = (() => {
			const probe = document.createElement("div");
			probe.style.width = "var(--container-measure-short)";
			document.body.append(probe);
			const width = probe.getBoundingClientRect().width;
			probe.remove();
			return width;
		})();
		const heads = [...grid.querySelectorAll<HTMLElement>("thead th")];
		await expect(heads).toHaveLength(WIDE.length);
		for (const head of heads) {
			await expect(head.getBoundingClientRect().width).toBeGreaterThanOrEqual(
				floor - 0.5,
			);
		}
		for (const cell of grid.querySelectorAll<HTMLElement>("tbody td > *")) {
			await expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth + 1);
		}
		const lead = grid.querySelector<HTMLElement>("tbody td");
		if (!lead) throw new Error("no leading cell");
		await expect(
			getComputedStyle(lead.firstElementChild as Element).borderRightWidth,
		).not.toBe("0px");
		await expect(getComputedStyle(lead).position).toBe("sticky");
	},
};

// A row that opens through its `href` (no `onOpen`) washes under the pointer as
// a row that opens through `onOpen` does, and a row with neither does not.
export const LinkRowsWashUnderThePointer: StoryObj = {
	render: () => (
		<div style={{ width: 1024, height: 500 }} className="flex flex-col">
			<Place>
				<Pane title="Cron tasks" wide>
					<Table
						columns={COLUMNS}
						items={TASKS}
						row={{
							id: (task) => task.id,
							href: (task) =>
								task.id === "reindex" ? undefined : `/tasks/${task.id}`,
						}}
					/>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas }) => {
		await document.fonts.ready;
		const rowOf = (name: string) => {
			const row = canvas.getByText(name).closest("tr");
			if (!row) throw new Error("the cell has no row");
			return row;
		};
		const wash = (row: Element) => getComputedStyle(row).backgroundColor;
		const link = rowOf("Nightly backup");
		const rest = wash(link);
		const at = link.getBoundingClientRect();
		await hover({ x: at.left + at.width - 20, y: at.top + at.height / 2 });
		await waitFor(() => expect(wash(link)).not.toBe(rest));
		const plain = rowOf("Search reindex");
		const still = wash(plain);
		const over = plain.getBoundingClientRect();
		await hover({
			x: over.left + over.width - 20,
			y: over.top + over.height / 2,
		});
		await new Promise((done) => setTimeout(done, 400));
		await expect(wash(plain)).toBe(still);
	},
};

// A `wrap` column's cell wraps and hyphenates a long value onto further lines;
// a column without it truncates.
export const WrapColumnWrapsItsCells: StoryObj = {
	render: () => (
		<div style={{ width: 1920, height: 700 }}>
			<Place>
				<Pane title="Notes" wide>
					<Table
						columns={[
							{
								key: "task",
								label: "Task",
								width: "1/4",
								cell: (t: Task) => t.task,
							},
							{
								key: "note",
								label: "Note",
								width: "measure-short",
								wrap: true,
								cell: () =>
									"Runs every night after the billing close, so a late invoice batch is swept into the same backup window",
							},
						]}
						items={TASKS}
						row={{ id: (task) => task.id }}
					/>
				</Pane>
			</Place>
		</div>
	),
	play: async ({ canvas }) => {
		const cell = canvas.getAllByText(/^Runs every night/)[0];
		if (!cell) throw new Error("the wrapped cell is missing");
		const style = getComputedStyle(cell);
		await expect(cell).not.toHaveClass("truncate");
		await expect(style.textOverflow).not.toBe("ellipsis");
		await expect(cell.scrollHeight).toBeGreaterThan(
			parseFloat(style.lineHeight) * 1.5,
		);
	},
};

// A page of two tables names each by its `label`: the grid answers to it in
// place of the page's title.
export const LabelNamesTheTable: StoryObj = {
	render: () => (
		<Place>
			<Pane title="Cron tasks" wide>
				<Table
					label="Scheduled tasks"
					columns={COLUMNS}
					items={TASKS}
					row={{ id: (task) => task.id }}
					onOpen={open}
				/>
				<Table
					label="Retired tasks"
					columns={COLUMNS}
					items={TASKS.slice(0, 1)}
					row={{ id: (task) => task.id }}
					onOpen={open}
				/>
			</Pane>
		</Place>
	),
	play: async ({ canvas }) => {
		await expect(
			await canvas.findByRole("grid", { name: "Scheduled tasks" }),
		).toBeVisible();
		await expect(
			canvas.getByRole("grid", { name: "Retired tasks" }),
		).toBeVisible();
	},
};
