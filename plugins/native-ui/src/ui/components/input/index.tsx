import { commitMoment } from "@fcalell/ui-core/commit";
import type { Act } from "@fcalell/ui-core/descriptors";
import {
	FIELD_PLACEHOLDER,
	type FieldKind,
	field,
	text,
} from "@fcalell/ui-core/variants";
import { useState } from "react";
import { Pressable, Text as RNText, TextInput, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useFieldName } from "../../lib/field";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";

export type InputKind =
	| "text"
	| "search"
	| "secret"
	| "source"
	| "number"
	| "email";

export interface InputProps extends Closed {
	kind?: InputKind;
	value: string;
	onChange: (value: string) => void;
	onCommit?: (value: string) => void;
	placeholder?: string;
	unit?: string;
	act?: Act;
}

const SURFACE: Record<InputKind, FieldKind> = {
	text: "text",
	search: "search",
	secret: "text",
	source: "code",
	number: "text",
	email: "text",
};

// One line of typing. `search` is a pill, the rest take the group radius;
// `number` opens the numeric keyboard and draws `unit` after the value;
// `source` is text a machine reads (a command, a path, a host), mono and
// never corrected or capitalized; `email` opens the email keyboard, offers
// the address the system knows and is never corrected or capitalized;
// `act` is a trailing text act. `onCommit` hears the value once the viewer is
// done with it: on leaving the field or on the keyboard's return, only when it
// changed since the field took focus; with it, a hardware Escape puts back
// the value at focus.
export function Input({
	kind,
	value,
	onChange,
	onCommit,
	placeholder,
	unit,
	act,
}: InputProps) {
	const words = useWords();
	const [focused, setFocused] = useState(false);
	const [moment] = useState(() => commitMoment<string>());
	const commit = (next: string) => onCommit?.(next);
	const { touch } = useTouched();
	const name = useFieldName();
	const which = kind ?? "text";
	return (
		<View
			className={cn(
				field({ kind: SURFACE[which], state: focused ? "focused" : "default" }),
				"flex-row items-center gap-row",
			)}
		>
			<TextInput
				accessibilityLabel={name}
				className={cn(
					text({ role: SURFACE[which] === "code" ? "mono" : "body" }),
					"flex-1 py-0",
				)}
				placeholderTextColorClassName={FIELD_PLACEHOLDER}
				value={value}
				onChangeText={(next) => {
					touch();
					onChange(next);
				}}
				placeholder={
					placeholder ?? (which === "search" ? words.search : undefined)
				}
				secureTextEntry={which === "secret"}
				keyboardType={
					which === "number"
						? "decimal-pad"
						: which === "email"
							? "email-address"
							: "default"
				}
				autoComplete={which === "email" ? "email" : undefined}
				textContentType={which === "email" ? "emailAddress" : undefined}
				autoCapitalize={
					which === "secret" || which === "source" || which === "email"
						? "none"
						: "sentences"
				}
				autoCorrect={which === "text"}
				onFocus={() => {
					setFocused(true);
					moment.focus(value);
				}}
				onBlur={() => {
					setFocused(false);
					moment.leave(value, commit);
				}}
				onSubmitEditing={() => moment.commit(value, commit)}
				onKeyPress={(event) => {
					if (onCommit && event.nativeEvent.key === "Escape")
						moment.cancel(value, onChange);
				}}
			/>
			{which === "number" && unit ? (
				<RNText className={text({ role: "meta" })}>{unit}</RNText>
			) : null}
			{act ? (
				<Pressable
					accessibilityRole="button"
					disabled={act.blocked !== undefined || act.loading}
					onPress={act.onAct}
					className="min-h-11 justify-center"
				>
					<RNText
						className={cn(
							text({ role: "body" }),
							"font-medium text-tint",
							act.blocked !== undefined && "text-ink-faint",
						)}
					>
						{act.label}
					</RNText>
				</Pressable>
			) : null}
		</View>
	);
}
