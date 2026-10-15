import { type Datum, useDraft } from "@fcalell/plugin-api/tanstack-query";
import { commitMoment } from "@fcalell/ui-core/commit";
import {
	fieldValue,
	TEXT_AREA_VALUE,
	textArea,
	textAreaBudget,
} from "@fcalell/ui-core/variants";
import { useContext, useRef, useState } from "react";
import { Text as RNText, TextInput, View } from "react-native";
import { useCaretAtEnd } from "../../lib/caret";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldDisabled, FieldError, useFieldName } from "../../lib/field";
import { inertProps, paintControl, useShown } from "../../lib/paint";
import { useTokenColor } from "../../lib/theme";
import { useTouched } from "../../lib/touched";

export interface TextAreaProps extends Closed {
	kind?: "prose" | "source";
	/** The value (text; wraps). A selection paints the box, inert, until its read lands and follows it until the viewer types. */
	value: Datum<string>;
	onChange: (value: string) => void;
	onCommit?: (value: string) => void;
	/** The hint drawn while the value is empty; never the field's name (a short phrase; wraps). */
	placeholder?: string;
	budget?: number;
	/** Takes the focus when it mounts, with the caret at the end of its value: pass it for a field that replaces what the viewer was reading. A field on a form that loads with the page leaves it off. */
	autoFocus?: boolean;
}

function wordCount(value: string): number {
	return value.split(/\s+/).filter(Boolean).length;
}

// Many lines of typing in a field box that grows with its value from three
// body lines, the budget's count under the value in the error ink once over.
// `source` is mono and keeps indentation; a sheet holding one stands full
// height. `onCommit` hears the value once the viewer leaves the field having
// changed it since focus (return is a new line here); with it, a hardware
// Escape puts back the value at focus and leaves the field.
export function TextArea({
	kind,
	value,
	onChange,
	onCommit,
	placeholder,
	budget,
	autoFocus,
}: TextAreaProps) {
	const draft = useDraft(value);
	const painted = draft.painted;
	const typed = painted ? "" : draft.value;
	const edit = (next: string) => {
		draft.change(next);
		onChange(next);
	};
	const shown = useShown(painted);
	const [moment] = useState(() => commitMoment<string>());
	const input = useRef<TextInput>(null);
	const caret = useCaretAtEnd(autoFocus, typed);
	const commit = (next: string) => onCommit?.(next);
	const { touch } = useTouched();
	const name = useFieldName();
	const error = useContext(FieldError);
	const disabled = useContext(FieldDisabled);
	// A placeholder's colour is a prop, never a class: `FIELD_PLACEHOLDER`'s ink.
	const placeholderInk = useTokenColor("--color-ink-meta");
	const source = kind === "source";
	const count = budget === undefined ? undefined : wordCount(typed);
	return (
		<View
			{...inertProps(painted)}
			className={cn(
				textArea({ state: error ? "error" : "rest" }),
				disabled && "bg-fill-disabled",
				painted && paintControl(shown),
			)}
		>
			<TextInput
				ref={input}
				autoFocus={autoFocus}
				{...caret}
				accessibilityLabel={name}
				accessibilityState={{ disabled }}
				editable={!disabled}
				multiline
				textAlignVertical="top"
				className={cn(
					fieldValue({ kind: source ? "code" : "text" }),
					TEXT_AREA_VALUE,
					"py-0",
					disabled && "text-ink-disabled",
					painted && "opacity-0",
				)}
				placeholderTextColor={placeholderInk}
				value={typed}
				onChangeText={(next) => {
					touch();
					edit(next);
				}}
				placeholder={placeholder}
				autoCapitalize={source ? "none" : "sentences"}
				autoCorrect={!source}
				onFocus={() => moment.focus(typed)}
				onBlur={() => moment.leave(typed, commit)}
				onKeyPress={(event) => {
					if (!onCommit || event.nativeEvent.key !== "Escape") return;
					moment.cancel(typed, edit);
					input.current?.blur();
				}}
			/>
			{count !== undefined && budget !== undefined ? (
				<View className={cn("flex-row justify-end", painted && "opacity-0")}>
					<RNText
						className={cn(
							textAreaBudget({ state: count > budget ? "error" : "rest" }),
							"shrink-0",
							disabled && "text-ink-disabled",
						)}
					>
						{count} / {budget}
					</RNText>
				</View>
			) : null}
		</View>
	);
}
