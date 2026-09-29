import type { Confirmation } from "@fcalell/ui-core/descriptors";
import { useSyncExternalStore } from "react";

// The decision queue: `confirm()` is called from anywhere and resolves to
// whether the act was taken; the `Shell` draws the first decision as a
// sheet. Dismissing the sheet declines. One decision shows at a time; a
// second asked meanwhile waits its turn.
export interface ConfirmEntry extends Confirmation {
	id: number;
	resolve: (taken: boolean) => void;
}

let entries: ConfirmEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
	for (const listener of listeners) listener();
}

export function confirm(confirmation: Confirmation): Promise<boolean> {
	return new Promise((resolve) => {
		const id = nextId++;
		entries = [...entries, { ...confirmation, id, resolve }];
		emit();
	});
}

// The host's answer for one decision; a second answer is ignored.
export function settleConfirmation(id: number, taken: boolean): void {
	const entry = entries.find((candidate) => candidate.id === id);
	if (!entry) return;
	entries = entries.filter((candidate) => candidate.id !== id);
	emit();
	entry.resolve(taken);
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useConfirmations(): ConfirmEntry[] {
	return useSyncExternalStore(subscribe, () => entries);
}
