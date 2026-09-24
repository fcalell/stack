import type { Act } from "@fcalell/ui-core/descriptors";
import { useSyncExternalStore } from "react";

// The toast queue. `toast()` is called from anywhere; the `Shell` renders the
// queue. Client-owned, so never an undo: a toast's act is a route or a retry.
export interface ToastEntry {
	id: number;
	sentence: string;
	act?: Act;
}

const TOAST_MS = 4000;

let entries: ToastEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
	for (const listener of listeners) listener();
}

export function toast(sentence: string, act?: Act): void {
	const id = nextId++;
	entries = [...entries, { id, sentence, act }];
	emit();
	setTimeout(() => dismissToast(id), TOAST_MS);
}

export function dismissToast(id: number): void {
	if (!entries.some((entry) => entry.id === id)) return;
	entries = entries.filter((entry) => entry.id !== id);
	emit();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useToasts(): ToastEntry[] {
	return useSyncExternalStore(subscribe, () => entries);
}
