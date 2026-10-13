import { findings, focusCovered, format } from "@fcalell/plugin-screens/walk";

// The element holding focus; a test that expects focus somewhere fails when
// nothing does.
export function focused(): HTMLElement {
	const active = document.activeElement;
	if (!(active instanceof HTMLElement)) throw new Error("nothing has focus");
	return active;
}

// The render walk over the page a story left (`@fcalell/plugin-screens/walk`)
// and the focused element not hidden under a fixed or sticky one: the lines of
// what breaks a rule, empty when it keeps them. A story calls it where it ends
// in a state a click or a key reached (an open popup, a dialog's returned
// focus).
export function walked(): string[] {
	return [...format(findings({ fonts: false })), ...format(focusCovered())];
}
