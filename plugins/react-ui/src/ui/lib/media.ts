import {
	BREAKPOINT_PX,
	type Breakpoint,
	type SpacingRole,
} from "@fcalell/ui-core/tokens";
import { useSyncExternalStore } from "react";

const FINE = "(pointer: fine)";

// The density rule the `touch:` variant and the density layer draw by: the
// touch pin, or no desktop pin where the primary pointer is not fine. A
// molecule whose tree differs by density (the Shell's sidebar or tab bar)
// reads it here, so its structure and the token set cannot disagree.
function touch(): boolean {
	const pin = document.documentElement.dataset.density;
	if (pin === "touch" || pin === "desktop") return pin === "touch";
	return !matchMedia(FINE).matches;
}

function onDensity(notify: () => void): () => void {
	const pointer = matchMedia(FINE);
	pointer.addEventListener("change", notify);
	const pin = new MutationObserver(notify);
	pin.observe(document.documentElement, { attributeFilter: ["data-density"] });
	return () => {
		pointer.removeEventListener("change", notify);
		pin.disconnect();
	};
}

export function useTouch(): boolean {
	return useSyncExternalStore(onDensity, touch, () => false);
}

// Whether the viewport is at least a breakpoint wide, the query the
// breakpoint's variant (`wide:`) compiles to.
export function useAtLeast(breakpoint: Breakpoint): boolean {
	const query = `(min-width: ${BREAKPOINT_PX[breakpoint]}px)`;
	return useSyncExternalStore(
		(notify) => {
			const media = matchMedia(query);
			media.addEventListener("change", notify);
			return () => media.removeEventListener("change", notify);
		},
		() => matchMedia(query).matches,
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
