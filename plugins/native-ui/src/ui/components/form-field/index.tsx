import type { Datum, Draft } from "@fcalell/plugin-api/tanstack-query";
import type {
	Answered,
	ChangeKind,
	FieldBinding,
	FieldControl,
} from "@fcalell/ui-core/descriptors";
import {
	DEFINITION_LINE,
	DEFINITION_VALUE,
	FIELD_ALONE,
	FIELD_ALONE_LINE,
	FIELD_ERROR_LINE,
	FIELD_OPTIONAL,
	ROW_END,
	row,
	summaryContentTone,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useMemo, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { useFieldDraft } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	FieldDisabled,
	FieldError,
	type FieldedKey,
	FieldFocus,
	FieldNameContext,
	FieldOwned,
	GroupName,
} from "../../lib/field";
import { Ink } from "../../lib/ink";
import { FadingText, lineIn } from "../../lib/motion";
import { inertProps } from "../../lib/paint";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { Icon } from "../icon";
import type { ProseProps, TextInputProps } from "../input";
import { InputBase } from "../input/base";
import { ProseBase } from "../input/prose";
import type {
	PickerListProps,
	PickerMenuProps,
	PickerSegmentsProps,
} from "../picker";
import { PickerBase } from "../picker/base";
import { PickerListBase } from "../picker/list";
import { SegmentsBase } from "../picker/segments";
import type { SliderProps } from "../slider";
import { SliderBase } from "../slider/base";
import { ChangeMark } from "../status/change";
import type { SwitchProps } from "../switch";
import { SwitchBase } from "../switch/base";
import type { CheckboxProps } from "../switch/checkbox";
import { CheckboxBase } from "../switch/checkbox";

// The field is a row of its form at the touch density: the label over the
// value line (the change mark, then the control filling the line, or a toggle
// at its end), the description or the error under the control.
const FIELD = "min-w-0";
const VALUE_LINE = "flex-row items-center min-w-0";
const END = "flex-row shrink-0 items-center ms-auto";
const DISABLED = "text-ink-disabled";
const SUMMARY = "flex-row items-center min-w-0";
const SUMMARY_LABEL = "shrink min-w-0";
const SUMMARY_ANSWER = "flex-1 min-w-0";
// A toggle placed alone stands at the end of its name's line.
const NAME_GROWS = "grow shrink min-w-0";

interface FormFieldBase extends Closed {
	// Where the field stands in a change set: its mark at the value line's
	// start.
	change?: ChangeKind;
	/** The control's name, drawn over it (a short phrase; wraps, truncates in an answered field's summary row). */
	label: string;
	/** Under the control; disabled, it is the reason (a sentence; wraps). */
	description?: string;
	/** The field may be left empty: the word `optional` stands under its label, in the meta ink. */
	optional?: boolean;
	// The control takes no input: the label in the disabled ink, the control
	// its disabled form.
	disabled?: boolean;
	// The question is answered: while set the field folds to one summary row
	// (a check, the label, `answer`, an Edit act) and renders no control.
	// Clearing it unfolds the field and focuses a typing control.
	answered?: Answered;
}

// A pick's props less what the field supplies (its label, description,
// optional word and error, and the fit a descriptor names), each of its two
// forms (one or several) keeping its own value and handler.
type PickerLess<P, K extends string = FieldedKey> = P extends unknown
	? Omit<P, K>
	: never;

// The control descriptors, each the component's own props less what the field
// supplies (its label, description, optional word and error). Exactly one is
// set, or `children` draws any other control.
interface Controls<S extends string | null, O extends string, T> {
	input: TextInputProps;
	textArea: ProseProps;
	picker: PickerLess<PickerMenuProps<S>>;
	switch: Omit<SwitchProps, FieldedKey>;
	checkbox: Omit<CheckboxProps, "label">;
	slider: Omit<SliderProps, FieldedKey>;
	options: PickerLess<PickerListProps<O, T>, FieldedKey | "fit">;
	segments: PickerLess<PickerSegmentsProps, FieldedKey | "fit">;
}
type ControlKind = keyof Controls<string, string, unknown>;
type Never<C> = { [K in keyof C]?: never };
type OneOf<C> = {
	[K in keyof C]: Pick<C, K> & Never<Omit<C, K>>;
}[keyof C];

