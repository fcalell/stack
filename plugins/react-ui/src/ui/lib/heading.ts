import { createContext } from "react";

// The level a Section's title reads at where it stands. A page has one `h1`,
// which the Place draws (it names where you are); every Pane's title is an
// `h2` and hands 3 to its body, so a Pane reads nothing of the Panes around
// it; a Section hands the next level to its body; a Columns hands its columns
// the level it stands at. HTML stops at `h6`.
export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

export const HeadingContext = createContext<HeadingLevel>(2);

export const DEEPER = {
	2: 3,
	3: 4,
	4: 5,
	5: 6,
	6: 6,
} as const satisfies Record<HeadingLevel, HeadingLevel>;
