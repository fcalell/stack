import type { LinkAct } from "@fcalell/ui-core/descriptors";
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

let entries: ToastEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit(): void {
	for (const listener of listeners) listener();
}

/** Queues a toast: `sentence` is what happened (a sentence; wraps). */
export function toast(sentence: string, options: ToastOptions = {}): void {
	const id = nextId++;
	entries = [...entries, { id, sentence, ...options }];
	emit();
	setTimeout(() => dismissToast(id), TOAST_MS);
}

export function dismissToast(id: number): void {
	const gone = entries.find((entry) => entry.id === id);
	if (!gone) return;
	entries = entries.filter((entry) => entry.id !== id);
	emit();
	gone.onGone?.();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useToasts(): ToastEntry[] {
	return useSyncExternalStore(subscribe, () => entries);
}

// The queued toast a `Toast` stands for: the layer hands each its id, which it
// dismisses itself by.
export const ToastEntry = createContext<number | undefined>(undefined);
