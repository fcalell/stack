import { Toast } from "@base-ui/react/toast";
import type { LinkAct } from "@fcalell/ui-core/descriptors";
import type { Tone } from "@fcalell/ui-core/tokens";
import { createContext } from "react";
import type { Act } from "./act.ts";

// How the act a toast reports ended (its glyph in the tone's ink, `done` by
// default), and an
// act it offers (a route or a retry; client-owned, so never an undo).
export interface ToastOptions {
	tone?: Tone;
	act?: Act | LinkAct;
	/** Called once the toast has left, however it went. */
	onGone?: () => void;
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
		onRemove: options.onGone,
		priority: options.tone === "failed" ? "high" : "low",
	});
}

// The queued toast a `Toast` draws: the layer hands each its entry.
export const ToastEntry = createContext<
	Toast.Root.ToastObject<ToastData> | undefined
>(undefined);
