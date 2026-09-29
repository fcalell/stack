import { createContext, onCleanup, useContext } from "solid-js";
import type { WidthClaims } from "./measure.ts";

// What a `DefinitionRow` offers its value. `label` is the id of the row's
// label, which names a control that carries no label of its own (a `Switch`,
// a `Checkbox`), so the row's words are the control's name. A control whose
// width is its value's words (a `Picker`) claims the row for as long as it is
// mounted, and under tablet the row then stacks: the label and the
// description, then the control across the row with the act at its end, since
// a name, an address and a control's words do not share a phone's line. A
// `Switch` or a `Checkbox` is a fixed size, claims nothing, and stays beside
// its label.
export type Row = { claim: WidthClaims["claim"]; label: string };

export const RowContext = createContext<Row>();

// Returns whether the control sits in a row, which it then spans under tablet.
export function useRowClaim(): boolean {
	const row = useContext(RowContext);
	if (row) onCleanup(row.claim());
	return row !== undefined;
}

// The id of the row's label, for a control with no label of its own to be
// named by; undefined outside a row.
export function useRowLabel(): string | undefined {
	return useContext(RowContext)?.label;
}
