import {
	defaultScheduler,
	focusManager,
	notifyManager,
	onlineManager,
	type QueryClient,
} from "@tanstack/react-query";

// The hook that runs a read's first answer as a move: given the flush of the
// batch that carries it, a UI plugin runs that inside a view transition (web)
// or after `LayoutAnimation.configureNext` (phone), so the waiting form is
// still on screen when the move starts. Every other batch flushes as before.
export type Settle = (flush: () => void) => void;

// A batch changes a read's form: its first data, its first failure with no
// data, or a reset back to waiting. A refetch, a retried failure and a write
// over data are not flips: the form stays.
export function flips(
	action: { type: string },
	s: {
		data: unknown;
		status: string;
		dataUpdateCount: number;
		errorUpdateCount: number;
	},
): boolean {
	switch (action.type) {
		case "success":
			return s.dataUpdateCount === 1;
		case "error":
			return s.data === undefined && s.errorUpdateCount === 1;
		case "setState":
			return s.data === undefined && s.status === "pending";
		default:
			return false;
	}
}

// Why a scheduler and not a batch function: a query's dispatch notifies the
// cache listener inline, before the observers' queued notifications flush, so
// a mark set there is still standing when `flush()` calls the scheduler,
// synchronously, at the end of that same batch. `setBatchNotifyFunction` runs
// later, inside the scheduled tick, where an earlier batch could take the mark.
export function settleReads(client: QueryClient, settle: Settle): () => void {
	let marked = false;
	// The callbacks of the batches waiting on the settle in flight.
	let pending: (() => void)[] | null = null;
	const unsubscribe = client.getQueryCache().subscribe((event) => {
		if (
			event.type === "updated" &&
			flips(event.action, event.query.state) &&
			event.query.getObserversCount() > 0
		) {
			marked = true;
			// A batch with nothing queued never reaches the scheduler.
			queueMicrotask(() => {
				marked = false;
			});
		}
	});
	notifyManager.setScheduler((cb) => {
		// A batch that lands while a settle is pending joins it, in order.
		if (pending) {
			pending.push(cb);
			return;
		}
		if (!marked) return defaultScheduler(cb);
		marked = false;
		pending = [cb];
		settle(() => {
			const batches = pending ?? [];
			pending = null;
			for (const batch of batches) batch();
		});
	});
	return () => {
		unsubscribe();
		notifyManager.setScheduler(defaultScheduler);
	};
}

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
