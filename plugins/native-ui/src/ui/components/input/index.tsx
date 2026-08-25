import { type FieldState, field } from "@fcalell/ui-core/variants";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "../../lib/cn";
import { useFieldState } from "../../lib/field";

export interface InputProps extends TextInputProps {
	// `error` pins the danger border; web reaches the same cell via
	// `aria-invalid:`. Left at `default`, `useFieldState` moves the field onto
	// the `focused` cell, the native counterpart of `focus-visible:`.
	state?: FieldState;
	className?: never;
	style?: never;
	// uniwind's per-prop class channels close with the closure; the component
	// keeps setting placeholderTextColorClassName on its own element below.
	placeholderTextColorClassName?: never;
	cursorColorClassName?: never;
	selectionColorClassName?: never;
	selectionHandleColorClassName?: never;
	underlineColorAndroidClassName?: never;
}

export function Input({ state, onFocus, onBlur, ...rest }: InputProps) {
	const tracked = useFieldState(state, onFocus, onBlur);
	return (
		<TextInput
			className={cn(
				field({ state: tracked.state, layout: "input" }),
				"w-full text-callout text-ink-1",
			)}
			placeholderTextColorClassName="text-ink-3"
			onFocus={tracked.onFocus}
			onBlur={tracked.onBlur}
			{...rest}
		/>
	);
}
