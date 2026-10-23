import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import { commitMoment } from "@fcalell/ui-core/commit";
import { wordCount } from "@fcalell/ui-core/controls";
import {
	fieldValue,
	TEXT_AREA_VALUE,
	textArea,
	textAreaBudget,
} from "@fcalell/ui-core/variants";
import { useContext, useRef, useState } from "react";
import { Text as RNText, TextInput, View } from "react-native";
import { useHeldDraft } from "../../lib/act";
import { useCaretAtEnd } from "../../lib/caret";
import { cn } from "../../lib/cn";
import { FieldDisabled, FieldError, useFieldName } from "../../lib/field";
import { inertProps, PAINT_CONTROL, PaintView } from "../../lib/paint";
import { useTokenColor } from "../../lib/theme";
import { useTouched } from "../../lib/touched";

import type { ProseProps } from "./index";

// The field box every prose Input renders, on the `draft` its host holds: a field
// hosts the draft of its text area and draws a rejection in its own line.
// Many lines of typing in a field box that grows with its value from three
// body lines, the budget's count under the value in the error ink once over.
// `source` is mono and keeps indentation; a sheet holding one stands full
// height. `onCommit` hears the value once the viewer leaves the field having
// changed it since focus (return is a new line here); with it, a hardware
// Escape puts back the value at focus and leaves the field.
export function ProseBase({
	draft,
	source,
	onChange,
	onCommit,
	placeholder,
	budget,
	autoFocus,
}: Omit<ProseProps, "value"> & { draft: Draft<string> }) {
	// A read that ended leaves the box empty and blocked: a keystroke says why
	// and changes nothing.
	const ended = draft.ended !== undefined;
	const painted = draft.painted && !ended;
	const typed = draft.painted ? "" : draft.value;
	const edit = (next: string) => {
		draft.change(next);
		if (!ended) onChange(next);
	};
	const [moment] = useState(() => commitMoment<string>());
	const input = useRef<TextInput>(null);
	const caret = useCaretAtEnd(autoFocus, typed);
	// A commit that returns its save's promise holds the value while it pends.
	const commit = (next: string) => {
		if (onCommit) draft.change(next, () => onCommit(next));
	};
	const { touch } = useTouched();
	const name = useFieldName();
	const error = useContext(FieldError);
	const disabled = useContext(FieldDisabled);
	// A placeholder's colour is a prop, never a class: `FIELD_PLACEHOLDER`'s ink.
	const placeholderInk = useTokenColor("--color-ink-meta");
	const mono = source === true;
	const count = budget === undefined ? undefined : wordCount(typed);
	return (
		<PaintView
			painted={painted}
			{...inertProps(painted)}
			className={cn(
				textArea({ state: error ? "error" : "rest" }),
				disabled && "bg-fill-disabled",
				painted && PAINT_CONTROL,
			)}
		>
			<TextInput
				ref={input}
				autoFocus={autoFocus}
				{...caret}
				accessibilityLabel={name}
				accessibilityState={{ disabled: disabled || ended }}
				editable={!disabled}
				multiline
				textAlignVertical="top"
				className={cn(
					fieldValue({ kind: mono ? "code" : "text" }),
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
				autoCapitalize={mono ? "none" : "sentences"}
				autoCorrect={!mono}
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
		</PaintView>
	);
}

// A prose Input that holds its own draft, as a bare one does.
export function HeldProse({ value, ...rest }: ProseProps) {
	return <ProseBase draft={useHeldDraft(value)} {...rest} />;
}
