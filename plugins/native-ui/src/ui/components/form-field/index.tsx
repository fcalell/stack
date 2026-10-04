import type { FieldBinding, FieldControl } from "@fcalell/ui-core/descriptors";
import {
	FORM_FIELD_ERROR,
	formField,
	lineBox,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { isValidElement, type ReactNode, useMemo } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	FieldDisabled,
	FieldError,
	FieldNameContext,
	GroupName,
	LabelTarget,
} from "../../lib/field";
import { Checkbox, type CheckboxProps } from "../checkbox";
import { OptionList } from "../option-list";
import { SegmentedControl } from "../segmented-control";
import { Slider } from "../slider";
import { Switch } from "../switch";

const STACK = "min-w-0";
const BESIDE = "flex-row items-center min-w-0";
const AHEAD = "flex-row items-start min-w-0";
const LABEL_BLOCK = "flex-1 min-w-0";
// The checkbox stands on its label's first line, beside a zero-width line of
// the body role; the label row is its target.
const BOX_LINE = "flex-row shrink-0 items-center";
const DISABLED = "text-ink-disabled";
const STRUT = "​";

interface FormFieldBase extends Closed {
	// The control's name, drawn over it (beside a switch or a checkbox).
	label: string;
	// A sentence under the control; disabled, it is the reason.
	description?: string;
	// The control takes no input: the label in the disabled ink, the control
	// its disabled form.
	disabled?: boolean;
}

// Unbound, the consumer gives the error and the control; bound, the form's
// field gives both, and the control is a function of the field's value:
// `{(control) => <Input {...control} />}`.
export type FormFieldProps<V = unknown> = FormFieldBase &
	(
		| {
				field?: never;
				// The message that takes the description's place, the control
				// drawn in error.
				error?: string;
				children?: ReactNode;
		  }
		| {
				field: FieldBinding<V>;
				error?: never;
				children: (control: FieldControl<V>) => ReactNode;
		  }
	);

// The control a field holds: its children, or, bound, its children drawn
// from the field's value. A sheet reads it to know whether it holds a
// `TextArea`.
export function fieldControl<V>(props: FormFieldProps<V>): ReactNode {
	return props.field
		? props.children({
				value: props.field.value,
				onChange: props.field.onChange,
				onCommit: props.field.onCommit,
			})
		: props.children;
}

// What the control is decides the field's form: a switch at the label's end,
// a checkbox ahead of it on its first line, any other under its label; a
// slider's head is its own label; a group of controls is named by the label
// and holds controls named on their own.
function formOf(control: ReactNode) {
	const type = isValidElement(control) ? control.type : undefined;
	if (type === Switch) return "switch";
	if (type === Checkbox) return "checkbox";
	if (type === Slider) return "slider";
	if (type === OptionList || type === SegmentedControl) return "group";
	return "field";
}

// The label (body 500) over its control, the description (meta) under it and
// the error in the description's place; a switch stands at the label's end
// and a checkbox on its first line, the label row its target. The label
// names a typing control; disabled, the label takes the disabled ink, the
// control its disabled cells, and the description stays as the reason.
export function FormField<V>(props: FormFieldProps<V>) {
	const { label, description, disabled = false } = props;
	const error = props.field ? props.field.error : props.error;
	const control = fieldControl(props);
	const form = formOf(control);
	const said = error ?? description;
	// What a group of controls is named and described by, one value per change.
	const group = useMemo(() => ({ label, said }), [label, said]);
	const labelClass = cn(
		text({ role: "body" }),
		textStrong({ role: "body" }),
		disabled && DISABLED,
	);
	const named = <RNText className={labelClass}>{label}</RNText>;
	const line = error ? (
		<RNText accessibilityLiveRegion="polite" className={FORM_FIELD_ERROR}>
			{error}
		</RNText>
	) : description ? (
		<RNText className={text({ role: "meta" })}>{description}</RNText>
	) : null;
	// A group takes no field context: its label and its line under it name
	// and describe the group, never the controls inside.
	if (form === "group")
		return (
			<View className={cn(formField({ holds: "field" }), STACK)}>
				<RNText className={labelClass}>{label}</RNText>
				<GroupName.Provider value={group}>{control}</GroupName.Provider>
				{line}
			</View>
		);
	if (form === "checkbox" && isValidElement<CheckboxProps>(control)) {
		const { checked, onChange } = control.props;
		return (
			<Pressable
				accessibilityRole="checkbox"
				accessibilityLabel={label}
				accessibilityHint={said}
				accessibilityState={{ checked, disabled }}
				disabled={disabled}
				onPress={() => onChange(checked !== true)}
				className={cn(formField({ holds: "checkbox" }), AHEAD)}
			>
				<View className={BOX_LINE}>
					<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
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
					{control}
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
