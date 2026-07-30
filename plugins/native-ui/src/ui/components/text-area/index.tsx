import { type FieldState, field } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "../../lib/cn";

// A multi-line surface outgrows the field's control floor and needs its own
// vertical interior, so both ride the overlay as literal numerics.
const BOX = "min-h-20 w-full py-2 text-callout text-ink-1";

export interface TextAreaProps extends TextInputProps {
	// Same state contract as Input: `error` pins the danger border, focus
	// tracking moves the default onto the `focused` cell.
	state?: FieldState;
}

export function TextArea({
	state,
	className,
	onFocus,
	onBlur,
	...rest
}: TextAreaProps) {
	const [focused, setFocused] = useState(false);
	const resolved =
		state !== undefined && state !== "default"
			? state
			: focused
				? "focused"
				: "default";
	return (
		<TextInput
			multiline
			textAlignVertical="top"
			className={cn(
				field({ state: resolved, layout: "input" }),
				BOX,
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
