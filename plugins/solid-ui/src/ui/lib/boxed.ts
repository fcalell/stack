import { createContext, useContext } from "solid-js";

// Inside a `Group` a row sits in the box, inset by the box. Outside one, on
// the bare surface, a row's text aligns with the content around it and its
// pressed fill bleeds into the side inset.
export const BoxedContext = createContext(false);

export function useBoxed(): boolean {
	return useContext(BoxedContext);
}
