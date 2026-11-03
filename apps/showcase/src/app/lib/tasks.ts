import type { Moved, Picked } from "@fcalell/ui-core/descriptors";
import { moveEntry } from "@fcalell/ui-core/drag";
import { createStore } from "@fcalell/ui-core/store";
import { useSyncExternalStore } from "react";
import { TASKS } from "../fixtures/tasks.ts";

// The work's state, held in the page: the queue in the order the tasks are done
// and the ids each board holds. A write answers after a beat, as a server's would.
interface Work {
	queue: readonly string[];
	boards: Readonly<Record<string, readonly string[]>>;
}

const work = createStore<Work>({
	queue: ["t5", "t2", "t9", "t1", "t7"],
	boards: { someday: ["t3"], web: [], platform: [], beta: [] },
});

const later = () => new Promise<void>((resolve) => setTimeout(resolve, 200));

export function useWork(): Work {
	return useSyncExternalStore(work.subscribe, work.get);
}

/** Moves a task of the queue; the page shows the new order once this settles. */
export async function moveInQueue(id: string, to: Moved): Promise<void> {
	await later();
	const now = work.get();
	const from = now.queue.indexOf(id);
	if (from < 0) return;
	work.set({ ...now, queue: moveEntry(now.queue, from, to.index) });
}

/** Adds the tasks a drag carried to a board; a pick of every task takes them all. */
export async function addToBoard(board: string, picked: Picked): Promise<void> {
	await later();
	const ids =
		"ids" in picked
			? picked.ids
			: TASKS.map((task) => task.id).filter(
					(id) => !picked.except.includes(id),
				);
	const now = work.get();
	const held = now.boards[board] ?? [];
	work.set({
		...now,
		boards: {
			...now.boards,
			[board]: [...held, ...ids.filter((id) => !held.includes(id))],
		},
	});
}
