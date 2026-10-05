import { type RefObject, useEffect } from "react";

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

// A foot region hands focus to its first field when what held it leaves with
// its own page (a docked `Sheet` closing for the `MessageInput` that returns):
// the document takes focus then. The region's parent swaps the foot in its own
// render, so the hook reads who held focus in that render, before the commit
// removes it, and acts after the commit.
export function useFootFocus(region: RefObject<HTMLElement | null>) {
	const held = region.current?.contains(document.activeElement) ?? false;
	useEffect(() => {
		if (held && document.activeElement === document.body)
			focusFirst(region.current, "input, textarea");
	});
}
