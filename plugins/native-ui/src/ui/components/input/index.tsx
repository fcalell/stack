import { commitMoment } from "@fcalell/ui-core/commit";
import type { IconAct } from "@fcalell/ui-core/descriptors";
import {
	FIELD_UNIT,
	type FieldKind,
	field,
	fieldValue,
	icon,
} from "@fcalell/ui-core/variants";
import { Search } from "lucide-react-native";
import { useContext, useState } from "react";
import {
	type KeyboardTypeOptions,
	Text as RNText,
	TextInput,
	View,
} from "react-native";
import { useResolveClassNames } from "uniwind";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldDisabled, FieldError, useFieldName } from "../../lib/field";
import { Glyph } from "../../lib/glyph";
import { useTokenColor } from "../../lib/theme";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { IconButton } from "../icon-button";

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
	act?: IconAct;
}

const SURFACE: Record<InputKind, FieldKind> = {
	text: "text",
	search: "search",
	secret: "text",
	source: "code",
	number: "text",
	email: "text",
};

const KEYBOARD: Record<InputKind, KeyboardTypeOptions> = {
	text: "default",
	search: "default",
	secret: "default",
	source: "default",
	number: "decimal-pad",
	email: "email-address",
};

// One line of typing in the field box: `edge-error` when its `FormField` is
// in error, the disabled fill when its field is disabled. `search` stands at
// the control's height behind its glyph; `number` opens the numeric keyboard
// and draws `unit` after the value; `source` is text a machine reads (a
// command, a path, a host), mono and never corrected or capitalized; `email`
// opens the email keyboard, offers the address the system knows and is never
// corrected or capitalized; `act` is an icon act inside the field's end.
// `onCommit` hears the value once the viewer is done with it: on leaving the
// field or on the keyboard's return, only when it changed since the field took
// focus; with it, a hardware Escape puts back the value at focus.
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
	const [moment] = useState(() => commitMoment<string>());
	const commit = (next: string) => onCommit?.(next);
	const { touch } = useTouched();
	const name = useFieldName();
	const error = useContext(FieldError);
	const disabled = useContext(FieldDisabled);
	// A placeholder's colour is a prop, never a class: `FIELD_PLACEHOLDER`'s ink.
	const placeholderInk = useTokenColor("--color-ink-meta");
	const { width } = useResolveClassNames(icon({ fit: "control" }));
	const which = kind ?? "text";
	const surface = SURFACE[which];
	const search = which === "search";
	return (
		<View
			className={cn(
				field({
					kind: surface,
					trailing: act ? "act" : "none",
					state: error ? "error" : "rest",
				}),
				"flex-row items-center",
				disabled && "bg-fill-disabled",
			)}
		>
			{search ? (
				<Glyph
					icon={Search}
					tone={disabled ? "ink-disabled" : "ink-meta"}
					size={typeof width === "number" ? width : undefined}
				/>
			) : null}
			<TextInput
				accessibilityLabel={name ?? (search ? words.search : undefined)}
				accessibilityState={{ disabled }}
				editable={!disabled}
				className={cn(
					fieldValue({ kind: surface }),
					"flex-1 py-0",
					disabled && "text-ink-disabled",
				)}
				placeholderTextColor={placeholderInk}
				value={value}
				onChangeText={(next) => {
					touch();
					onChange(next);
				}}
				placeholder={placeholder ?? (search ? words.search : undefined)}
				secureTextEntry={which === "secret"}
				keyboardType={KEYBOARD[which]}
				autoComplete={which === "email" ? "email" : undefined}
				textContentType={which === "email" ? "emailAddress" : undefined}
				autoCapitalize={
					which === "secret" || which === "source" || which === "email"
						? "none"
						: "sentences"
				}
				autoCorrect={which === "text"}
				onFocus={() => moment.focus(value)}
				onBlur={() => moment.leave(value, commit)}
				onSubmitEditing={() => moment.commit(value, commit)}
				onKeyPress={(event) => {
					if (onCommit && event.nativeEvent.key === "Escape")
						moment.cancel(value, onChange);
				}}
			/>
			{which === "number" && unit ? (
				<RNText className={cn(FIELD_UNIT, disabled && "text-ink-disabled")}>
					{unit}
				</RNText>
			) : null}
			{act ? (
				<IconButton
					icon={act.icon}
					label={act.label}
					onAct={act.onAct}
					fit="field"
				/>
			) : null}
		</View>
	);
}
