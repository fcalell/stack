import { Pane } from "@fcalell/plugin-react-ui/components/pane";
import type { Row } from "@fcalell/plugin-react-ui/components/section";
import { Section } from "@fcalell/plugin-react-ui/components/section";
import { Table } from "@fcalell/plugin-react-ui/components/table";
import type { TableColumn } from "@fcalell/ui-core/descriptors";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BOARDS, TASKS, type Task } from "../../fixtures/tasks.ts";
import { act } from "../../lib/act.ts";
import { addToBoard, moveInQueue, useWork } from "../../lib/tasks.ts";

export const Route = createFileRoute("/_app/tasks")({
	component: Tasks,
});

const COLUMNS: TableColumn<Task>[] = [
	{
		key: "title",
		label: "Title",
		width: "1/4",
		sortable: true,
		cell: (task) => task.title,
	},
	{
		key: "owner",
		label: "Owner",
		sortable: true,
		cell: (task) => task.owner,
	},
	{
		key: "points",
		label: "Points",
		kind: "number",
		sortable: true,
		cell: (task) => task.points,
	},
	{ key: "label", label: "Label", kind: "source", cell: (task) => task.label },
	{
		key: "retitled",
		label: "Retitled",
		kind: "change",
		width: "measure-short",
		wrap: true,
		cell: (task) => task.retitled ?? null,
	},
];

// A task's one act is its completion: an icon at its end, the same act on
// Shift+Enter, with the sentence toasted once it has run. The rest of its acts
// are its menu, where each board that takes a dragged task is also an entry.
const ROW = {
	id: (task: Task) => task.id,
	act: (task: Task) => ({
		icon: "Check" as const,
		label: `Complete ${task.title}`,
		onAct: act,
		done: `Completed ${task.title}`,
	}),
	more: (task: Task) => [
		{ icon: "Copy" as const, label: `Copy ${task.title}`, onAct: act },
	],
};

const BY_ID = new Map(TASKS.map((task) => [task.id, task]));

// The queue's row: a task, dragged to a board, completed from its icon.
const toRow = (task: Task): Row => ({
	key: task.id,
	title: task.title,
	facts: [task.owner, `${task.points} points`],
	drag: { kind: "task", picked: { ids: [task.id] } },
	onOpen: act,
	act: {
		icon: "Check",
		label: `Complete ${task.title}`,
		onAct: act,
		done: `Completed ${task.title}`,
	},
});

// The queue moves by a drag to the line between two rows (or Alt with an
// arrow, or its menu), a task or the tasks ticked in the table drag onto a
// board row here or in the sidebar, and a board is also an entry in each task's
// menu.
function Tasks() {
	const work = useWork();
	const [chosen, setChosen] = useState<string[]>([]);
	return (
		<Pane title="Tasks" wide>
			<Section
				title="Queue"
				items={work.queue.flatMap((id) => {
					const task = BY_ID.get(id);
					return task ? [toRow(task)] : [];
				})}
				reorder={{ onMove: moveInQueue, done: "Queue updated" }}
			/>
			<Section
				title="Boards"
				items={BOARDS.map(
					(board): Row => ({
						key: board.id,
						leading: { icon: "ListChecks" },
						title: board.label,
						trailing: { count: work.boards[board.id]?.length ?? 0 },
						drop: {
							accepts: "task",
							label: `Add to ${board.label}`,
							onDrop: (drag) => addToBoard(board.id, drag.picked),
							done: `Added to ${board.label}`,
						},
					}),
				)}
			/>
			<Section title="All tasks">
				<Table
					columns={COLUMNS}
					items={TASKS}
					current="t2"
					row={ROW}
					drag={{ kind: "task" }}
					choose={{ chosen, onChange: setChosen }}
					onOpen={act}
				/>
			</Section>
		</Pane>
	);
}
