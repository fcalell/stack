import { createContext, use, useLayoutEffect } from "react";

// What a `Group` hands its rows. `list` registers a `List` in it (however
// deep) and returns its release: a waiting Group lets its Lists draw their
// own waiting rows. Each registers in a layout effect, so the swap lands
// before paint.
export interface GroupHost {
	list: () => () => void;
}

export const GroupContext = createContext<GroupHost | undefined>(undefined);

// Registers a List with the Group around, released on unmount; returns
// whether a Group is around.
export function useGroupList(): boolean {
	const host = use(GroupContext);
	useLayoutEffect(() => host?.list(), [host]);
	return host !== undefined;
}
