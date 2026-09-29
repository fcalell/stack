// Whether focus is free for a control drawn now to take: nothing holds it
// (the body), or what held it was just removed, as a form step's submit
// button is when the next step replaces it. A control never pulls focus off
// an element the viewer is still in.
export function focusIsFree(active: Element | null): boolean {
	return (
		active === null ||
		active === active.ownerDocument.body ||
		!active.isConnected
	);
}
