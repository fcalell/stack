import { Field } from "@base-ui/react/field";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Answered,
	ChangeKind,
	FieldBinding,
	FieldControl,
} from "@fcalell/ui-core/descriptors";
import {
	FIELD_ERROR_LINE,
	FORM_FIELD_SUMMARY,
	FORM_FIELD_SUMMARY_GLYPH,
	formField,
	lineBox,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { FieldRefusal, GroupName } from "../../lib/field.ts";
import { focusFirst } from "../../lib/focus.ts";
import { useWords } from "../../lib/words.tsx";
import { CheckboxBase } from "../checkbox/base.tsx";
import type { CheckboxProps } from "../checkbox/index.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { OptionList, type OptionListProps } from "../option-list/index.tsx";
import {
	SegmentedControl,
	type SegmentedControlProps,
} from "../segmented-control/index.tsx";
import { Select, type SelectProps } from "../select/index.tsx";
import { Slider, type SliderProps } from "../slider/index.tsx";
import { ChangeMark } from "../status/change.tsx";
import { Switch, type SwitchProps } from "../switch/index.tsx";

const STACK = "flex flex-col min-w-0 max-w-full";
const BESIDE = "flex items-center min-w-0";
const AHEAD = "flex items-start min-w-0";
const LABEL_BLOCK = "flex flex-col grow min-w-0";
// The checkbox stands on its label's first line, a box one body line tall;
// the label is its target.
const BOX_LINE = "flex shrink-0 items-center h-lh";
// A change mark stands ahead of the whole field on its first line, a label's
// line tall.
const MARKED = "flex items-start gap-inside min-w-0";
const MARKED_BODY = "grow min-w-0";
const DISABLED = "text-ink-disabled";
// Base UI's field names and describes the checkbox through its label.
const FIELD_TARGET = {};
const SUMMARY = "flex items-center min-w-0";
const SUMMARY_GLYPH = "flex shrink-0";
const SUMMARY_LABEL = "min-w-0 truncate";
const SUMMARY_ANSWER = "min-w-0 grow truncate";
interface FormFieldBase extends Closed {
	/** Where the field stands in a change set: its mark ahead of the field, on its label's line. */
	change?: ChangeKind;
	/** The control's name, drawn over it (beside a switch or a checkbox) (a short phrase; wraps, truncates in an answered field's summary row). */
	label: string;
	/** Under the control; disabled, it is the reason (a sentence; wraps). */
	description?: string;
	/** The control takes no input: the label in the disabled ink, the control its disabled form. */
	disabled?: boolean;
	/** The question is answered: while set the field folds to one summary row (a check, the label, `answer`, an Edit act) and renders no control. Clearing it unfolds the field and focuses its control. */
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

/** One control with its label, its description and its error. The control is the one descriptor set (`switch`, `checkbox`, `slider`, `select`, `options`, `segments`: the component's own props, less the label the field supplies), which the field draws in its form: a switch at the label's end, a checkbox ahead of it, any other under it; or any other control as `children`. Unbound, the consumer gives the error and the control; bound, the form's field gives both, and the control is a function of the field's value: `{(control) => <Input {...control} />}`. */
export type FormFieldProps<
	V = unknown,
	S extends string | null = string,
	O extends string = string,
	T = unknown,
> = FormFieldBase &
	(
		| (OneOf<Controls<S, O, T>> & {
				/** Unbound. */
				field?: never;
				/** The message that takes the description's place, the control drawn in error (a sentence; wraps). */
				error?: string;
				children?: never;
		  })
		| (Never<Controls<S, O, T>> &
				(
					| {
							/** Unbound. */
							field?: never;
							/** The message that takes the description's place, the control drawn in error (a sentence; wraps). */
							error?: string;
							/** Any other control (an Input, a TextArea, a Picker). */
							children?: ReactNode;
					  }
					| {
							/** The form's field: its value, its change handler and its error. */
							field: FieldBinding<V>;
							error?: never;
							/** The control, handed the field's value and change handler. */
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

// The field's form follows which descriptor is set: a switch at the label's
// end, a checkbox ahead of it on its first line, any other under its label; a
// slider's head is its own label; a group of controls is named by the label
// and holds controls named on their own.
type Form = "field" | ControlKind;

// The control a field draws: the descriptor's component, or its children,
// bound drawn from the field's value.
function controlOf(props: Body, kind: ControlKind | undefined): ReactNode {
	const { label } = props;
	if (props.switch) return <Switch {...props.switch} label={label} />;
	if (props.checkbox)
		return (
			<CheckboxBase {...props.checkbox} label={label} target={FIELD_TARGET} />
		);
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

// The field itself: the label over its control, the description (meta) under
// it and the error in the description's place; a switch stands at the label's
// end and a checkbox on its first line. Base UI's field wires the label, the
// description, the error, the validity and the disabled state into the control.
function FieldBody(props: Body) {
	const { label, description, disabled, answered } = props;
	const words = useWords();
	const folded = answered !== undefined;
	// What a control refused (a file of the wrong type) stands in the error
	// line until its next pick.
	const [refused, refuse] = useState<string>();
	const error = refused ?? (props.field ? props.field.error : props.error);
	// A folded field draws no control, so the consumer's function is not called.
	const kind = kindOf(props);
	const control = folded ? null : controlOf(props, kind);
	const form: Form = kind ?? "field";
	const root = useRef<HTMLDivElement>(null);
	const wasFolded = useRef(folded);
	// The field unfolding hands focus to its control, which it owns; folding
	// over a focused control (focus then falls to the page) hands it to the
	// summary's Edit act, a frame later: an Enter that commits would otherwise
	// reach the Edit act's own press.
	useEffect(() => {
		const was = wasFolded.current;
		wasFolded.current = folded;
		if (was && !folded) focusFirst(root.current);
		if (was || !folded || document.activeElement !== document.body)
			return undefined;
		const frame = requestAnimationFrame(() =>
			root.current?.querySelector("button")?.focus(),
		);
		return () => cancelAnimationFrame(frame);
	}, [folded]);
	const labelId = useId();
	// What a group of controls is named by.
	const group = useMemo(() => ({ labelledBy: labelId }), [labelId]);
	const holds =
		form === "switch" || form === "checkbox" ? form : ("field" as const);
	const named = (
		<Field.Label
			// A trigger is a button: a label element would press it.
			nativeLabel={form !== "select"}
			render={form === "select" ? <div /> : undefined}
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
		<Field.Error match className={FIELD_ERROR_LINE}>
			{error}
		</Field.Error>
	) : description ? (
		<Field.Description className={text({ role: "meta" })}>
			{description}
		</Field.Description>
	) : null;
	// A group takes no field context: its label names the group, never the
	// controls inside.
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
	if (form === "options" || form === "segments")
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
					<p className={error ? FIELD_ERROR_LINE : text({ role: "meta" })}>
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
					{control}
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

/** The label (body 500) over its control, the description (meta) under it and the error in the description's place; a switch stands at the label's end and a checkbox on its first line. Base UI's field wires the label, the description, the error, the validity and the disabled state into the control. A `change` draws the change mark ahead of the field, on its label's line. The label and the description are constants and always stand; a control given a selection paints itself, inert, until its read lands. */
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
		<div className={MARKED}>
			<span className={cn(lineBox({ role: "body" }), BOX_LINE)}>
				<ChangeMark kind={change} />
			</span>
			<div className={MARKED_BODY}>{field}</div>
		</div>
	);
}