// The control is the one descriptor set (`input`, `textArea`, `picker`, `switch`, `checkbox`, `slider`,
// `options`, `segments`: the component's own props, less the label
// the field supplies), which the field draws in its value line (a switch or
// a checkbox at its end); or any other control as `children`. Unbound, the
// consumer gives the error and the control; bound, the form's field gives
// both, and the control is a function of the field's value:
// `{(control) => <Input {...control} />}`.
export type FormFieldProps<
	V = unknown,
	S extends string | null = string,
	O extends string = string,
	T = unknown,
> = FormFieldBase &
	(
		| (OneOf<Controls<S, O, T>> & {
				field?: never;
				/** The message that takes the description's place, the control drawn in error (a sentence; wraps). */
				error?: string;
				children?: never;
		  })
		| (Never<Controls<S, O, T>> &
				(
					| {
							field?: never;
							/** The message that takes the description's place, the control drawn in error (a sentence; wraps). */
							error?: string;
							/** Any other control. */
							children?: ReactNode;
					  }
					| {
							field: FieldBinding<V>;
							error?: never;
							children: (control: FieldControl<V>) => ReactNode;
					  }
				))
	);

// The props a field body reads, its descriptors at their widest.
export type Body = FormFieldBase & {
	field?: FieldBinding<unknown>;
	error?: string;
	children?: ReactNode | ((control: FieldControl<unknown>) => ReactNode);
	// A control placed alone: no form's label column to share, so the name
	// stands over the control (`FIELD_ALONE`).
	alone?: boolean;
} & Partial<Controls<string | null, string, unknown>>;

// The one descriptor set, if any.
function kindOf(props: Body): ControlKind | undefined {
	if (props.input) return "input";
	if (props.textArea) return "textArea";
	if (props.picker) return "picker";
	if (props.switch) return "switch";
	if (props.checkbox) return "checkbox";
	if (props.slider) return "slider";
	if (props.options) return "options";
	if (props.segments) return "segments";
	return undefined;
}

// The children a field draws, bound drawn from the field's value. A sheet
// reads them to know whether it holds a prose `Input`.
export function fieldControl<V, S extends string | null, O extends string, T>(
	props: FormFieldProps<V, S, O, T>,
): ReactNode {
	return childrenOf(props as Body);
}

// The value the descriptor's control saves, which the field holds the draft of.
function savedOf(props: Body, kind: ControlKind | undefined): Datum<unknown> {
	switch (kind) {
		case "input":
			return props.input?.value;
		case "textArea":
			return props.textArea?.value;
		case "picker":
			return props.picker?.value;
		case "switch":
			return props.switch?.checked;
		case "checkbox":
			return props.checkbox?.checked;
		case "slider":
			return props.slider?.value;
		case "options":
			return props.options?.value;
		case "segments":
			return props.segments?.value;
		default:
			return undefined;
	}
}

// The control a field draws: the descriptor's control over the draft the field
// holds, or its children. A checkbox is drawn by its row.
function controlOf(
	props: Body,
	kind: ControlKind | undefined,
	draft: Draft<unknown>,
	error: string | undefined,
): ReactNode {
	const { label, disabled } = props;
	if (props.input)
		return <InputBase {...props.input} draft={draft as Draft<string>} />;
	if (props.textArea)
		return <ProseBase {...props.textArea} draft={draft as Draft<string>} />;
	if (props.picker)
		return (
			<PickerBase<string | null>
				{...props.picker}
				label={label}
				form={{ invalid: Boolean(error), disabled: disabled === true }}
				draft={
					draft as Draft<string | null | readonly (string | null)[] | undefined>
				}
				onChange={
					props.picker.onChange as (
						next: string | null | (string | null)[],
					) => unknown
				}
			/>
		);
	if (props.switch)
		return (
			<SwitchBase
				{...props.switch}
				draft={draft as Draft<boolean>}
				label={label}
			/>
		);
	if (props.slider)
		return (
			<SliderBase
				{...props.slider}
				draft={draft as Draft<number>}
				label={label}
			/>
		);
	if (props.options)
		return (
			<PickerListBase
				{...props.options}
				label={label}
				draft={draft as Draft<string | null | readonly string[]>}
				onChange={
					props.options.onChange as (next: string | string[]) => unknown
				}
			/>
		);
	if (props.segments)
		return (
			<SegmentsBase
				{...props.segments}
				draft={draft as Draft<string>}
				label={label}
			/>
		);
	if (kind !== undefined) return null;
	return childrenOf(props);
}

