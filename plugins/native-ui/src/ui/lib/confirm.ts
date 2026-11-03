import type { Act, Confirmation, Decision } from "@fcalell/ui-core/descriptors";
import { createStore } from "@fcalell/ui-core/store";
import { useSyncExternalStore } from "react";

// The decision queue: `confirm()` is called from anywhere and the Shell draws
// the first decision as a sheet. Its act runs the work and the sheet leaves
// the queue once that resolves; dismissing the sheet leaves it with nothing
// run. One decision shows at a time; a second asked meanwhile waits its turn.
export interface ConfirmEntry extends Confirmation {
	id: number;
}

const queue = createStore<ConfirmEntry[]>([]);
let nextId = 1;

export function confirm(confirmation: Confirmation): void {
	queue.set([...queue.get(), { ...confirmation, id: nextId++ }]);
}

// Each asked decision's answer, called once the decision leaves the queue.
const answers = new Map<number, () => void>();

/** A decision to ask: its act is the answer, so it carries its words alone. */
export interface Question extends Decision {
	act: Pick<Act, "label" | "destructive">;
}

// A decision whose answer the caller waits on: `true` once its act was taken,
// `false` when it was dismissed (the way out, Escape, the scrim). With no host
// drawing the queue (a Shell or a Gate) nothing can ask, so the answer is
// `true`.
export function ask(question: Question): Promise<boolean> {
	if (queue.size === 0) return Promise.resolve(true);
	return new Promise((resolve) => {
		let taken = false;
		answers.set(nextId, () => resolve(taken));
		confirm({
			...question,
			act: {
				...question.act,
				onAct: () => {
					taken = true;
				},
			},
		});
	});
}

// The decision leaves the queue: its act's work resolved, or the sheet was
// dismissed. A second call is ignored.
export function dismissConfirmation(id: number): void {
	if (!queue.get().some((entry) => entry.id === id)) return;
	queue.set(queue.get().filter((entry) => entry.id !== id));
	answers.get(id)?.();
	answers.delete(id);
}

export function useConfirmations(): ConfirmEntry[] {
	return useSyncExternalStore(queue.subscribe, queue.get);
}
