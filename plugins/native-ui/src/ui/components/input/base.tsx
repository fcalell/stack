import type { Draft } from "@fcalell/plugin-api/tanstack-query";
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
	Text as RNText,
	TextInput,
} from "react-native";
import { useAct, useHeldDraft } from "../../lib/act";
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
import { inertProps, PAINT_CONTROL, PaintPressable } from "../../lib/paint";
import { useTokenColor } from "../../lib/theme";
import { useTouched } from "../../lib/touched";
import { useWords } from "../../lib/words";
import { IconButtonBase } from "../button/glyph";
import { Icon } from "../icon";
import { ActSheet } from "../sheet/act";
import type { InputKind, TextInputProps } from "./index";

const SURFACE: Record<InputKind, FieldKind> = {
	text: "text",
	search: "search",
	secret: "text",
	source: "code",
	number: "text",
	email: "text",
	date: "text",
};

const KEYBOARD: Record<InputKind, KeyboardTypeOptions> = {
	text: "default",
	search: "default",
	secret: "default",
	source: "default",
	number: "decimal-pad",
	email: "email-address",
	date: "number-pad",
};

// A day typed as digits, the hyphens of `YYYY-MM-DD` placed as they land.
function maskDate(typed: string): string {
	const digits = typed.replace(/\D/g, "").slice(0, 8);
	return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)]
		.filter((part) => part !== "")
		.join("-");
}

// The field box every Input renders, as the Input below describes it, on the
// `draft` its host holds: a field hosts the draft of its input and draws a
// rejection in its own line. `cell` is
// the `Table` cell it edits in, `inline` the list row entry or `Rules` term it
// stands in. `painted` is the box while its data is not here: filled at its
// loaded size, the value not drawn, inert. Outside the package's exports.
export function InputBase({
	draft,
	kind,
	onChange,
	onCommit,
	placeholder,
	unit,
	act,
	autoFocus,
	cell,
	inline,
	painted: given,
}: Omit<TextInputProps, "value"> & {
	draft: Draft<string>;
	cell?: CellFit;
	inline?: InlineFit;
	painted?: boolean;
}) {
	// The act runs through one holder, whether the keyboard's submit or its icon
	// presses it.
	const acting = useAct("toast");
	// A read that ended leaves the box empty and blocked: a keystroke says why
	// and changes nothing.
	const ended = draft.ended !== undefined;
	const painted = given || (draft.painted && !ended);
	const typed = painted || ended ? "" : draft.value;
	const date = kind === "date";
	const edit = (next: string) => {
		const kept = date ? maskDate(next) : next;
		draft.change(kept);
		if (!ended) onChange(kept);
	};
	const words = useWords();
	const [moment] = useState(() => commitMoment<string>());
	// A commit that returns its save's promise holds the value while it pends.
	const commit = (next: string) => {
		if (onCommit) draft.change(next, () => onCommit(next));
	};
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
		<PaintPressable
			painted={painted}
			{...inertProps(painted === true)}
			accessible={false}
			disabled={disabled}
			onPress={() => input.current?.focus()}
			className={cn(
				field({
					trailing: act ? "act" : "none",
					state: error ? "error" : "rest",
				}),
				"flex-row items-center",
				disabled && "bg-fill-disabled",
				painted && PAINT_CONTROL,
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
				accessibilityState={{ disabled: disabled || ended }}
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
				placeholder={
					placeholder ??
					(search ? words.search : date ? "YYYY-MM-DD" : undefined)
				}
				maxLength={date ? 10 : undefined}
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
					if (act && act.blocked === undefined && !acting.holds)
						acting.run(true, act);
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
				<IconButtonBase
					icon={act.icon}
					fit="field"
					label={act.label}
					disabled={disabled || act.blocked !== undefined}
					pending={acting.pending !== undefined}
					onAct={() => acting.run(true, act)}
				/>
			) : null}
			{act && !painted ? (
				<ActSheet acting={acting} of={() => act.sheet} />
			) : null}
		</PaintPressable>
	);
}

// An Input that holds its own draft, as a bare one, a cell and a rule's term
// do; a rejection toasts. Outside the package's exports.
export function HeldInput({
	value,
	kind,
	onChange,
	onCommit,
	placeholder,
	unit,
	act,
	autoFocus,
	cell,
	inline,
	painted,
}: TextInputProps & { cell?: CellFit; inline?: InlineFit; painted?: boolean }) {
	return (
		<InputBase
			draft={useHeldDraft(value)}
			kind={kind}
			onChange={onChange}
			onCommit={onCommit}
			placeholder={placeholder}
			unit={unit}
			act={act}
			autoFocus={autoFocus}
			cell={cell}
			inline={inline}
			painted={painted}
		/>
	);
}
