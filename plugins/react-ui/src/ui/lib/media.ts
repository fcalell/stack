import { DESKTOP_MEDIA } from "@fcalell/plugin-react-ui/density";
import type { SpacingRole } from "@fcalell/ui-core/tokens";
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
let pin: MutationObserver | undefined;
const listeners = new Set<() => void>();

function desktopQuery(): MediaQueryList {
	desktop ??= matchMedia(DESKTOP_MEDIA);
	return desktop;
}

function touchNow(): boolean {
	const pinned = document.documentElement.dataset.density;
	if (pinned === "room") return true;
	if (pinned === "touch" || pinned === "desktop") return pinned === "touch";
	return !desktopQuery().matches;
}

function notify(): void {
	for (const listener of listeners) listener();
}

function onDensity(listener: () => void): () => void {
	if (listeners.size === 0) {
		desktopQuery().addEventListener("change", notify);
		pin = new MutationObserver(notify);
		pin.observe(document.documentElement, {
			attributeFilter: ["data-density"],
		});
	}
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
		if (listeners.size > 0) return;
		desktopQuery().removeEventListener("change", notify);
		pin?.disconnect();
		pin = undefined;
	};
}

// A `Place` that declares its `distance` as `room` hands it down, so what
// stands inside draws the touch tree whatever the pointer.
export const RoomContext = createContext(false);

export function useTouch(): boolean {
	const room = use(RoomContext);
	const touch = useSyncExternalStore(onDensity, touchNow, () => false);
	return room || touch;
}

const REDUCED = "(prefers-reduced-motion: reduce)";

function onReduced(notify: () => void): () => void {
	const query = matchMedia(REDUCED);
	query.addEventListener("change", notify);
	return () => query.removeEventListener("change", notify);
}

// Whether the viewer asked for reduced motion: a part that moves by script
// (a Web Animation, which CSS cannot still) reads it here.
export function useReducedMotion(): boolean {
	return useSyncExternalStore(
		onReduced,
		() => matchMedia(REDUCED).matches,
		() => false,
	);
}

// A spacing role in pixels at the current density, for a popup's offset
// from its trigger, read off the root so it follows the density.
export function spacing(role: SpacingRole): number {
	return Number.parseFloat(
		getComputedStyle(document.documentElement).getPropertyValue(
			`--spacing-${role}`,
		),
	);
}
