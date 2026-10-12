import type {
	Answered,
	ChangeKind,
	FieldBinding,
	FieldControl,
} from "@fcalell/ui-core/descriptors";
import { type FieldShape, optionsWaitOf } from "@fcalell/ui-core/list-state";
import {
	FIELD_ERROR_LINE,
	FORM_FIELD_SUMMARY,
	formField,
	summaryContentTone,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useContext, useMemo, useState } from "react";
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
	LabelTarget,
} from "../../lib/field";
import { FieldWait } from "../../lib/field-wait";
import { Ink } from "../../lib/ink";
import { LoadingContext } from "../../lib/loading";
import { Strut } from "../../lib/strut";
import { useWords } from "../../lib/words";
import { Checkbox, type CheckboxProps } from "../checkbox";
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
// A field waiting stands its waiting form in its place and hides itself.
const HIDDEN = "hidden";
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
	if (props.checkbox) return <Checkbox {...props.checkbox} label={label} />;
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

// The form a field waits as, read off its own props before its data: an
// answered field folds to one summary row, whatever its control; a list of
// options carries the rows its source declares.
function waitOf(props: Body): FieldShape {
	const described = Boolean(props.description);
	if (props.answered) return { holds: "folded", described };
	if (props.options)
		return {
			holds: "options",
			described,
			options: optionsWaitOf(props.options),
		};
	if (props.switch) return { holds: "switch", described };
	if (props.checkbox) return { holds: "checkbox", described };
	if (props.slider) return { holds: "slider", described };
	if (props.segments) return { holds: "segments", described };
	return { holds: "field", described };
}

// The field itself: the label over its control, a switch at the label's end and a
// checkbox on its first line, the label row its target. The label names a
// typing control; disabled, the label takes the disabled ink, the control its
// disabled cells, and the description stays as the reason.
function FieldBody(props: Body & { gone?: boolean }) {
	const { label, description, disabled = false, answered, gone } = props;
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
	const hidden = gone ? HIDDEN : undefined;
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
			<View className={cn(FORM_FIELD_SUMMARY, SUMMARY, hidden)}>
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
			<View className={cn(formField({ holds: "field" }), STACK, hidden)}>
				<RNText className={labelClass}>{label}</RNText>
				<GroupName.Provider value={group}>{control}</GroupName.Provider>
				{line}
			</View>
		);
	if (props.checkbox) {
		const { checked, onChange } = props.checkbox;
		return (
			<Pressable
				accessibilityRole="checkbox"
				accessibilityLabel={label}
				accessibilityState={{ checked, disabled }}
				disabled={disabled}
				onPress={() => onChange(checked !== true)}
				className={cn(formField({ holds: "checkbox" }), AHEAD, hidden)}
			>
				<View className={BOX_LINE}>
					<Strut role="body" />
					<FieldDisabled.Provider value={disabled}>
						<LabelTarget.Provider value>{control}</LabelTarget.Provider>
					</FieldDisabled.Provider>
				</View>
				<View className={LABEL_BLOCK}>
					{named}
					{line}
				</View>
			</Pressable>
		);
	}
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
			<View className={cn(formField({ holds: "switch" }), BESIDE, hidden)}>
				<View className={LABEL_BLOCK}>
					{named}
					{line}
				</View>
				{held}
			</View>
		);
	return (
		<View className={cn(formField({ holds: "field" }), STACK, hidden)}>
			{form === "slider" ? null : named}
			{held}
			{line}
		</View>
	);
}

// The label (body 500) over its control, the description (meta) under it and
// the error in the description's place; a switch stands at the label's end
// and a checkbox on its first line. A `change` draws the change mark ahead of
// the field, on its label's line. In a loading `Section` or `Group` it draws its own waiting form, in the form of
// its control, and keeps the field mounted, hidden, so what it holds (a typed
// text) outlives the wait.
export function FormField<
	V,
	S extends string | null = string,
	O extends string = string,
	T = unknown,
>(props: FormFieldProps<V, S, O, T>) {
	const { change, ...rest } = props;
	// The descriptors are read at their widest: a `Select` over `S` is one over
	// `string | null` to the field that draws it.
	const body = rest as Body;
	const waiting = useContext(LoadingContext);
	// The root the field draws hides, never a wrapper, so what a Group's entry
	// holds beside it stands still.
	const gone = waiting ? HIDDEN : undefined;
	const field = <FieldBody {...body} gone={waiting && change === undefined} />;
	const marked =
		change === undefined ? (
			field
		) : (
			<View className={cn(MARKED, gone)}>
				<View className={BOX_LINE}>
					<Strut role="body" />
					<ChangeMark kind={change} />
				</View>
				<View className={MARKED_BODY}>{field}</View>
			</View>
		);
	const wait = waiting ? <FieldWait {...waitOf(body)} /> : null;
	return (
		<>
			{wait}
			{marked}
		</>
	);
}
