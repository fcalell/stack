import { type FieldState, field } from "@fcalell/ui-core/variants";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "../../lib/cn";
import { useFieldState } from "../../lib/field";

// A multi-line surface outgrows the field's control floor and needs its own
// vertical interior, so both ride the overlay as literal numerics.
const BOX = "min-h-20 w-full py-2 text-callout text-ink-1";

export interface TextAreaProps extends TextInputProps {
	// Same state contract as Input: `error` pins the danger border,
	// `useFieldState` moves the default onto the `focused` cell.
	state?: FieldState;
}

export function TextArea({
	state,
	className,
	onFocus,
	onBlur,
	...rest
}: TextAreaProps) {
	const tracked = useFieldState(state, onFocus, onBlur);
	return (
		<TextInput
			multiline
			textAlignVertical="top"
			className={cn(
				field({ state: tracked.state, layout: "input" }),
				BOX,
				className,
			)}
			placeholderTextColorClassName="text-ink-3"
			onFocus={tracked.onFocus}
			onBlur={tracked.onBlur}
			{...rest}
		/>
	);
}
