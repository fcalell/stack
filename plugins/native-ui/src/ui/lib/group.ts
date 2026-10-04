import { HAIRLINE } from "@fcalell/ui-core/variants";
import { createContext, useContext, useLayoutEffect } from "react";
import { cn } from "./cn";

// What a `Group` hands its rows. `list` registers a `List` in it (however
// deep), with whether the List is busy, and returns its release: a waiting
// Group lets its Lists draw their own waiting rows, and a busy List makes
// the Group busy, since the Group is the List's box. Each registers in a
// layout effect, so the swap lands before paint.
export interface GroupHost {
	list: (busy: boolean) => () => void;
}

export const GroupContext = createContext<GroupHost | undefined>(undefined);

// Registers a List with the Group around, released on unmount or as its
// busy state changes; returns whether a Group is around.
export function useGroupList(busy: boolean): boolean {
	const host = useContext(GroupContext);
	useLayoutEffect(() => host?.list(busy), [host, busy]);
	return host !== undefined;
}

// `GROUP`'s `divide-*` is a child selector uniwind drops, so each row of a
// group after the first draws the hairline above it, on its own wrapper.
export function between(index: number): string {
	return cn(index > 0 && "border-t", index > 0 && HAIRLINE);
}
