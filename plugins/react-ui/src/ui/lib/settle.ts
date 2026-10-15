import { createSettle } from "@fcalell/ui-core/settle";
import type { CSSProperties } from "react";
import { useId } from "react";
import { flushSync } from "react-dom";

// The input types that take typed text; any other (a checkbox, a button) takes
// a press, which a move under it does not cost.
const TEXT_INPUTS = new Set([
	"text",
	"search",
	"email",
	"url",
	"tel",
	"password",
	"number",
	"date",
	"datetime-local",
	"month",
	"time",
	"week",
]);

// Whether `el` takes typed text: a text-like input, a textarea or an editable host.
function isEditable(el: Element | null): boolean {
	if (!(el instanceof HTMLElement)) return false;
	if (el instanceof HTMLInputElement) return TEXT_INPUTS.has(el.type);
	return el instanceof HTMLTextAreaElement || el.isContentEditable;
}

/**
 * The page's one coordinator (`@fcalell/ui-core/settle`): the switches of a
 * frame run together in one view transition. A running transition is any the
 * document holds, the router's among them; a viewer typing in a field gets the
 * switch at once, so a move never costs the caret.
 */
export const settle = createSettle({
	frame: (run) => requestAnimationFrame(() => run()),
	reduced: () => matchMedia("(prefers-reduced-motion: reduce)").matches,
	hidden: () => document.hidden,
	typing: () => isEditable(document.activeElement),
	running: () =>
		(document as { activeViewTransition?: unknown }).activeViewTransition !=
			null ||
		document
			.getAnimations()
			.some((one) =>
				(one.effect as KeyframeEffect | null)?.pseudoElement?.startsWith(
					"::view-transition",
				),
			),
	start: (update) => {
		if (!document.startViewTransition) return undefined;
		const moving = document.startViewTransition(update);
		moving.ready.catch(() => {});
		return moving;
	},
	flush: (run) => flushSync(run),
});

/**
 * The name a `Section` or `Group` root takes for the settle: unique to the
 * instance, so the browser moves it from its old place to its new on its own.
 */
export function useSettleName(): CSSProperties {
	return { viewTransitionName: `settle-${useId().replace(/[^\w-]/g, "")}` };
}

// The minimum hold on a read's first write (`timings.waitMin`), handed to
// `QueryProvider` beside `settle`.
export { holdFor } from "@fcalell/ui-core/paint";
