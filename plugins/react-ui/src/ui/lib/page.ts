import { BREAKPOINT_PX } from "@fcalell/ui-core/tokens";
import { useCallback, useState, useSyncExternalStore } from "react";

// A page (a `Place` or a `Screen`) marks its size container `data-page`. A
// molecule whose tree differs by the page's width (the Table's grid or list)
// reads it here, so a CSS `page-tablet:` switch never mounts both forms.
// Placed on the molecule's root, it finds its page in the layout phase, where
// the DOM already stands, and the state it sets re-renders before paint: the
// first frame draws the live form. The width is read off the page's box each
// render and re-read when it resizes.
const none = () => {};

/** The ref for the molecule's root and whether its page is at least `tablet` wide (`false` outside a page); `undefined` until the root is placed. */
export function usePageTablet(): [
	(node: HTMLElement | null) => void,
	boolean | undefined,
] {
	const [page, setPage] = useState<Element | null>();
	const place = useCallback((node: HTMLElement | null) => {
		if (node) setPage(node.closest("[data-page]"));
	}, []);
	const subscribe = useCallback(
		(notify: () => void) => {
			if (!page) return none;
			const watch = new ResizeObserver(notify);
			watch.observe(page);
			return () => watch.disconnect();
		},
		[page],
	);
	const wide = useSyncExternalStore(
		subscribe,
		() =>
			page ? page.getBoundingClientRect().width >= BREAKPOINT_PX.tablet : false,
		() => false,
	);
	return [place, page === undefined ? undefined : wide];
}
