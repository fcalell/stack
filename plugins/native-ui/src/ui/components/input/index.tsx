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
import { useWords } from "../../lib/words";

export type InputKind = "text" | "search" | "secret" | "code" | "number";

export interface InputProps extends Closed {
	kind?: InputKind;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	act?: Act;
}

const SURFACE: Record<InputKind, FieldKind> = {
	text: "text",
	search: "search",
	secret: "text",
	code: "code",
	number: "text",
};

// One line of typing. `search` is a pill, the rest take the group radius;
// `number` opens the numeric keyboard; `act` is a trailing text act.
export function Input({ kind, value, onChange, placeholder, act }: InputProps) {
	const words = useWords();
	const [focused, setFocused] = useState(false);
	const which = kind ?? "text";
	return (
		<View
			className={cn(
				field({ kind: SURFACE[which], state: focused ? "focused" : "default" }),
				"flex-row items-center gap-row",
			)}
		>
			<TextInput
				className={cn(
					text({ role: which === "code" ? "mono" : "body" }),
					"flex-1 py-0",
				)}
				placeholderTextColorClassName={FIELD_PLACEHOLDER}
				value={value}
				onChangeText={onChange}
				placeholder={
					placeholder ?? (which === "search" ? words.search : undefined)
				}
				secureTextEntry={which === "secret"}
				keyboardType={which === "number" ? "decimal-pad" : "default"}
				autoCapitalize={
					which === "code" || which === "secret" ? "none" : "sentences"
				}
				autoCorrect={which === "text"}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
			/>
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
