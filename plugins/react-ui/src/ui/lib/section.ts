import { createContext, use, useId, useLayoutEffect } from "react";

// What a `Section` hands its body. `wait` registers a waiter (a
// `QueryBoundary` or a `List` whose items are pending) and returns its
// release: the Section is in its loading form (busy, its count waiting)
// while any waiter is registered. `count` registers a list's item count
// (none while its items wait) and returns its release: a Section with no
// `count` of its own counts its lists' items. `rows` registers a body of
// rows (a `Group` or a `List`, however deep): a loading Section with none
// waits as fields, one skeleton per `FormField` that `field` registered.
// Each registers in a layout effect, so the Section's head and body land in
// one paint. Its presence is what draws an `EmptyState` in its framed form.
export interface SectionHost {
	wait: () => () => void;
	count: (id: string, value: number | undefined) => () => void;
	rows: () => () => void;
	field: () => () => void;
}

export const SectionContext = createContext<SectionHost | undefined>(undefined);

// Registers with the Section around while `pending`, released when it
// settles or unmounts; returns whether a Section is around.
export function useSectionWait(pending: boolean): boolean {
	const host = use(SectionContext);
	useLayoutEffect(() => {
		if (!pending || !host) return;
		return host.wait();
	}, [pending, host]);
	return host !== undefined;
}

// Reports a list's item count to the Section around, released on unmount.
export function useSectionCount(value: number | undefined): void {
	const host = use(SectionContext);
	const id = useId();
	useLayoutEffect(() => {
		if (!host) return;
		return host.count(id, value);
	}, [host, id, value]);
}

// Tells the Section around that its body holds a field, released on unmount.
export function useSectionField(): void {
	const host = use(SectionContext);
	useLayoutEffect(() => host?.field(), [host]);
}

// Tells the Section around that its body holds rows, released on unmount.
export function useSectionRows(): void {
	const host = use(SectionContext);
	useLayoutEffect(() => host?.rows(), [host]);
}
