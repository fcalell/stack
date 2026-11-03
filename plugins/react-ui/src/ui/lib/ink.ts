// The colour tokens a canvas draws with. A canvas has no class to restyle, so it
// reads the roles' resolved values off its own element, once per mode: the
// version moves when the mode or the density pin changes on the root, and a
// reader draws again.
let version = 0;
let watch: MutationObserver | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
	if (listeners.size === 0) {
		watch = new MutationObserver(() => {
			version++;
			for (const each of listeners) each();
		});
		watch.observe(document.documentElement, {
			attributeFilter: ["class", "data-density"],
		});
	}
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
		if (listeners.size > 0) return;
		watch?.disconnect();
		watch = undefined;
	};
}

/** Follows the mode: `listener` is called when the root's mode or density changes, and the returned function stops it. */
export const onInkChange = subscribe;

/** The version of the ink: a cached colour is valid while it holds. */
export const inkVersion = (): number => version;

/** A colour role's resolved value on `element` (`ink-body`, `chip-amber`), a CSS colour a canvas takes. */
export function inkOf(element: Element, role: string): string {
	const value = getComputedStyle(element)
		.getPropertyValue(`--color-${role}`)
		.trim();
	return value === "" ? "currentColor" : value;
}
