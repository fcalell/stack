import { createContext } from "react";

// The level a Section's title reads at where it stands: a Place or a Screen
// holds an `h1`, pushed or beside, and hands 2 to its body; a Section hands the next
// level to its body; a Columns hands its columns the level it stands at.
// HTML stops at `h6`.
export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

export const HeadingContext = createContext<HeadingLevel>(2);

export const DEEPER = {
	2: 3,
	3: 4,
	4: 5,
	5: 6,
	6: 6,
} as const satisfies Record<HeadingLevel, HeadingLevel>;
