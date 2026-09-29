import { CONTROL_MUTED, otpBox, text } from "@fcalell/ui-core/variants";
import { useEffect, useRef, useState } from "react";
import { Text as RNText, TextInput, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useFieldName } from "../../lib/field";
import { useTouched } from "../../lib/touched";

export interface InputOtpProps extends Closed {
	length: number;
	value: string;
	onChange: (value: string) => void;
	onComplete?: (value: string) => void;
	loading?: boolean;
}

// A one-time code: `length` boxes over one string of digits. One real input
// lies over the boxes, invisible, so a tap anywhere focuses it and the
// system's code suggestion and a paste of the whole code fill it at once; the
// boxes draw it, and the caret's box follows a hardware keyboard's arrows.
// It takes focus when it is drawn unless another input holds it, so the code
// step a sent code opens is typed into at once. `onComplete` hears the code
// once its last digit lands; `loading` holds the boxes while the code is
// checked.
export function InputOtp({
	length,
	value,
	onChange,
	onComplete,
	loading,
}: InputOtpProps) {
	const [focused, setFocused] = useState(false);
	const [caret, setCaret] = useState(0);
	const { touch } = useTouched();
	const name = useFieldName();
	const input = useRef<TextInput>(null);
	useEffect(() => {
		if (!TextInput.State.currentlyFocusedInput()) input.current?.focus();
	}, []);
	const at = Math.min(caret, length - 1);
	return (
		<View className={cn("flex-row gap-inside", loading && CONTROL_MUTED)}>
			{Array.from({ length }, (_, index) => (
				<View
					// biome-ignore lint/suspicious/noArrayIndexKey: a box is its position
					key={index}
					className={cn(
						otpBox({
							state: focused && index === at ? "focused" : "default",
						}),
						"items-center justify-center",
					)}
				>
					<RNText className={text({ role: "heading" })}>
						{value[index] ?? ""}
					</RNText>
				</View>
			))}
			<TextInput
				accessibilityLabel={name}
				ref={input}
				value={value}
				onChangeText={(raw) => {
					const next = raw.replace(/\D/g, "").slice(0, length);
					touch();
					if (next === value) return;
					onChange(next);
					if (next.length === length) onComplete?.(next);
				}}
				onSelectionChange={(event) =>
					setCaret(event.nativeEvent.selection.start)
				}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				maxLength={length}
				keyboardType="number-pad"
				textContentType="oneTimeCode"
				autoComplete="one-time-code"
				editable={!loading}
				caretHidden
				className="absolute inset-0 opacity-0"
			/>
		</View>
	);
}
