import { createStore } from "@fcalell/ui-core/store";

// The colour tokens a canvas draws with. A canvas has no class to restyle, so it
// reads the roles' resolved values off its own element, once per mode: the
// version moves when the mode or the density pin changes on the root, and a
// reader draws again.
const version = createStore(0, {
	source: (store) => {
		const watch = new MutationObserver(() => store.set(store.get() + 1));
		watch.observe(document.documentElement, {
			attributeFilter: ["class", "data-density"],
		});
		return () => watch.disconnect();
	},
});

/** Follows the mode: `listener` is called when the root's mode or density changes, and the returned function stops it. */
export const onInkChange = version.subscribe;

/** The version of the ink: a cached colour is valid while it holds. */
export const inkVersion = version.get;

/** A colour role's resolved value on `element` (`ink-body`, `chip-amber`), a CSS colour a canvas takes. */
export function inkOf(element: Element, role: string): string {
	const value = getComputedStyle(element)
		.getPropertyValue(`--color-${role}`)
		.trim();
	return value === "" ? "currentColor" : value;
}
