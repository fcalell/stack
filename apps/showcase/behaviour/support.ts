// An element is out of the accessibility tree when it or an ancestor is
// `inert` or `aria-hidden`, which is how a modal hides the page behind it.
export function hiddenFromAssistiveTech(element: Element): boolean {
	return element.closest('[inert], [aria-hidden="true"]') !== null;
}

// The element holding focus; a test that expects focus somewhere fails when
// nothing does.
export function focused(): HTMLElement {
	const active = document.activeElement;
	if (!(active instanceof HTMLElement)) throw new Error("nothing has focus");
	return active;
}
