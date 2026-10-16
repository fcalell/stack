import type { Datum, Draft } from "@fcalell/plugin-api/tanstack-query";
import type {
	Answered,
	ChangeKind,
	FieldBinding,
	FieldControl,
} from "@fcalell/ui-core/descriptors";
import {
	FIELD_ERROR_LINE,
	FORM_FIELD_SUMMARY,
	formField,
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
	FieldFocus,
	FieldNameContext,
	GroupName,
} from "../../lib/field";
import { Ink } from "../../lib/ink";
import { inertProps } from "../../lib/paint";
import { Strut } from "../../lib/strut";
import { useWords } from "../../lib/words";
import type { CheckboxProps } from "../checkbox";
import { CheckboxBase } from "../checkbox/base";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";
import type { InputProps } from "../input";
import { InputBase } from "../input/base";
import type { OptionListProps } from "../option-list";
import { OptionListBase } from "../option-list/base";
import type { PickerProps } from "../picker";
import { PickerBase } from "../picker/base";
import type { SegmentedControlProps } from "../segmented-control";
import { SegmentedControlBase } from "../segmented-control/base";
import type { SliderProps } from "../slider";
import { SliderBase } from "../slider/base";
import { ChangeMark } from "../status/change";
import type { SwitchProps } from "../switch";
import { SwitchBase } from "../switch/base";
import type { TextAreaProps } from "../text-area";
import { TextAreaBase } from "../text-area/base";

const STACK = "min-w-0";
const BESIDE = "flex-row items-center min-w-0";
const AHEAD = "flex-row items-start min-w-0";
const LABEL_BLOCK = "flex-1 min-w-0";
// The checkbox stands on its label's first line, beside a zero-width line of
// the body role; the label row is its target.
const BOX_LINE = "flex-row shrink-0 items-center";
// A change mark stands ahead of the whole field on its first line, a label's
// line tall.
const MARKED = "flex-row items-start gap-inside min-w-0";
const MARKED_BODY = "flex-1 min-w-0";
const DISABLED = "text-ink-disabled";
const SUMMARY = "flex-row items-center min-w-0";
const SUMMARY_LABEL = "shrink min-w-0";
const SUMMARY_ANSWER = "flex-1 min-w-0";

interface FormFieldBase extends Closed {
	// Where the field stands in a change set: its mark ahead of the field, on
	// its label's line.
	change?: ChangeKind;
	/** The control's name, drawn over it (beside a switch or a checkbox) (a short phrase; wraps, truncates in an answered field's summary row). */
	label: string;
	/** Under the control; disabled, it is the reason (a sentence; wraps). */
	description?: string;
	// The control takes no input: the label in the disabled ink, the control
	// its disabled form.
	disabled?: boolean;
	// The question is answered: while set the field folds to one summary row
	// (a check, the label, `answer`, an Edit act) and renders no control.
	// Clearing it unfolds the field and focuses a typing control.
	answered?: Answered;
}

// A pick's props less the label the field supplies, each of its two forms (one
// or several) keeping its own value and handler.
type PickerLess<P> = P extends unknown ? Omit<P, "label"> : never;

// The control descriptors, each the component's own props less what the field
// supplies (its label). Exactly one is set, or `children` draws any other
// control.
interface Controls<S extends string | null, O extends string, T> {
	input: InputProps;
	textArea: TextAreaProps;
	picker: PickerLess<PickerProps<S>>;
	switch: Omit<SwitchProps, "label">;
	checkbox: Omit<CheckboxProps, "label">;
	slider: Omit<SliderProps, "label">;
	options: OptionListProps<O, T>;
	segments: Omit<SegmentedControlProps, "label">;
}
type ControlKind = keyof Controls<string, string, unknown>;
type Never<C> = { [K in keyof C]?: never };
type OneOf<C> = {
	[K in keyof C]: Pick<C, K> & Never<Omit<C, K>>;
}[keyof C];

// The control is the one descriptor set (`input`, `textArea`, `picker`, `switch`, `checkbox`, `slider`,
// `options`, `segments`: the component's own props, less the label
// the field supplies), which the field draws in its form: a switch at the
// label's end, a checkbox ahead of it, any other under it; or any other
// control as `children`. Unbound, the consumer gives the error and the
// control; bound, the form's field gives both, and the control is a function
// of the field's value: `{(control) => <Input {...control} />}`.
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
type Body = FormFieldBase & {
	field?: FieldBinding<unknown>;
	error?: string;
	children?: ReactNode | ((control: FieldControl<unknown>) => ReactNode);
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
// reads them to know whether it holds a `TextArea`.
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
		return <TextAreaBase {...props.textArea} draft={draft as Draft<string>} />;
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
			<OptionListBase
				{...props.options}
				draft={draft as Draft<string | null | readonly string[]>}
				onChange={
					props.options.onChange as (next: string | string[]) => unknown
				}
			/>
		);
	if (props.segments)
		return (
			<SegmentedControlBase
				{...props.segments}
				draft={draft as Draft<string>}
				label={label}
			/>
		);
	if (kind !== undefined) return null;
	return childrenOf(props);
}

