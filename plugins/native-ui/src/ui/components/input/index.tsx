import { type FieldState, field } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "../../lib/cn";

export interface InputProps extends TextInputProps {
	// `error` pins the danger border; web reaches the same cell via
	// `aria-invalid:`. Left at `default`, focus tracking below moves the field
	// onto the `focused` cell, the native counterpart of `focus-visible:`.
	state?: FieldState;
}

export function Input({
	state,
	className,
	onFocus,
	onBlur,
	...rest
}: InputProps) {
	const [focused, setFocused] = useState(false);
	const resolved =
		state !== undefined && state !== "default"
			? state
			: focused
				? "focused"
				: "default";
	return (
		<TextInput
			className={cn(
				field({ state: resolved, layout: "input" }),
				"w-full text-callout text-ink-1",
				className,
			)}
			placeholderTextColorClassName="text-ink-3"
			onFocus={(event) => {
				setFocused(true);
				onFocus?.(event);
			}}
			onBlur={(event) => {
				setFocused(false);
				onBlur?.(event);
			}}
			{...rest}
		/>
	);
}