// The control a field is given as children, bound drawn from the field's
// value. The field names what it holds: a control among its children draws no
// field of its own.
function childrenOf(props: Body): ReactNode {
	const { field, children } = props;
	if (typeof children !== "function")
		return <FieldOwned.Provider value>{children}</FieldOwned.Provider>;
	return field ? (
		<FieldOwned.Provider value>
			{children({
				value: field.value,
				onChange: field.onChange,
				onCommit: field.onCommit,
			})}
		</FieldOwned.Provider>
	) : null;
}

// A checkbox field: the row is the target, so it draws the draft the field
// holds and the press edits; the box stands at the value line's end.
function CheckboxRow(props: {
	checkbox: Body["checkbox"] & object;
	draft: Draft<boolean | "mixed">;
	label: string;
	disabled: boolean;
	mark: ReactNode;
	children: ReactNode;
}) {
	const { checkbox, draft, label, disabled } = props;
	const ended = draft.ended !== undefined;
	const checked = draft.painted ? false : draft.value;
	return (
		<Pressable
			{...inertProps(draft.painted && !ended)}
			accessibilityRole="checkbox"
			accessibilityLabel={label}
			accessibilityState={{ checked, disabled: disabled || ended }}
			disabled={disabled}
			onPress={() => {
				const next = checked !== true;
				draft.change(next, () => checkbox.onChange(next));
			}}
			className={cn(row({ state: "rest" }), FIELD)}
		>
			{props.children}
			<View className={cn(DEFINITION_LINE, VALUE_LINE)}>
				{props.mark}
				<View className={cn(ROW_END, END)}>
					<FieldDisabled.Provider value={disabled}>
						<CheckboxBase
							draft={draft}
							onChange={checkbox.onChange}
							label={label}
							target
						/>
					</FieldDisabled.Provider>
				</View>
			</View>
		</Pressable>
	);
}

