import { createContext, useContext } from "react";

// A `Screen` titles itself in its top bar until an `ItemHeader` inside
// claims the heading: then the item's large title is the page's heading and
// the top bar's title shows once it scrolls away.
export type HeadingClaim = (claimed: boolean) => void;

export const HeadingContext = createContext<HeadingClaim | undefined>(
	undefined,
);

export function useHeadingClaim(): HeadingClaim | undefined {
	return useContext(HeadingContext);
}
