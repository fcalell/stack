import { createContext, useContext } from "solid-js";

// A `Screen` draws its title as the page's heading until an `ItemHeader`
// inside it claims the heading: then the item's title is the one heading,
// and the screen's compact title appears once that one scrolls away. The
// value is the claiming heading's element, `null` while it has none yet,
// `undefined` when released.
export type HeadingClaim = (heading: HTMLElement | null | undefined) => void;

export const HeadingContext = createContext<HeadingClaim>();

export function useHeadingClaim(): HeadingClaim | undefined {
	return useContext(HeadingContext);
}
