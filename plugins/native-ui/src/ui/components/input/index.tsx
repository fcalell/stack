import { type FieldState, field } from "@fcalell/ui-core/variants";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "../../lib/cn";
import { useFieldState } from "../../lib/field";

export interface InputProps extends TextInputProps {
	// `error` pins the danger border; web reaches the same cell via
	// `aria-invalid:`. Left at `default`, `useFieldState` moves the field onto
	// the `focused` cell, the native counterpart of `focus-visible:`.
	state?: FieldState;
}

export function Input({
	state,
	className,
	onFocus,
	onBlur,
	...rest
}: InputProps) {
	const tracked = useFieldState(state, onFocus, onBlur);
	return (
		<TextInput
			className={cn(
				field({ state: tracked.state, layout: "input" }),
				"w-full text-callout text-ink-1",
				className,
			)}
			placeholderTextColorClassName="text-ink-3"
			onFocus={tracked.onFocus}
			onBlur={tracked.onBlur}
			{...rest}
		/>
	);
}
