import type { Act } from "@fcalell/ui-core/descriptors";
import type { ToastState } from "@fcalell/ui-core/variants";
import { createSignal } from "solid-js";

// The toast queue, client-owned: `toast()` pushes, the app root draws, so a
// page with no shell (a sign-in) shows its toasts too. One toast at a time
// above the bar, each gone after its time or its act. `state` says how the
// act it reports ended (`failed` for a refused edit, `done` for a finished
// one); without it the toast is the plain dark pill.
export interface ToastOptions {
	state?: ToastState;
	act?: Act;
}

export interface ToastEntry extends ToastOptions {
	id: number;
	sentence: string;
}

const LIFETIME_MS = 4000;

const [entries, setEntries] = createSignal<ToastEntry[]>([]);
let next = 1;

export function toast(sentence: string, options: ToastOptions = {}): void {
	const id = next++;
	setEntries((queue) => [...queue, { id, sentence, ...options }]);
	setTimeout(() => dismissToast(id), LIFETIME_MS);
}

export function dismissToast(id: number): void {
	setEntries((queue) => queue.filter((entry) => entry.id !== id));
}

export const toasts = entries;

// Where the queue stands, in pixels from the viewport's edges: the box it
// centres in (`left`, `right`) and how far above the viewport's bottom it
// starts. With no shell it is the whole viewport; a `Shell` places it over
// its column, above its tab bar and any pinned bar.
export interface ToastPlacement {
	left: number;
	right: number;
	bottom: number;
}

const VIEWPORT: ToastPlacement = { left: 0, right: 0, bottom: 0 };

const [placement, setPlacement] = createSignal<ToastPlacement>(VIEWPORT);

export const toastPlacement = placement;

export function placeToasts(next: ToastPlacement | undefined): void {
	setPlacement(next ?? VIEWPORT);
}
