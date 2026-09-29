import { createContext, useContext, useEffect } from "react";

// What a `DefinitionRow` offers its value. A control whose width is its
// value's words (a `Picker`) claims the row for as long as it is mounted, and
// the row then stacks: the label and the description, then the control
// across the row with the act at its end, since a name, an address and a
// control's words do not share a phone's line, and native draws the phone at
// every width. A `Switch` or a `Checkbox` is a fixed size, claims nothing,
// and stays beside its label.
export type RowClaim = (claimed: boolean) => void;

export const RowContext = createContext<RowClaim | undefined>(undefined);

export function useRowClaim(): void {
	const claim = useContext(RowContext);
	useEffect(() => {
		claim?.(true);
		return () => claim?.(false);
	}, [claim]);
}
