import { type BeforeLeaveEventArgs, useBeforeLeave } from "@solidjs/router";
import { createSignal, onCleanup } from "solid-js";

export interface LeaveGuard {
	// A navigation is waiting on the viewer's answer: open the confirming
	// `Sheet` while this is true.
	pending: () => boolean;
	// Discard the work and finish the navigation.
	leave: () => void;
	// Keep the work and stay.
	stay: () => void;
}

// Holds in-app navigation while `dirty()` so the screen can confirm in its
// own words, and asks the browser to confirm closing or reloading the tab,
// the one prompt a page may raise there.
export function useLeaveGuard(dirty: () => boolean): LeaveGuard {
	const [held, setHeld] = createSignal<BeforeLeaveEventArgs>();

	useBeforeLeave((event) => {
		if (event.defaultPrevented || !dirty()) return;
		event.preventDefault();
		setHeld(() => event);
	});

	const onUnload = (event: BeforeUnloadEvent) => {
		if (dirty()) event.preventDefault();
	};
	window.addEventListener("beforeunload", onUnload);
	onCleanup(() => window.removeEventListener("beforeunload", onUnload));

	return {
		pending: () => held() !== undefined,
		leave: () => {
			const event = held();
			setHeld(undefined);
			event?.retry(true);
		},
		stay: () => setHeld(undefined),
	};
}
