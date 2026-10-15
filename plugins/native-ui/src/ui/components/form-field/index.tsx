import { useDraft } from "@fcalell/plugin-api/tanstack-query";
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
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	FieldDisabled,
	FieldError,
	FieldFocus,
	FieldNameContext,
	FieldRefusal,
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
import { OptionList, type OptionListProps } from "../option-list";
import {
	SegmentedControl,
	type SegmentedControlProps,
} from "../segmented-control";
import { Select, type SelectProps } from "../select";
import { Slider, type SliderProps } from "../slider";
import { ChangeMark } from "../status/change";
import { Switch, type SwitchProps } from "../switch";

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

// The control descriptors, each the component's own props less what the field
// supplies (its label). Exactly one is set, or `children` draws any other
// control.
interface Controls<S extends string | null, O extends string, T> {
	switch: Omit<SwitchProps, "label">;
	checkbox: Omit<CheckboxProps, "label">;
	slider: Omit<SliderProps, "label">;
	select: SelectProps<S>;
	options: OptionListProps<O, T>;
	segments: Omit<SegmentedControlProps, "label">;
}
type ControlKind = keyof Controls<string, string, unknown>;
type Never<C> = { [K in keyof C]?: never };
type OneOf<C> = {
	[K in keyof C]: Pick<C, K> & Never<Omit<C, K>>;
}[keyof C];

// The control is the one descriptor set (`switch`, `checkbox`, `slider`,
// `select`, `options`, `segments`: the component's own props, less the label
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
							/** Any other control (an Input, a TextArea, a Picker). */
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
	if (props.switch) return "switch";
	if (props.checkbox) return "checkbox";
	if (props.slider) return "slider";
	if (props.select) return "select";
	if (props.options) return "options";
	if (props.segments) return "segments";
	return undefined;
}

// The control a field draws: the descriptor's component, or its children,
// bound drawn from the field's value. A sheet reads the children to know
// whether it holds a `TextArea`.
export function fieldControl<V, S extends string | null, O extends string, T>(
	props: FormFieldProps<V, S, O, T>,
): ReactNode {
	return controlOf(props as Body, undefined);
}

function controlOf(props: Body, kind: ControlKind | undefined): ReactNode {
	const { label } = props;
	if (props.switch) return <Switch {...props.switch} label={label} />;
	if (props.checkbox)
		return <CheckboxBase {...props.checkbox} label={label} target />;
	if (props.slider) return <Slider {...props.slider} label={label} />;
	if (props.select) return <Select {...props.select} />;
	if (props.options) return <OptionList {...props.options} />;
	if (props.segments)
		return <SegmentedControl {...props.segments} label={label} />;
	if (kind !== undefined) return null;
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

// A checkbox field: the row is the target, so it owns the draft the box
// draws and the press edits.
function CheckboxRow(props: {
	checkbox: Body["checkbox"] & object;
	label: string;
	disabled: boolean;
	children: ReactNode;
}) {
	const { checkbox, label, disabled } = props;
	const draft = useDraft(checkbox.checked);
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
				draft.change(next);
				checkbox.onChange(next);
			}}
			className={cn(formField({ holds: "checkbox" }), AHEAD)}
		>
			<View className={BOX_LINE}>
				<Strut role="body" />
				<FieldDisabled.Provider value={disabled}>
					<CheckboxBase
						checked={checked}
						onChange={checkbox.onChange}
						label={label}
						painted={draft.painted}
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
	// What a control refused (a file of the wrong type) stands in the error
	// line until its next pick.
	const [refused, refuse] = useState<string>();
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
	const kind = kindOf(props);
	const control = folded ? null : controlOf(props, kind);
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
			<CheckboxRow checkbox={props.checkbox} label={label} disabled={disabled}>
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
					<FieldRefusal.Provider value={refuse}>
						<FieldFocus.Provider value={reopened}>
							{control}
						</FieldFocus.Provider>
					</FieldRefusal.Provider>
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
// its read lands.
export function FormField<
	V,
	S extends string | null = string,
	O extends string = string,
	T = unknown,
>(props: FormFieldProps<V, S, O, T>) {
	const { change, ...rest } = props;
	// The descriptors are read at their widest: a `Select` over `S` is one over
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
