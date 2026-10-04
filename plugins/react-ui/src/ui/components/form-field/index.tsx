import { Field } from "@base-ui/react/field";
import { cn } from "@fcalell/ui-core/cn";
import type { FieldBinding, FieldControl } from "@fcalell/ui-core/descriptors";
import {
	FORM_FIELD_ERROR,
	formField,
	lineBox,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { isValidElement, type ReactNode, useId } from "react";
import type { Closed } from "../../lib/closed.ts";
import { GroupName, LabelTarget } from "../../lib/field.ts";
import { useSectionField } from "../../lib/section.ts";
import { Checkbox } from "../checkbox/index.tsx";
import { OptionList } from "../option-list/index.tsx";
import { SegmentedControl } from "../segmented-control/index.tsx";
import { Select } from "../select/index.tsx";
import { Slider } from "../slider/index.tsx";
import { Switch } from "../switch/index.tsx";

const STACK = "flex flex-col min-w-0";
const BESIDE = "flex items-center min-w-0";
const AHEAD = "flex items-start min-w-0";
const LABEL_BLOCK = "flex flex-col grow min-w-0";
// The checkbox stands on its label's first line, a box one body line tall;
// the label is its target.
const BOX_LINE = "flex shrink-0 items-center h-lh";
const DISABLED = "text-ink-disabled";
// Base UI's field names and describes the checkbox through its label.
const FIELD_TARGET = {};

interface FormFieldBase extends Closed {
	/** The control's name, drawn over it (beside a switch or a checkbox). */
	label: string;
	/** A sentence under the control; disabled, it is the reason. */
	description?: string;
	/** The control takes no input: the label in the disabled ink, the control its disabled form. */
	disabled?: boolean;
}

/** One control with its label, its description and its error. Unbound, the consumer gives the error and the control; bound, the form's field gives both, and the control is a function of the field's value: `{(control) => <Input {...control} />}`. */
export type FormFieldProps<V = unknown> = FormFieldBase &
	(
		| {
				/** Unbound. */
				field?: never;
				/** The message that takes the description's place, the control drawn in error. */
				error?: string;
				/** The control. */
				children?: ReactNode;
		  }
		| {
				/** The form's field: its value, its change handler and its error. */
				field: FieldBinding<V>;
				error?: never;
				/** The control, handed the field's value and change handler. */
				children: (control: FieldControl<V>) => ReactNode;
		  }
	);

// What the control is decides the field's form: a switch at the label's end,
// a checkbox ahead of it on its first line, any other under its label; a
// slider's head is its own label; a group of controls is named by the label
// and holds controls named on their own.
function formOf(control: ReactNode) {
	const type = isValidElement(control) ? control.type : undefined;
	if (type === Switch) return "switch";
	if (type === Checkbox) return "checkbox";
	if (type === Slider) return "slider";
	if (type === Select) return "trigger";
	if (type === OptionList || type === SegmentedControl) return "group";
	return "field";
}

/** The label (body 500) over its control, the description (meta) under it and the error in the description's place; a switch stands at the label's end and a checkbox on its first line. Base UI's field wires the label, the description, the error, the validity and the disabled state into the control. */
export function FormField<V>(props: FormFieldProps<V>) {
	useSectionField();
	const { label, description, disabled } = props;
	const error = props.field ? props.field.error : props.error;
	const control = props.field
		? props.children({
				value: props.field.value,
				onChange: props.field.onChange,
				onCommit: props.field.onCommit,
			})
		: props.children;
	const form = formOf(control);
	const labelId = useId();
	const saidId = useId();
	const holds =
		form === "switch" || form === "checkbox" ? form : ("field" as const);
	const named = (
		<Field.Label
			// A trigger is a button: a label element would press it.
			nativeLabel={form !== "trigger"}
			render={form === "trigger" ? <div /> : undefined}
			className={cn(
				text({ role: "body" }),
				textStrong({ role: "body" }),
				disabled && DISABLED,
			)}
		>
			{label}
		</Field.Label>
	);
	const said = error ? (
		<Field.Error match className={FORM_FIELD_ERROR}>
			{error}
		</Field.Error>
	) : description ? (
		<Field.Description className={text({ role: "meta" })}>
			{description}
		</Field.Description>
	) : null;
	// A group takes no field context: its label and its line under it name and
	// describe the group, never the controls inside.
	if (form === "group")
		return (
			<div className={cn(formField({ holds: "field" }), STACK)}>
				<p
					id={labelId}
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						disabled && DISABLED,
					)}
				>
					{label}
				</p>
				<GroupName
					value={{
						labelledBy: labelId,
						describedBy: error || description ? saidId : undefined,
					}}
				>
					{control}
				</GroupName>
				{error || description ? (
					<p
						id={saidId}
						className={error ? FORM_FIELD_ERROR : text({ role: "meta" })}
					>
						{error ?? description}
					</p>
				) : null}
			</div>
		);
	const box = cn(
		formField({ holds }),
		holds === "switch" ? BESIDE : holds === "checkbox" ? AHEAD : STACK,
	);
	return (
		<Field.Root invalid={Boolean(error)} disabled={disabled} className={box}>
			{holds === "checkbox" ? (
				<span className={cn(lineBox({ role: "body" }), BOX_LINE)}>
					<LabelTarget value={FIELD_TARGET}>{control}</LabelTarget>
				</span>
			) : null}
			{holds === "field" ? (
				<>
					{form === "slider" ? null : named}
					{control}
					{said}
				</>
			) : (
				<div className={LABEL_BLOCK}>
					{named}
					{said}
				</div>
			)}
			{holds === "switch" ? control : null}
		</Field.Root>
	);
}
