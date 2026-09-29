import { createContext, onCleanup, useContext } from "solid-js";
import type { WidthClaims } from "./measure.ts";

// What a `DefinitionRow` offers its value. A control whose width is its
// value's words (a `Picker`) claims the row for as long as it is mounted, and
// under tablet the row then stacks: the label and the description, then the
// control across the row with the act at its end, since a name, an address
// and a control's words do not share a phone's line. A `Switch` or a
// `Checkbox` is a fixed size, claims nothing, and stays beside its label.
export const RowContext = createContext<WidthClaims["claim"]>();

// Returns whether the control sits in a row, which it then spans under tablet.
export function useRowClaim(): boolean {
	const claim = useContext(RowContext);
	if (claim) onCleanup(claim());
	return claim !== undefined;
}
