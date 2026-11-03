import type { LinkAct } from "@fcalell/ui-core/descriptors";
import { createStore } from "@fcalell/ui-core/store";
import type { Tone } from "@fcalell/ui-core/tokens";
import { createContext, useSyncExternalStore } from "react";
import type { Act } from "./act";

// The toast queue. `toast()` is called from anywhere; the `Shell` renders the
// queue. Client-owned, so never an undo: a toast's act is a route or a retry.
// `tone` says how the act it reports ended (`failed` for a refused edit,
// `done`, the default, for a finished one).
export interface ToastOptions {
	tone?: Tone;
	act?: Act | LinkAct;
	// Called once the toast has left, however it went.
	onGone?: () => void;
}

export interface ToastEntry extends ToastOptions {
	id: number;
	sentence: string;
}

const TOAST_MS = 4000;

const entries = createStore<ToastEntry[]>([]);
let nextId = 1;

/** Queues a toast: `sentence` is what happened (a sentence; wraps). */
export function toast(sentence: string, options: ToastOptions = {}): void {
	const id = nextId++;
	entries.set([...entries.get(), { id, sentence, ...options }]);
	setTimeout(() => dismissToast(id), TOAST_MS);
}

export function dismissToast(id: number): void {
	const queue = entries.get();
	const gone = queue.find((entry) => entry.id === id);
	if (!gone) return;
	entries.set(queue.filter((entry) => entry.id !== id));
	gone.onGone?.();
}

export function useToasts(): ToastEntry[] {
	return useSyncExternalStore(entries.subscribe, entries.get);
}

// The queued toast a `Toast` stands for: the layer hands each its id, which it
// dismisses itself by.
export const ToastEntry = createContext<number | undefined>(undefined);
