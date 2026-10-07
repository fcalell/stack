import type { Confirmation } from "@fcalell/ui-core/descriptors";
import { useSyncExternalStore } from "react";

// The decision queue: `confirm()` is called from anywhere and the Shell draws
// the first decision as a sheet. Its act runs the work and the sheet leaves
// the queue once that resolves; dismissing the sheet leaves it with nothing
// run. One decision shows at a time; a second asked meanwhile waits its turn.
export interface ConfirmEntry extends Confirmation {
	id: number;
}

let entries: ConfirmEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
	for (const listener of listeners) listener();
}

export function confirm(confirmation: Confirmation): void {
	entries = [...entries, { ...confirmation, id: nextId++ }];
	emit();
}

// Each asked decision's answer, called once the decision leaves the queue.
const answers = new Map<number, () => void>();

// A decision whose answer the caller waits on: `true` once its act's work
// resolved, `false` when it was dismissed (the way out, Escape, the scrim).
// With no host drawing the queue (a Shell or a Gate) nothing can ask, so the
// answer is `true`.
export function ask(confirmation: Confirmation): Promise<boolean> {
	if (listeners.size === 0) return Promise.resolve(true);
	return new Promise((resolve) => {
		let taken = false;
		answers.set(nextId, () => resolve(taken));
		confirm({
			...confirmation,
			act: {
				...confirmation.act,
				onAct: () =>
					confirmation.act.onAct().then((done) => {
						taken = true;
						return done;
					}),
			},
		});
	});
}

// The decision leaves the queue: its act's work resolved, or the sheet was
// dismissed. A second call is ignored.
export function dismissConfirmation(id: number): void {
	if (!entries.some((entry) => entry.id === id)) return;
	entries = entries.filter((entry) => entry.id !== id);
	emit();
	answers.get(id)?.();
	answers.delete(id);
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useConfirmations(): ConfirmEntry[] {
	return useSyncExternalStore(subscribe, () => entries);
}
