import type { Act } from "@fcalell/ui-core/descriptors";
import { createSignal } from "solid-js";

// The toast queue, client-owned: `toast()` pushes, the Shell draws. One toast
// at a time above the bar, each gone after its time or its act.
export interface ToastEntry {
	id: number;
	sentence: string;
	act?: Act;
}

const LIFETIME_MS = 4000;

const [entries, setEntries] = createSignal<ToastEntry[]>([]);
let next = 1;

export function toast(sentence: string, act?: Act): void {
	const id = next++;
	setEntries((queue) => [...queue, { id, sentence, act }]);
	setTimeout(() => dismissToast(id), LIFETIME_MS);
}

export function dismissToast(id: number): void {
	setEntries((queue) => queue.filter((entry) => entry.id !== id));
}

export const toasts = entries;
