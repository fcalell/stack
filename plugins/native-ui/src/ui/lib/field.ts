import type { FieldState } from "@fcalell/ui-core/variants";
import { useState } from "react";
import type { TextInputProps } from "react-native";

// The state resolution Input and TextArea share. Web reaches FIELD's focused
// cell through `focus-visible:`; uniwind has no focus variant, so the field
// surfaces track focus themselves. An explicit non-default `state` (an error,
// or a pinned focus) wins over the tracking.
export function useFieldState(
	state: FieldState | undefined,
	onFocus: TextInputProps["onFocus"],
	onBlur: TextInputProps["onBlur"],
): {
	state: FieldState;
	onFocus: NonNullable<TextInputProps["onFocus"]>;
	onBlur: NonNullable<TextInputProps["onBlur"]>;
} {
	const [focused, setFocused] = useState(false);
	return {
		state:
			state !== undefined && state !== "default"
				? state
				: focused
					? "focused"
					: "default",
		onFocus: (event) => {
			setFocused(true);
			onFocus?.(event);
		},
		onBlur: (event) => {
			setFocused(false);
			onBlur?.(event);
		},
	};
}
