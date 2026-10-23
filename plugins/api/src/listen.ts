import { focusManager, onlineManager } from "@tanstack/react-query";

// What TanStack's two managers listen to, given by a UI plugin whose platform
// has no window events (the phone: the network and the app's foreground).
// Each takes the manager's setter and returns its cleanup.
export interface QueryListeners {
	online?: (set: (online: boolean) => void) => () => void;
	focus?: (set: (focused: boolean) => void) => () => void;
}

// The managers' own defaults (they keep them private), put back when the
// provider that replaced them unmounts.
const windowOnline: NonNullable<QueryListeners["online"]> = (set) => {
	if (typeof window === "undefined" || !window.addEventListener) {
		return () => {};
	}
	const on = () => set(true);
	const off = () => set(false);
	window.addEventListener("online", on, false);
	window.addEventListener("offline", off, false);
	return () => {
		window.removeEventListener("online", on);
		window.removeEventListener("offline", off);
	};
};

const windowFocus: NonNullable<QueryListeners["focus"]> = (set) => {
	if (typeof window === "undefined" || !window.addEventListener) {
		return () => {};
	}
	// A visibility change re-reads the document, so no value is given.
	const on = () => (set as () => void)();
	window.addEventListener("visibilitychange", on, false);
	return () => window.removeEventListener("visibilitychange", on);
};

export function listenQueries(listen: QueryListeners): () => void {
	if (listen.online) onlineManager.setEventListener(listen.online);
	if (listen.focus) focusManager.setEventListener(listen.focus);
	return () => {
		if (listen.online) onlineManager.setEventListener(windowOnline);
		if (listen.focus) focusManager.setEventListener(windowFocus);
	};
}
