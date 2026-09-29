import type { FieldBinding, FieldControl } from "@fcalell/ui-core/descriptors";
import { text, textStrong } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldNameContext } from "../../lib/field";

interface FormFieldBase extends Closed {
	label: string;
	description?: string;
}

// Unbound, the consumer gives the error and the control; bound, the form
// gives both, and the control is a function of the field's value.
export type FormFieldProps<V = unknown> = FormFieldBase &
	(
		| {
				field?: never;
				error?: string;
				children?: ReactNode;
		  }
		| {
				field: FieldBinding<V>;
				error?: never;
				children: (control: FieldControl<V>) => ReactNode;
		  }
	);

// A typing control with its label, its description and its error, stacked;
// the label names the control. Bound to a form field, it draws the field's
// error and hands the control its value and change handler, and an
// autosaving binding's commit: `{(control) => <Input {...control} />}`.
export function FormField<V>(props: FormFieldProps<V>) {
	const { label, description } = props;
	const error = props.field ? props.field.error : props.error;
	const body = props.field
		? props.children({
				value: props.field.value,
				onChange: props.field.onChange,
				onCommit: props.field.onCommit,
			})
		: props.children;
	return (
		<View className="gap-pair">
			<RNText
				className={cn(text({ role: "body" }), textStrong({ role: "body" }))}
			>
				{label}
			</RNText>
			<FieldNameContext.Provider value={label}>
				{body}
			</FieldNameContext.Provider>
			{description ? (
				<RNText className={text({ role: "meta" })}>{description}</RNText>
			) : null}
			{error ? (
				<RNText
					accessibilityLiveRegion="polite"
					className={cn(text({ role: "meta" }), "text-danger")}
				>
					{error}
				</RNText>
			) : null}
		</View>
	);
}
