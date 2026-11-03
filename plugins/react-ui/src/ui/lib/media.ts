import { DESKTOP_MEDIA } from "@fcalell/plugin-react-ui/density";
import { createStore } from "@fcalell/ui-core/store";
import type { Size, SpacingRole } from "@fcalell/ui-core/tokens";
import { createContext, use, useSyncExternalStore } from "react";

// The density rule the `touch:` variant and the density layer draw by: a room
// (a root pinned to it, or a `Place` that declares its `distance`), the
// touch pin, or no desktop pin outside the desktop query (a fine pointer at
// `tablet` and wider). A molecule whose tree differs by density (the Shell's
// sidebar or tab bar) reads it here, so its structure and the token set
// cannot disagree.
// Every caller reads one store: one cached query, one observer of the pin,
// one set of listeners, wired while any caller listens.
let desktop: MediaQueryList | undefined;

function desktopQuery(): MediaQueryList {
	desktop ??= matchMedia(DESKTOP_MEDIA);
	return desktop;
}

function touchNow(): boolean {
	const pinned = document.documentElement.dataset.density;
	if (pinned === "room" || pinned === "touch") return true;
	if (pinned === "desktop") return false;
	return !desktopQuery().matches;
}

const density = createStore(undefined, {
	source: (store) => {
		const query = desktopQuery();
		query.addEventListener("change", store.emit);
		const pin = new MutationObserver(store.emit);
		pin.observe(document.documentElement, {
			attributeFilter: ["data-density"],
		});
		return () => {
			query.removeEventListener("change", store.emit);
			pin.disconnect();
		};
	},
});

// A `Place` that declares its `distance` as `room` hands it down, so what
// stands inside draws the touch tree whatever the pointer.
export const DistanceContext = createContext(false);

export function useTouch(): boolean {
	const far = use(DistanceContext);
	const touch = useSyncExternalStore(density.subscribe, touchNow, () => false);
	return far || touch;
}

const REDUCED = "(prefers-reduced-motion: reduce)";

const reduced = createStore(undefined, {
	source: (store) => {
		const query = matchMedia(REDUCED);
		query.addEventListener("change", store.emit);
		return () => query.removeEventListener("change", store.emit);
	},
});

// Whether the viewer asks for reduced motion now: what is read once, as a
// script starts (a scramble, a decode), rather than followed.
export const reducedNow = (): boolean => matchMedia(REDUCED).matches;

// Whether the viewer asked for reduced motion: a part that moves by script
// (a Web Animation, which CSS cannot still) reads it here.
export function useReducedMotion(): boolean {
	return useSyncExternalStore(
		reduced.subscribe,
		() => matchMedia(REDUCED).matches,
		() => false,
	);
}

// A spacing role or a size in pixels at the current density (a popup's
// offset, a glyph's side), read off the root so it follows the density.
export function spacing(role: SpacingRole | Size): number {
	return Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue(
			`--spacing-${role}`,
		),
	);
}
