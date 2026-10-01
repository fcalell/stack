import { createContext } from "react";

// The level a Section's title reads at where it stands: a Place or a Screen
// holds the page's `h1` and hands 2 to its body; a Section hands the next
// level to its body, as a Columns does to its columns. HTML stops at `h6`.
export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

export const HeadingContext = createContext<HeadingLevel>(2);

export const DEEPER = {
	2: 3,
	3: 4,
	4: 5,
	5: 6,
	6: 6,
} as const satisfies Record<HeadingLevel, HeadingLevel>;
