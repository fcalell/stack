import type { Moved, Picked } from "@fcalell/ui-core/descriptors";
import { moveEntry } from "@fcalell/ui-core/drag";
import { useSyncExternalStore } from "react";
import { TASKS } from "../fixtures/tasks.ts";

// The work's state, held in the page: the queue in the order the tasks are done
// and the ids each board holds. A write answers after a beat, as a server's would.
interface Work {
	queue: readonly string[];
	boards: Readonly<Record<string, readonly string[]>>;
}

let work: Work = {
	queue: ["t5", "t2", "t9", "t1", "t7"],
	boards: { someday: ["t3"], web: [], platform: [], beta: [] },
};
const listeners = new Set<() => void>();

function set(next: Work) {
	work = next;
	for (const listener of listeners) listener();
}

const later = () => new Promise<void>((resolve) => setTimeout(resolve, 200));

export function useWork(): Work {
	return useSyncExternalStore(
		(listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		() => work,
	);
}

/** Moves a task of the queue; the page shows the new order once this settles. */
export async function moveInQueue(id: string, to: Moved): Promise<void> {
	await later();
	const from = work.queue.indexOf(id);
	if (from < 0) return;
	set({ ...work, queue: moveEntry(work.queue, from, to.index) });
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
	const held = work.boards[board] ?? [];
	set({
		...work,
		boards: {
			...work.boards,
			[board]: [...held, ...ids.filter((id) => !held.includes(id))],
		},
	});
}
