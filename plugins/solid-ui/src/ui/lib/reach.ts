import { onCleanup } from "solid-js";

// A scroller a keyboard can reach. It takes focus only while it holds
// nothing focusable: with a focusable child, Tab reaches the child and the
// browser scrolls to it, and an extra stop before every screen's content
// would only slow the keyboard down. Chrome makes such scrollers focusable
// on its own; Safari does not, so the attribute is set here. Used as a ref.
const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

export function reachable(scroller: HTMLElement) {
	const update = () => {
		// Only a change writes, so the observer never answers its own write.
		const holds = scroller.querySelector(FOCUSABLE) !== null;
		if (holds && scroller.hasAttribute("tabindex"))
			scroller.removeAttribute("tabindex");
		else if (!holds && !scroller.hasAttribute("tabindex"))
			scroller.setAttribute("tabindex", "0");
	};
	update();
	const observer = new MutationObserver(update);
	observer.observe(scroller, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: ["tabindex", "disabled", "href", "contenteditable"],
	});
	onCleanup(() => observer.disconnect());
}
