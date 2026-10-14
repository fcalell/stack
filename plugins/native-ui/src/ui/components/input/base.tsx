import { useDraft } from "@fcalell/plugin-api/tanstack-query";
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
import { inertProps, paintControl, useShown } from "../../lib/paint";
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
// stands in. `painted` is the box while its data is not here: filled at its
// loaded size, the value not drawn, inert. Outside the package's exports.
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
	painted: given,
}: InputProps & { cell?: CellFit; inline?: InlineFit; painted?: boolean }) {
	const draft = useDraft(value);
	const painted = given || draft.painted;
	const typed = painted ? "" : draft.value;
	const edit = (next: string) => {
		draft.edit(next);
		onChange(next);
	};
	const shown = useShown(painted);
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
	const caret = useCaretAtEnd(autoFocus, typed);
	// A placeholder's colour is a prop, never a class: `FIELD_PLACEHOLDER`'s ink.
	const placeholderInk = useTokenColor("--color-ink-meta");
	const which = kind ?? "text";
	const surface = SURFACE[which];
	const search = which === "search";
	const figures = cell !== undefined && which === "number";
	// The whole box focuses the value: the value is one line tall inside it.
	return (
		<Pressable
			{...inertProps(painted === true)}
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
				painted && paintControl(shown),
			)}
		>
			{search && !painted ? (
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
					painted && "opacity-0",
				)}
				placeholderTextColor={placeholderInk}
				value={typed}
				onChangeText={(next) => {
					touch();
					edit(next);
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
					moment.focus(typed);
				}}
				onBlur={() => {
					column.onBlur();
					moment.leave(typed, commit);
					cell?.done();
				}}
				onSubmitEditing={() => {
					moment.commit(typed, commit);
					act?.onAct();
				}}
				onKeyPress={(event) => {
					if (!onCommit || event.nativeEvent.key !== "Escape") return;
					moment.cancel(typed, edit);
					input.current?.blur();
				}}
			/>
			{which === "number" && unit && !painted ? (
				<RNText
					numberOfLines={1}
					className={cn(FIELD_UNIT, "shrink", disabled && "text-ink-disabled")}
				>
					{unit}
				</RNText>
			) : null}
			{act && !painted ? (
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
