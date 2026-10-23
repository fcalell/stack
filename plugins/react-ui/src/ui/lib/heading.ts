import { createContext, useCallback, useSyncExternalStore } from "react";

// The level a Section's title reads at where it stands: the last Pane of a
// Place holds the page's `h1` and hands 2 to its body, a Pane with another
// after it holds an `h2` and hands 3; a Section hands the next level to its
// body; a Columns hands its columns the level it stands at. HTML stops at `h6`.
export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

export const HeadingContext = createContext<HeadingLevel>(2);

export const DEEPER = {
	2: 3,
	3: 4,
	4: 5,
	5: 6,
	6: 6,
} as const satisfies Record<HeadingLevel, HeadingLevel>;

// The level of the heading that names the Pane it stands in: its title, its
// record's name, or the missing form standing in for a name that never lands.
export const PaneLevel = createContext<1 | 2>(1);

// No `[data-page]` sibling follows the Pane: the "last" the Pane's class reads
// with `:not(:has(~[data-page]))`.
function lastOf(pane: HTMLElement | null): boolean {
	let next = pane?.nextElementSibling;
	while (next) {
		if (next.hasAttribute("data-page")) return false;
		next = next.nextElementSibling;
	}
	return true;
}

/**
 * Whether the Pane is its place's last, the one that names the page with its
 * `h1`, read off the DOM as Panes open and close after it. A store read through
 * `useSyncExternalStore` settles in the commit that changed it, before paint,
 * so no frame draws two `h1`s or none. A Pane alone is last. Outside the
 * package's exports.
 */
export function useLastPane(pane: HTMLElement | null): boolean {
	const subscribe = useCallback(
		(notify: () => void) => {
			const parent = pane?.parentElement;
			if (!parent) return () => {};
			const watch = new MutationObserver(notify);
			watch.observe(parent, { childList: true });
			return () => watch.disconnect();
		},
		[pane],
	);
	return useSyncExternalStore(
		subscribe,
		() => lastOf(pane),
		() => true,
	);
}
