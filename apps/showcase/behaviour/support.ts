import {
	findings,
	focusCovered,
	format,
	settled,
} from "@fcalell/plugin-screens/walk";
import type { within } from "storybook/test";

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
export async function walked(): Promise<string[]> {
	await settled();
	return [...format(findings({ fonts: false })), ...format(focusCovered())];
}

// A Section is a heading over its body and no landmark, so it is found by the
// heading that titles it (a count after the title is part of the heading's name).
export function sectionOf(
	scope: Pick<ReturnType<typeof within>, "getByRole">,
	title: string,
): HTMLElement {
	const heading = scope.getByRole("heading", {
		name: new RegExp(`^${title}\\b`),
	});
	const section = heading.closest("section");
	if (!section) throw new Error(`no section holds the heading ${title}`);
	return section;
}
