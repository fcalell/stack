import type { Confirmation } from "@fcalell/ui-core/descriptors";
import { createSignal } from "solid-js";

// The decision queue, client-owned: `confirm()` pushes and resolves to
// whether the act was taken, the `Shell` draws the first decision as a
// sheet. Closing the sheet declines. One decision shows at a time; a second
// asked meanwhile waits its turn.
export interface ConfirmEntry extends Confirmation {
	id: number;
	resolve: (taken: boolean) => void;
}

const [entries, setEntries] = createSignal<ConfirmEntry[]>([]);
let next = 1;

export function confirm(confirmation: Confirmation): Promise<boolean> {
	return new Promise((resolve) => {
		const id = next++;
		setEntries((queue) => [...queue, { ...confirmation, id, resolve }]);
	});
}

// The host's answer for one decision; a second answer is ignored.
export function settleConfirmation(id: number, taken: boolean): void {
	const entry = entries().find((candidate) => candidate.id === id);
	if (!entry) return;
	setEntries((queue) => queue.filter((candidate) => candidate.id !== id));
	entry.resolve(taken);
}

export const confirmations = entries;
