import type {
	InputOf,
	OutputOf,
	ProcedureCall,
} from "@fcalell/plugin-api/types";
import {
	findings,
	focusCovered,
	format,
	settled,
} from "@fcalell/plugin-screens/walk";
import type { within } from "storybook/test";
import { orpc } from "../src/app/lib/api.ts";

/** The input of the showcase's `forms.submit` procedure. */
export type FormInput = Parameters<typeof orpc.forms.submit.call>[0];

// A procedure as the client has it, with the run in place of the wire: a form
// reads its schema off the real procedure's key and submits through the
// mutation it would. `onSuccess` is what the app's own mutation does once the
// run resolves (an invalidation of what it wrote).
export function through<P extends ProcedureCall>(
	real: P,
	run: (input: InputOf<P>) => Promise<OutputOf<P>>,
	onSuccess?: () => unknown,
): P {
	return {
		call: real.call,
		mutationKey: real.mutationKey,
		mutationOptions: () => ({
			...(real.mutationOptions() as object),
			mutationFn: run,
			onSuccess,
		}),
	} as P;
}

// `forms.submit` through a run, for the stories of the one big form.
export function over(run: (input: FormInput) => Promise<{ id: string }>) {
	return through(orpc.forms.submit, run);
}

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

// The first character of each line a text element draws, read off its text
// nodes' glyph boxes: a wrapped text's lines start where a box's top steps down.
export function lineStarts(element: Element): string[] {
	const starts: string[] = [];
	let top = Number.NEGATIVE_INFINITY;
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const text = node.textContent ?? "";
		for (let at = 0; at < text.length; at++) {
			const range = document.createRange();
			range.setStart(node, at);
			range.setEnd(node, at + 1);
			const box = range.getBoundingClientRect();
			if (box.width === 0 || /\s/.test(text.charAt(at))) continue;
			if (box.top > top + box.height / 2) starts.push(text.charAt(at));
			top = box.top;
		}
	}
	return starts;
}