// The field itself, one row: the label over the value line, which holds the
// change mark and the control (a switch or a checkbox at its end), the
// description or the error under it. The label names a typing control;
// disabled, the label takes the disabled ink, the control its disabled cells,
// and the description stays as the reason. Placed alone (`alone`) it stands in
// no row: the label over the control, a toggle at the end of the label's line
// and a slider's head its own name. Outside the package's exports: a control
// placed alone draws itself through it.
export function FieldBody(props: Body) {
	const {
		label,
		description,
		optional,
		disabled = false,
		answered,
		change,
		alone = false,
	} = props;
	const words = useWords();
	const folded = answered !== undefined;
	// The field hosts its control's save: a save the server refused stands in
	// the error line until the control's next change.
	const kind = kindOf(props);
	const { draft, refused } = useFieldDraft(savedOf(props, kind));
	// A field unfolding mounts its control afresh, which takes focus as it
	// mounts where `FieldFocus` asks.
	const [wasFolded, setWasFolded] = useState(folded);
	const [reopened, setReopened] = useState(false);
	if (wasFolded !== folded) {
		setWasFolded(folded);
		setReopened(wasFolded);
	}
	const error = refused ?? (props.field ? props.field.error : props.error);
	// A folded field draws no control, so the consumer's function is not called.
	const control = folded ? null : controlOf(props, kind, draft, error);
	const form = kind ?? "field";
	// What a group of controls is named by, one value per change.
	const groupName = useMemo(() => ({ label }), [label]);
	// A toggle stands at the value line's end; any other control fills it.
	const atEnd = form === "switch";
	const labelClass = cn(
		text({ role: "body" }),
		"text-ink-meta",
		disabled && DISABLED,
	);
	const named = (
		<View className={alone && atEnd ? NAME_GROWS : undefined}>
			<RNText className={labelClass}>{label}</RNText>
			{optional ? (
				<RNText className={cn(text({ role: "meta" }), FIELD_OPTIONAL)}>
					{words.optional}
				</RNText>
			) : null}
		</View>
	);
	const line = error ? (
		<FadingText key={error} entering={lineIn()} className={FIELD_ERROR_LINE}>
			{error}
		</FadingText>
	) : description ? (
		<RNText className={text({ role: "meta" })}>{description}</RNText>
	) : null;
	const mark = change ? <ChangeMark kind={change} /> : null;
	if (answered)
		return (
			<View className={cn(row({ state: "rest" }), SUMMARY)}>
				<Ink.Provider value={summaryContentTone()}>
					<Icon name="Check" />
				</Ink.Provider>
				<RNText
					numberOfLines={1}
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						SUMMARY_LABEL,
					)}
				>
					{label}
				</RNText>
				<RNText
					numberOfLines={1}
					className={cn(text({ role: "meta" }), SUMMARY_ANSWER)}
				>
					{answered.answer}
				</RNText>
				<Button
					glyph
					icon="Pencil"
					label={`${words.edit} ${label}`}
					onAct={answered.onEdit}
				/>
			</View>
		);
	if (props.checkbox)
		return (
			<CheckboxRow
				checkbox={props.checkbox}
				draft={draft as Draft<boolean | "mixed">}
				label={label}
				disabled={disabled}
				mark={mark}
			>
				{named}
				{line}
			</CheckboxRow>
		);
	const held = (
		<FieldNameContext.Provider value={label}>
			<FieldDisabled.Provider value={disabled}>
				<FieldError.Provider value={Boolean(error)}>
					<FieldFocus.Provider value={reopened}>{control}</FieldFocus.Provider>
				</FieldError.Provider>
			</FieldDisabled.Provider>
		</FieldNameContext.Provider>
	);
	const grouped = form === "options" || form === "segments";
	// A group takes no field context: its label names the group, never the
	// controls inside.
	const groupControl = (
		<GroupName.Provider value={groupName}>{control}</GroupName.Provider>
	);
	if (alone) {
		// The label's line, a toggle at its end; a slider names itself.
		const head =
			form === "slider" ? (
				mark
			) : (
				<View className={FIELD_ALONE_LINE}>
					{mark}
					{named}
					{atEnd ? <View className={cn(ROW_END, END)}>{held}</View> : null}
				</View>
			);
		return (
			<View className={FIELD_ALONE}>
				{head}
				{grouped ? groupControl : atEnd ? null : held}
				{line}
			</View>
		);
	}
	if (grouped)
		return (
			<View className={cn(row({ state: "rest" }), FIELD)}>
				{named}
				<View className={cn(DEFINITION_LINE, VALUE_LINE)}>
					{mark}
					<View className={DEFINITION_VALUE}>{groupControl}</View>
				</View>
				{line}
			</View>
		);
	return (
		<View className={cn(row({ state: "rest" }), FIELD)}>
			{/* A slider's head is its own label. */}
			{form === "slider" ? null : named}
			<View className={cn(DEFINITION_LINE, VALUE_LINE)}>
				{mark}
				{atEnd ? (
					<View className={cn(ROW_END, END)}>{held}</View>
				) : (
					<View className={DEFINITION_VALUE}>{held}</View>
				)}
			</View>
			{line}
		</View>
	);
}

// One row of its form: the label (the body role) over the value line, the
// control filling it (a switch or a checkbox at its end) and the description
// (meta) or the error under the control. A `change` draws the change mark at
// the value line's start. The label and the description are constants and
// always stand; a control given a selection paints itself, inert, until its
// read lands. The field hosts the save of its descriptor's control: the
// viewer's value holds while the save pends, and a refusal stands in the
// field's error line until the control's next change.
export function FormField<
	V,
	S extends string | null = string,
	O extends string = string,
	T = unknown,
>(props: FormFieldProps<V, S, O, T>) {
	// The descriptors are read at their widest: a `Picker` over `S` is one over
	// `string | null` to the field that draws it.
	return <FieldBody {...(props as Body)} />;
}
