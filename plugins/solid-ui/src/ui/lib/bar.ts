import { createContext, useContext } from "solid-js";

// Where an `ActionBar` sits: pinned above the home indicator as a `Screen`'s
// direct child, in flow inside a `Form` or a `Sheet`. The nearest provider
// wins, so a form inside a screen keeps its bar with its fields.
export type BarPlacement = "pinned" | "flow";

export const BarContext = createContext<BarPlacement>("flow");

export function useBarPlacement(): BarPlacement {
	return useContext(BarContext);
}
