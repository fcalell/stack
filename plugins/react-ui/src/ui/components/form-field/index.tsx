import { Field } from "@base-ui/react/field";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Answered,
	FieldBinding,
	FieldControl,
} from "@fcalell/ui-core/descriptors";
import {
	FORM_FIELD_ERROR,
	FORM_FIELD_SUMMARY,
	FORM_FIELD_SUMMARY_GLYPH,
	formField,
	lineBox,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import {
	isValidElement,
	type ReactNode,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { FieldRefusal, GroupName, LabelTarget } from "../../lib/field.ts";
import { useWords } from "../../lib/words.tsx";
import { Checkbox } from "../checkbox/index.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";
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
const SUMMARY = "flex items-center min-w-0";
const SUMMARY_GLYPH = "flex shrink-0";
const SUMMARY_LABEL = "min-w-0 truncate";
const SUMMARY_ANSWER = "min-w-0 grow truncate";
// What a reopened field focuses first: the first control it holds that a
// viewer can reach (Base UI keeps hidden inputs beside a select).
const CONTROLS = "input, textarea, button";
type Control = HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement;

function focusFirst(root: HTMLElement | null) {
	const reachable = (control: Control) =>
		!control.disabled &&
		control.tabIndex >= 0 &&
		control.getAttribute("aria-hidden") !== "true";
	Array.from(root?.querySelectorAll<Control>(CONTROLS) ?? [])
		.find(reachable)
		?.focus();
}

interface FormFieldBase extends Closed {
	/** The control's name, drawn over it (beside a switch or a checkbox). */
	label: string;
	/** A sentence under the control; disabled, it is the reason. */
	description?: string;
	/** The control takes no input: the label in the disabled ink, the control its disabled form. */
	disabled?: boolean;
	/** The question is answered: while set the field folds to one summary row (a check, the label, `answer`, an Edit act) and renders no control. Clearing it unfolds the field and focuses its control. */
	answered?: Answered;
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

// The control a field holds: its children, or, bound, its children drawn from
// the field's value.
function controlOf<V>(props: FormFieldProps<V>): ReactNode {
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
	if (type === Select) return "trigger";
	if (type === OptionList || type === SegmentedControl) return "group";
	return "field";
}

/** The label (body 500) over its control, the description (meta) under it and the error in the description's place; a switch stands at the label's end and a checkbox on its first line. Base UI's field wires the label, the description, the error, the validity and the disabled state into the control. */
export function FormField<V>(props: FormFieldProps<V>) {
	const { label, description, disabled, answered } = props;
	const words = useWords();
	const folded = answered !== undefined;
	// What a control refused (a file of the wrong type) stands in the error
	// line until its next pick.
	const [refused, refuse] = useState<string>();
	const error = refused ?? (props.field ? props.field.error : props.error);
	// A folded field draws no control, so the consumer's function is not called.
	const control = folded ? null : controlOf(props);
	const form = formOf(control);
	const root = useRef<HTMLDivElement>(null);
	const wasFolded = useRef(folded);
	// The field unfolding hands focus to its control, which it owns.
	useEffect(() => {
		if (wasFolded.current && !folded) focusFirst(root.current);
		wasFolded.current = folded;
	}, [folded]);
	const labelId = useId();
	const saidId = useId();
	// What a group of controls is named and described by, one value per change.
	const described = error || description ? saidId : undefined;
	const group = useMemo(
		() => ({ labelledBy: labelId, describedBy: described }),
		[labelId, described],
	);
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
	if (answered)
		return (
			<div ref={root} className={cn(FORM_FIELD_SUMMARY, SUMMARY)}>
				<span className={cn(FORM_FIELD_SUMMARY_GLYPH, SUMMARY_GLYPH)}>
					<Icon name="Check" />
				</span>
				<p
					className={cn(
						text({ role: "body" }),
						textStrong({ role: "body" }),
						SUMMARY_LABEL,
					)}
				>
					{label}
				</p>
				<p className={cn(text({ role: "meta" }), SUMMARY_ANSWER)}>
					{answered.answer}
				</p>
				<IconButton
					icon="Pencil"
					fit="bar"
					label={`${words.edit} ${label}`}
					onAct={answered.onEdit}
				/>
			</div>
		);
	if (form === "group")
		return (
			<div ref={root} className={cn(formField({ holds: "field" }), STACK)}>
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
				<GroupName value={group}>{control}</GroupName>
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
		<Field.Root
			ref={root}
			invalid={Boolean(error)}
			disabled={disabled}
			className={box}
		>
			{holds === "checkbox" ? (
				<span className={cn(lineBox({ role: "body" }), BOX_LINE)}>
					<LabelTarget value={FIELD_TARGET}>{control}</LabelTarget>
				</span>
			) : null}
			{holds === "field" ? (
				<>
					{form === "slider" ? null : named}
					<FieldRefusal value={refuse}>{control}</FieldRefusal>
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
