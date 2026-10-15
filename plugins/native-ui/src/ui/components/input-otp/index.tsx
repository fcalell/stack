import { isThenable } from "@fcalell/plugin-api/acts";
import { useRun } from "@fcalell/plugin-api/tanstack-query";
import { OTP, OTP_DIGIT, otpBox, text } from "@fcalell/ui-core/variants";
import { useContext, useRef } from "react";
import { Text as RNText, TextInput, View } from "react-native";
import { useFailed } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	FieldError,
	FieldFocus,
	FieldRefusal,
	useFieldClaim,
	useFieldName,
} from "../../lib/field";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { Spinner } from "../spinner";

export interface InputOtpProps extends Closed {
	length: number;
	value: string;
	onChange: (value: string) => void;
	onComplete?: (value: string) => unknown;
}

// A one-time code: `length` boxes over one string of digits, standing at the
// `otp` side and shrinking together, square, on a narrow row. One real input
// lies over the boxes, invisible, so a tap anywhere focuses it and the
// system's code suggestion and a paste of the whole code fill it at once; the
// boxes draw it. It takes focus as it mounts where `FieldFocus` asks, as an
// `Input` does, so a code sheet is typed into at once, and in a
// `Gate` unless a typing control there holds it. `onComplete`
// hears the code once its last digit lands; a promise it returns holds the
// boxes at rest while the code is checked, the input inert (unwritable and
// marked disabled, still read), the spinner and its line under it, and a
// refusal goes to the field's error line, with its reason, until the next
// digit.
export function InputOtp({
	length,
	value,
	onChange,
	onComplete,
}: InputOtpProps) {
	const words = useWords();
	const run = useRun();
	const failed = useFailed();
	const refuse = useContext(FieldRefusal);
	const checking = run.pending !== undefined;
	const complete = (code: string) =>
		run.run(true, () => {
			const result = onComplete?.(code);
			if (!isThenable(result)) return result;
			return Promise.resolve(result).catch((error: unknown) =>
				failed(error, () => complete(code)),
			);
		});
	const { touch } = useTouched();
	const name = useFieldName();
	const error = useContext(FieldError);
	const focused = useContext(FieldFocus);
	const input = useRef<TextInput>(null);
	const column = useFieldClaim(input);
	return (
		<View className="gap-pair">
			<View className={cn(OTP, "relative flex-row items-center")}>
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
					accessibilityState={{ disabled: checking, busy: checking }}
					autoFocus={focused}
					value={value}
					onChangeText={(raw) => {
						const next = raw.replace(/\D/g, "").slice(0, length);
						touch();
						if (next === value) return;
						refuse?.(undefined);
						onChange(next);
						if (next.length === length) complete(next);
					}}
					maxLength={length}
					keyboardType="number-pad"
					textContentType="oneTimeCode"
					autoComplete="one-time-code"
					editable={!checking}
					caretHidden
					className="absolute inset-0 opacity-0"
				/>
			</View>
			{checking ? (
				<View className="flex-row items-center gap-inside">
					<Spinner />
					<RNText className={cn(text({ role: "meta" }), "shrink")}>
						{words.checking}
					</RNText>
				</View>
			) : null}
		</View>
	);
}
