import { commitMoment } from "@fcalell/ui-core/commit";
import type { IconAct } from "@fcalell/ui-core/descriptors";
import {
	FIELD_UNIT,
	FIGURES,
	type FieldKind,
	field,
	fieldValue,
} from "@fcalell/ui-core/variants";
import { useContext, useRef, useState } from "react";
import {
	type KeyboardTypeOptions,
	Text as RNText,
	TextInput,
	View,
} from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	CellField,
	FieldDisabled,
	FieldError,
	FieldFocus,
	useFieldName,
} from "../../lib/field";
import { Ink } from "../../lib/ink";
import { useTokenColor } from "../../lib/theme";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";
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
// focus; with it, a hardware Escape puts back the value at focus. In a
// `Table` cell it stands at the bar fit, named by the cell, focused as the
// edit starts, a number end-aligned in tabular figures as the cell reads.
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
	const focused = useContext(FieldFocus);
	const cell = useContext(CellField);
	const input = useRef<TextInput>(null);
	// A placeholder's colour is a prop, never a class: `FIELD_PLACEHOLDER`'s ink.
	const placeholderInk = useTokenColor("--color-ink-meta");
	const which = kind ?? "text";
	const surface = SURFACE[which];
	const search = which === "search";
	const figures = cell !== undefined && which === "number";
	return (
		<View
			className={cn(
				field({
					fit: search || cell ? "bar" : "form",
					trailing: act ? "act" : "none",
					state: error ? "error" : "rest",
				}),
				"flex-row items-center",
				disabled && "bg-fill-disabled",
			)}
		>
			{search ? (
				<Ink.Provider value={disabled ? "ink-disabled" : "ink-meta"}>
					<Icon name="Search" fit="control" />
				</Ink.Provider>
			) : null}
			<TextInput
				ref={input}
				autoFocus={focused || cell !== undefined}
				accessibilityLabel={
					cell?.label ?? name ?? (search ? words.search : undefined)
				}
				accessibilityState={{ disabled }}
				editable={!disabled}
				className={cn(
					fieldValue({ kind: surface }),
					figures && FIGURES,
					"flex-1 py-0",
					figures && "text-right",
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
				onBlur={() => {
					moment.leave(value, commit);
					cell?.done();
				}}
				onSubmitEditing={() => moment.commit(value, commit)}
				onKeyPress={(event) => {
					if (!onCommit || event.nativeEvent.key !== "Escape") return;
					moment.cancel(value, onChange);
					// A cell's edit ends once the value put back has rendered, so
					// leaving the field commits nothing more.
					if (cell) requestAnimationFrame(() => input.current?.blur());
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
