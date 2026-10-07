// The element holding focus; a test that expects focus somewhere fails when
// nothing does.
export function focused(): HTMLElement {
	const active = document.activeElement;
	if (!(active instanceof HTMLElement)) throw new Error("nothing has focus");
	return active;
}
