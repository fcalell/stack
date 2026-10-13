import { commitMoment } from "@fcalell/ui-core/commit";
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
	Pressable,
	Text as RNText,
	TextInput,
} from "react-native";
import { useCaretAtEnd } from "../../lib/caret";
import { cn } from "../../lib/cn";
import {
	type CellFit,
	FieldDisabled,
	FieldError,
	FieldFocus,
	type InlineFit,
	useFieldClaim,
	useFieldName,
} from "../../lib/field";
import { Ink } from "../../lib/ink";
import { useTokenColor } from "../../lib/theme";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";
import type { InputKind, InputProps } from "./index";

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

// The field box every Input renders, as the Input below describes it. `cell` is
// the `Table` cell it edits in, `inline` the `ListRow` entry or `Rules` term it
// stands in. Outside the package's exports.
export function InputBase({
	kind,
	value,
	onChange,
	onCommit,
	placeholder,
	unit,
	act,
	autoFocus,
	cell,
	inline,
}: InputProps & { cell?: CellFit; inline?: InlineFit }) {
	const words = useWords();
	const [moment] = useState(() => commitMoment<string>());
	const commit = (next: string) => onCommit?.(next);
	const { touch } = useTouched();
	const name = useFieldName();
	const error = useContext(FieldError);
	const disabled = useContext(FieldDisabled);
	const focused = useContext(FieldFocus);
	const input = useRef<TextInput>(null);
	const column = useFieldClaim(input);
	const caret = useCaretAtEnd(autoFocus, value);
	// A placeholder's colour is a prop, never a class: `FIELD_PLACEHOLDER`'s ink.
	const placeholderInk = useTokenColor("--color-ink-meta");
	const which = kind ?? "text";
	const surface = SURFACE[which];
	const search = which === "search";
	const figures = cell !== undefined && which === "number";
	// The whole box focuses the value: the value is one line tall inside it.
	return (
		<Pressable
			accessible={false}
			disabled={disabled}
			onPress={() => input.current?.focus()}
			className={cn(
				field({
					fit: search || cell || inline ? "bar" : "form",
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
				autoFocus={autoFocus || focused || cell !== undefined || inline?.focus}
				{...caret}
				accessibilityLabel={
					cell?.label ??
					inline?.label ??
					name ??
					(search ? words.search : undefined)
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
				onFocus={() => {
					column.onFocus();
					moment.focus(value);
				}}
				onBlur={() => {
					column.onBlur();
					moment.leave(value, commit);
					cell?.done();
				}}
				onSubmitEditing={() => {
					moment.commit(value, commit);
					act?.onAct();
				}}
				onKeyPress={(event) => {
					if (!onCommit || event.nativeEvent.key !== "Escape") return;
					moment.cancel(value, onChange);
					input.current?.blur();
				}}
			/>
			{which === "number" && unit ? (
				<RNText
					numberOfLines={1}
					className={cn(FIELD_UNIT, "shrink", disabled && "text-ink-disabled")}
				>
					{unit}
				</RNText>
			) : null}
			{act ? (
				<IconButton
					icon={act.icon}
					label={act.label}
					onAct={act.onAct}
					loading={act.loading}
					fit="field"
				/>
			) : null}
		</Pressable>
	);
}
