import { createContext, useContext } from "solid-js";

// Where an `ActionBar` sits: pinned above the home indicator as a `Screen`'s
// direct child, in flow inside a `Form` or a `Sheet`. The nearest provider
// wins, so a form inside a screen keeps its bar with its fields.
export type BarPlacement = "pinned" | "flow";

export const BarContext = createContext<BarPlacement>("flow");

export function useBarPlacement(): BarPlacement {
	return useContext(BarContext);
}

// A bar pinned as a `Screen`'s child: the body's last element, stuck to the
// bottom of the scroll on the surface, bleeding to the body's edges and
// clearing the home indicator. The `ActionBar` and the `MessageInput` pin
// this way. A sticky edge sits inside the scroller's padding, so the bar's
// offset is minus that padding to meet the scroller's bottom edge.
export const PINNED =
	"sticky -bottom-section -mx-inset mt-auto -mb-section bg-surface px-inset pt-stack pb-[max(env(safe-area-inset-bottom),var(--spacing-stack))] tablet:-mx-section tablet:px-section";
