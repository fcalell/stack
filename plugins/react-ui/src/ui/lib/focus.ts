import { type RefObject, useEffect, useRef } from "react";

// What a viewer's Tab reaches in a region: anything rendered whose effective
// tab index is 0 or more, so a button, a field, a roving radio group's one tab
// stop and a scroller that took a stop all count, in document order.
export function isTabbable(element: HTMLElement): boolean {
	return (
		element.tabIndex >= 0 &&
		!("disabled" in element && element.disabled) &&
		element.closest('[hidden], [inert], [aria-hidden="true"]') === null &&
		element.checkVisibility()
	);
}

// Focuses the first tabbable element in `root`; `only` narrows it to those
// matching a selector (a foot hands focus to its typing control, not to the
// attach act ahead of it).
export function focusFirst(root: HTMLElement | null, only?: string) {
	const all = root?.querySelectorAll<HTMLElement>("*") ?? [];
	Array.from(all)
		.find((element) => isTabbable(element) && (!only || element.matches(only)))
		?.focus();
}

// Whether focus is inside a region, as the page last moved it. A focus or a
// press landing outside the region ends the hold; one inside begins it. The
// removal of the focused element fires neither, so the hold survives it: that
// is how a region learns its focus left with its own page.
export function trackHold(
	doc: Pick<Document, "addEventListener" | "removeEventListener">,
	region: () => HTMLElement | null,
	hold: { current: boolean },
): () => void {
	const follow = (event: Event) => {
		hold.current = region()?.contains(event.target as Node | null) ?? false;
	};
	doc.addEventListener("focusin", follow, true);
	doc.addEventListener("pointerdown", follow, true);
	return () => {
		doc.removeEventListener("focusin", follow, true);
		doc.removeEventListener("pointerdown", follow, true);
	};
}

// A foot region hands focus to its first field when what held it leaves with
// its own page (a docked `Sheet` closing for the `MessageInput` that returns):
// the document takes focus then. Who held focus is tracked by the page's own
// focus and press events, never read from the DOM during a render: the React
// compiler memoizes a render-time ref read, so the answer would be the mount's.
export function useFootFocus(region: RefObject<HTMLElement | null>) {
	const held = useRef(false);
	useEffect(() => trackHold(document, () => region.current, held), [region]);
	useEffect(() => {
		if (held.current && document.activeElement === document.body) {
			held.current = false;
			focusFirst(region.current, "input, textarea");
		}
	});
}
