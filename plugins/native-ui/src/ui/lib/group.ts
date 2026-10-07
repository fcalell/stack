import { HAIRLINE } from "@fcalell/ui-core/variants";
import { createContext, useContext, useLayoutEffect } from "react";
import { cn } from "./cn";

// What a `Group` hands its rows. `part` registers a part in it that has its
// own waiting form (a `List`, a `Meter`, a `Slider`, a `DefinitionRow`),
// however deep, and returns its release: a waiting Group lets those parts
// draw their own waiting forms. Each registers in a layout effect, so the swap
// lands before paint.
export interface GroupHost {
	part: () => () => void;
}

export const GroupContext = createContext<GroupHost | undefined>(undefined);

// Registers a part with the Group around, released on unmount; returns
// whether a Group is around.
export function useGroupPart(): boolean {
	const host = useContext(GroupContext);
	useLayoutEffect(() => host?.part(), [host]);
	return host !== undefined;
}

// `GROUP`'s `divide-*` is a child selector uniwind drops, so each row of a
// group after the first draws the hairline above it, on its own wrapper.
export function between(index: number): string {
	return cn(index > 0 && "border-t", index > 0 && HAIRLINE);
}
