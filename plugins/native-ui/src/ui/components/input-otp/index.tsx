import { OTP, OTP_DIGIT, otpBox, text } from "@fcalell/ui-core/variants";
import { useContext, useRef } from "react";
import { Text as RNText, TextInput, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	FieldError,
	FieldFocus,
	useFieldClaim,
	useFieldName,
} from "../../lib/field";
import { useLive } from "../../lib/live";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { Spinner } from "../spinner";

export interface InputOtpProps extends Closed {
	length: number;
	value: string;
	onChange: (value: string) => void;
	onComplete?: (value: string) => void;
	loading?: boolean;
}

// A one-time code: `length` boxes over one string of digits, standing at the
// `otp` side and shrinking together, square, on a narrow row. One real input
// lies over the boxes, invisible, so a tap anywhere focuses it and the
// system's code suggestion and a paste of the whole code fill it at once; the
// boxes draw it. It takes focus as it mounts where `FieldFocus` asks, as an
// `Input` does, so a code sheet is typed into at once, and in a
// `Gate` unless a typing control there holds it. `onComplete`
// hears the code once its last digit lands; `loading` holds the boxes at rest
// while the code is checked, the input inert (unwritable and marked
// disabled, still read) and the row busy, the spinner and its line under it.
export function InputOtp({
	length,
	value,
	onChange,
	onComplete,
	loading,
}: InputOtpProps) {
	const words = useWords();
	const { touch } = useTouched();
	const name = useFieldName();
	const error = useContext(FieldError);
	const focused = useContext(FieldFocus);
	const live = useLive(loading ? words.checking : "");
	const input = useRef<TextInput>(null);
	const column = useFieldClaim(input);
	return (
		<View className="gap-pair">
			<View
				accessibilityState={{ busy: loading }}
				className={cn(OTP, "relative flex-row items-center")}
			>
				{Array.from({ length }, (_, index) => (
					<View
						// biome-ignore lint/suspicious/noArrayIndexKey: a box is its position
						key={index}
						className={cn(
							otpBox({ state: error ? "error" : "rest" }),
							"items-center justify-center",
						)}
					>
						<RNText className={cn(OTP_DIGIT, "text-center")}>
							{value[index] ?? ""}
						</RNText>
					</View>
				))}
				<TextInput
					ref={input}
					onFocus={column.onFocus}
					onBlur={column.onBlur}
					accessibilityLabel={name}
					accessibilityState={{ disabled: loading, busy: loading }}
					autoFocus={focused}
					value={value}
					onChangeText={(raw) => {
						const next = raw.replace(/\D/g, "").slice(0, length);
						touch();
						if (next === value) return;
						onChange(next);
						if (next.length === length) onComplete?.(next);
					}}
					maxLength={length}
					keyboardType="number-pad"
					textContentType="oneTimeCode"
					autoComplete="one-time-code"
					editable={!loading}
					caretHidden
					className="absolute inset-0 opacity-0"
				/>
			</View>
			{loading ? (
				<View {...live} className="flex-row items-center gap-inside">
					<Spinner />
					<RNText className={text({ role: "meta" })}>{words.checking}</RNText>
				</View>
			) : null}
		</View>
	);
}
