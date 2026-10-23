import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import { Place } from "@fcalell/plugin-react-ui/showcase/frames/place";
import type { TableColumn } from "@fcalell/ui-core/descriptors";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, waitFor } from "storybook/test";

interface Task {
	id: string;
	task: string;
}

const TASKS: Task[] = [
	{ id: "backup", task: "Nightly backup" },
	{ id: "invoices", task: "Invoice sweep" },
	{ id: "reindex", task: "Search reindex" },
];

const COLUMNS: TableColumn<Task>[] = [
	{ key: "task", label: "Task", cell: (task) => task.task },
];

const published = fn();

function Publish() {
	const [chosen, setChosen] = useState<string[]>(["backup"]);
	return (
		<Place>
			<Pane title="Cron tasks" wide>
				<Table
					columns={COLUMNS}
					items={TASKS}
					row={{ id: (task) => task.id }}
					choose={{ chosen, onChange: setChosen }}
					select={{
						acts: [
							{
								label: `Publish ${chosen.length}`,
								onAct: published,
								blocked: chosen.length === 0 ? "Choose a task." : undefined,
							},
						],
					}}
				/>
			</Pane>
		</Place>
	);
}

// A table with `select` draws its selection bar at the foot of its Pane: the
// count against the rows that can be ticked, the acts after it.
export default {
	title: "Behaviour/Table select",
	parameters: { layout: "fullscreen" },
	render: () => <Publish />,
} satisfies Meta;

export const BarCountsTheChosen: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		await canvas.findByText("1 of 3 chosen");
		await userEvent.click(canvas.getByRole("button", { name: "Publish 1" }));
		await expect(published).toHaveBeenCalled();
	},
};

// Select all and deselect all hand the set to `choose`.
export const AllAndNone: StoryObj = {
	play: async ({ canvas, userEvent }) => {
		await canvas.findByText("1 of 3 chosen");
		await userEvent.click(canvas.getByRole("button", { name: "Select all" }));
		await waitFor(() => canvas.getByText("3 of 3 chosen"));
		await userEvent.click(canvas.getByRole("button", { name: "Deselect all" }));
		await waitFor(() => canvas.getByText("0 of 3 chosen"));
		await expect(
			canvas.getByRole("button", { name: "Publish 0" }),
		).toHaveAttribute("aria-disabled", "true");
	},
};
