import { Place } from "@fcalell/plugin-react-ui/components/place";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import type { TableColumn } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

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
	{ key: "task", label: "Task", width: "1/3", cell: (task) => task.task },
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
		<Place title="Cron tasks">
			<Table
				columns={COLUMNS}
				items={TASKS}
				row={{ id: (task) => task.id }}
				onOpen={open}
			/>
		</Place>
	),
} satisfies Meta;

// A page `width` px wide: the container the Table's form is chosen by.
function Sized(props: { width: number }) {
	return (
		<div
			style={{
				width: props.width,
				height: 700,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Place title="Cron tasks">
				<Table
					columns={COLUMNS}
					items={TASKS}
					row={{ id: (task) => task.id }}
					onOpen={open}
				/>
			</Place>
		</div>
	);
}

// Only the live form is in the document: from `tablet` (768) of its page the
// grid, below it the list.
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
