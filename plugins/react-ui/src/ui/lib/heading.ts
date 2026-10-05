import { createContext } from "react";

// The level a Section's title reads at where it stands: a Place or a Screen
// holds the page's `h1` and hands 2 to its body; a Section hands the next
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

// A Screen titles at the page's `h1` and hands 2 to its body. A record beside
// a Split's main titles at the level where it stands and hands the next to its
// body, at every width: where its head stands alone the Place's `h1` stays
// read, unseen, so the outline is the same at every width.
export function screenLevels(
	beside: boolean,
	level: HeadingLevel,
): { title: 1 | HeadingLevel; body: HeadingLevel } {
	return beside ? { title: level, body: DEEPER[level] } : { title: 1, body: 2 };
}
