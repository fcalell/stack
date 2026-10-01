import { DESKTOP_MEDIA } from "@fcalell/plugin-react-ui/density";
import type { SpacingRole } from "@fcalell/ui-core/tokens";
import { useSyncExternalStore } from "react";

// The density rule the `touch:` variant and the density layer draw by: the
// touch pin, or no desktop pin outside the desktop query (a fine pointer at
// `tablet` and wider). A molecule whose tree differs by density (the Shell's
// sidebar or tab bar) reads it here, so its structure and the token set
// cannot disagree.
function touch(): boolean {
	const pin = document.documentElement.dataset.density;
	if (pin === "touch" || pin === "desktop") return pin === "touch";
	return !matchMedia(DESKTOP_MEDIA).matches;
}

function onDensity(notify: () => void): () => void {
	const desktop = matchMedia(DESKTOP_MEDIA);
	desktop.addEventListener("change", notify);
	const pin = new MutationObserver(notify);
	pin.observe(document.documentElement, { attributeFilter: ["data-density"] });
	return () => {
		desktop.removeEventListener("change", notify);
		pin.disconnect();
	};
}

export function useTouch(): boolean {
	return useSyncExternalStore(onDensity, touch, () => false);
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
