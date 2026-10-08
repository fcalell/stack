import { Toast } from "@base-ui/react/toast";
import type { Act } from "@fcalell/ui-core/descriptors";
import type { ToastState } from "@fcalell/ui-core/variants";
import { createContext } from "react";

// How the act a toast reports ended (its glyph in the state's ink), and an
// act it offers (a route or a retry; client-owned, so never an undo).
export interface ToastOptions {
	state?: ToastState;
	act?: Act;
}

// The app's toast queue: `toast()` is called from anywhere, and the Shell
// stands the queue in its toasts' layer. A failed one is announced at once.
export interface ToastData extends ToastOptions {
	sentence: string;
}

export const toasts = Toast.createToastManager<ToastData>();

/** Queues a toast: `sentence` is what happened (a sentence; wraps). */
export function toast(sentence: string, options: ToastOptions = {}): void {
	toasts.add({
		description: sentence,
		data: { sentence, ...options },
		priority: options.state === "failed" ? "high" : "low",
	});
}

// The queued toast a `Toast` draws: the layer hands each its entry.
export const ToastEntry = createContext<
	Toast.Root.ToastObject<ToastData> | undefined
>(undefined);