// The control a field is given as children, bound drawn from the field's value.
function childrenOf(props: Body): ReactNode {
	const { field, children } = props;
	if (typeof children !== "function") return children;
	return field
		? children({
				value: field.value,
				onChange: field.onChange,
				onCommit: field.onCommit,
			})
		: null;
}

// A checkbox field: the row is the target, so it draws the draft the field
// holds and the press edits.
function CheckboxRow(props: {
	checkbox: Body["checkbox"] & object;
	draft: Draft<boolean | "mixed">;
	label: string;
	disabled: boolean;
	children: ReactNode;
}) {
	const { checkbox, draft, label, disabled } = props;
	const checked = draft.painted ? false : draft.value;
	return (
		<Pressable
			{...inertProps(draft.painted)}
			accessibilityRole="checkbox"
			accessibilityLabel={label}
			accessibilityState={{ checked, disabled }}
			disabled={disabled}
			onPress={() => {
				const next = checked !== true;
				draft.change(next, () => checkbox.onChange(next));
			}}
			className={cn(formField({ holds: "checkbox" }), AHEAD)}
		>
			<View className={BOX_LINE}>
				<Strut role="body" />
				<FieldDisabled.Provider value={disabled}>
					<CheckboxBase
						draft={draft}
						onChange={checkbox.onChange}
						label={label}
						target
					/>
				</FieldDisabled.Provider>
			</View>
			{props.children}
		</Pressable>
	);
}

// The field itself: the label over its control, a switch at the label's end and a
// checkbox on its first line, the label row its target. The label names a
// typing control; disabled, the label takes the disabled ink, the control its
// disabled cells, and the description stays as the reason.
function FieldBody(props: Body) {
	const { label, description, disabled = false, answered } = props;
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
	const group = useMemo(() => ({ label }), [label]);
	const labelClass = cn(
		text({ role: "body" }),
		textStrong({ role: "body" }),
		disabled && DISABLED,
	);
	const named = <RNText className={labelClass}>{label}</RNText>;
	const line = error ? (
		<RNText className={FIELD_ERROR_LINE}>{error}</RNText>
	) : description ? (
		<RNText className={text({ role: "meta" })}>{description}</RNText>
	) : null;
	if (answered)
		return (
			<View className={cn(FORM_FIELD_SUMMARY, SUMMARY)}>
				<Ink.Provider value={summaryContentTone()}>
					<Icon name="Check" />
				</Ink.Provider>
				<RNText numberOfLines={1} className={cn(labelClass, SUMMARY_LABEL)}>
					{label}
				</RNText>
				<RNText
					numberOfLines={1}
					className={cn(text({ role: "meta" }), SUMMARY_ANSWER)}
				>
					{answered.answer}
				</RNText>
				<IconButton
					icon="Pencil"
					fit="bar"
					label={`${words.edit} ${label}`}
					onAct={answered.onEdit}
				/>
			</View>
		);
	// A group takes no field context: its label names the group, never the
	// controls inside.
	if (form === "options" || form === "segments")
		return (
			<View className={cn(formField({ holds: "field" }), STACK)}>
				<RNText className={labelClass}>{label}</RNText>
				<GroupName.Provider value={group}>{control}</GroupName.Provider>
				{line}
			</View>
		);
	if (props.checkbox)
		return (
			<CheckboxRow
				checkbox={props.checkbox}
				draft={draft as Draft<boolean | "mixed">}
				label={label}
				disabled={disabled}
			>
				<View className={LABEL_BLOCK}>
					{named}
					{line}
				</View>
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
	if (form === "switch")
		return (
			<View className={cn(formField({ holds: "switch" }), BESIDE)}>
				<View className={LABEL_BLOCK}>
					{named}
					{line}
				</View>
				{held}
			</View>
		);
	return (
		<View className={cn(formField({ holds: "field" }), STACK)}>
			{form === "slider" ? null : named}
			{held}
			{line}
		</View>
	);
}

// The label (body 500) over its control, the description (meta) under it and
// the error in the description's place; a switch stands at the label's end
// and a checkbox on its first line. A `change` draws the change mark ahead of
// the field, on its label's line. The label and the description are constants
// and always stand; a control given a selection paints itself, inert, until
// its read lands. The field hosts the save of its descriptor's control: the
// viewer's value holds while the save pends, and a refusal stands in the
// field's error line until the control's next change.
export function FormField<
	V,
	S extends string | null = string,
	O extends string = string,
	T = unknown,
>(props: FormFieldProps<V, S, O, T>) {
	const { change, ...rest } = props;
	// The descriptors are read at their widest: a `Picker` over `S` is one over
	// `string | null` to the field that draws it.
	const field = <FieldBody {...(rest as Body)} />;
	if (change === undefined) return field;
	return (
		<View className={MARKED}>
			<View className={BOX_LINE}>
				<Strut role="body" />
				<ChangeMark kind={change} />
			</View>
			<View className={MARKED_BODY}>{field}</View>
		</View>
	);
}
