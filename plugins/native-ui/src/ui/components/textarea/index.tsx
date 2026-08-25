import { type FieldState, field } from "@fcalell/ui-core/variants";
import { TextInput, type TextInputProps } from "react-native";
import { cn } from "../../lib/cn";
import { useFieldState } from "../../lib/field";

// A multi-line surface outgrows the field's control floor and needs its own
// vertical interior, so both ride the overlay as literal numerics.
const BOX = "min-h-20 w-full py-2 text-callout text-ink-1";

export interface TextareaProps extends TextInputProps {
	// Same state contract as Input: `error` pins the danger border,
	// `useFieldState` moves the default onto the `focused` cell.
	state?: FieldState;
	className?: never;
	style?: never;
	// uniwind's per-prop class channels on TextInput, closed like Input's; the
	// component keeps setting placeholderTextColorClassName itself below.
	placeholderTextColorClassName?: never;
	cursorColorClassName?: never;
	selectionColorClassName?: never;
	selectionHandleColorClassName?: never;
	underlineColorAndroidClassName?: never;
}

export function Textarea({ state, onFocus, onBlur, ...rest }: TextareaProps) {
	const tracked = useFieldState(state, onFocus, onBlur);
	return (
		<TextInput
			multiline
			textAlignVertical="top"
			className={cn(field({ state: tracked.state, layout: "input" }), BOX)}
			placeholderTextColorClassName="text-ink-3"
			onFocus={tracked.onFocus}
			onBlur={tracked.onBlur}
			{...rest}
		/>
	);
}
