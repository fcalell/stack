import type { Act } from "@fcalell/ui-core/descriptors";
import type { ToastState } from "@fcalell/ui-core/variants";
import { useSyncExternalStore } from "react";

// The toast queue. `toast()` is called from anywhere; the `Shell` renders the
// queue. Client-owned, so never an undo: a toast's act is a route or a retry.
// `state` says how the act it reports ended (`failed` for a refused edit,
// `done` for a finished one); without it the toast is the plain dark pill.
export interface ToastOptions {
	state?: ToastState;
	act?: Act;
}

export interface ToastEntry extends ToastOptions {
	id: number;
	sentence: string;
}

const TOAST_MS = 4000;

let entries: ToastEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
	for (const listener of listeners) listener();
}

export function toast(sentence: string, options: ToastOptions = {}): void {
	const id = nextId++;
	entries = [...entries, { id, sentence, ...options }];
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
