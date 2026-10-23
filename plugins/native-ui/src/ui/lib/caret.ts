import { useState } from "react";
import type { TextInputProps } from "react-native";

// A field that opens for editing in place of what the viewer read ends its text
// under the caret. The selection is a prop for the first render only: left on,
// it would pin the caret against the viewer's own.
export function useCaretAtEnd(
	autoFocus: boolean | undefined,
	value: string,
): Pick<TextInputProps, "selection" | "onSelectionChange"> {
	const [placed, setPlaced] = useState(!autoFocus);
	const [end] = useState(value.length);
	if (placed) return {};
	return {
		selection: { start: end, end },
		onSelectionChange: () => setPlaced(true),
	};
}
