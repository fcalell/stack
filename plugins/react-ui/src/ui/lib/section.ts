import { createContext } from "react";

// What a `Section` hands its body: the call that puts the Section in its
// loading form (busy, its count waiting) while a `QueryBoundary` inside
// waits. Its presence is what draws an `EmptyState` in its framed form.
export const SectionContext = createContext<
	((waiting: boolean) => void) | undefined
>(undefined);
