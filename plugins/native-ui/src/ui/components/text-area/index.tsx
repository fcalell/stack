import { commitMoment } from "@fcalell/ui-core/commit";
import { FIELD_PLACEHOLDER, field, text } from "@fcalell/ui-core/variants";
import { useEffect, useState } from "react";
import { Text as RNText, TextInput, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useTouched } from "../../lib/touched";
import { useSheetGrow } from "../sheet";

export interface TextAreaProps extends Closed {
	kind?: "prose" | "source";
	value: string;
	onChange: (value: string) => void;
	onCommit?: (value: string) => void;
	placeholder?: string;
	budget?: number;
}

function wordCount(value: string): number {
	return value.split(/\s+/).filter(Boolean).length;
}

// Many lines of typing. `source` is mono and keeps indentation; a `budget` in
// words draws a counter. Inside a sheet it asks for the full height.
// `onCommit` hears the value once the viewer leaves the field having changed
// it since focus (return is a new line here); with it, a hardware Escape
// puts back the value at focus.
export function TextArea({
	kind,
	value,
	onChange,
	onCommit,
	placeholder,
	budget,
}: TextAreaProps) {
	const [focused, setFocused] = useState(false);
	const [moment] = useState(() => commitMoment<string>());
	const commit = (next: string) => onCommit?.(next);
	const { touch } = useTouched();
	const source = kind === "source";
	const grow = useSheetGrow();
	useEffect(() => grow?.(), [grow]);
	const count = budget === undefined ? undefined : wordCount(value);
	return (
		<View className="gap-pair">
			<TextInput
				multiline
				textAlignVertical="top"
				className={cn(
					field({
						kind: source ? "code" : "text",
						state: focused ? "focused" : "default",
					}),
					text({ role: source ? "mono" : "body" }),
					"min-h-20",
				)}
				placeholderTextColorClassName={FIELD_PLACEHOLDER}
				value={value}
				onChangeText={(next) => {
					touch();
					onChange(next);
				}}
				placeholder={placeholder}
				autoCapitalize={source ? "none" : "sentences"}
				autoCorrect={!source}
				onFocus={() => {
					setFocused(true);
					moment.focus(value);
				}}
				onBlur={() => {
					setFocused(false);
					moment.leave(value, commit);
				}}
				onKeyPress={(event) => {
					if (onCommit && event.nativeEvent.key === "Escape")
						moment.cancel(value, onChange);
				}}
			/>
			{count !== undefined ? (
				<RNText
					className={cn(
						text({ role: "meta" }),
						"text-right",
						budget !== undefined && count > budget && "text-danger",
					)}
				>
					{count} / {budget}
				</RNText>
			) : null}
		</View>
	);
}
