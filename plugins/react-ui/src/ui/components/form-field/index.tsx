import { Field } from "@base-ui/react/field";
import type { Datum, Draft } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Answered,
	ChangeKind,
	FieldBinding,
	FieldControl,
	Run,
	Runs,
} from "@fcalell/ui-core/descriptors";
import { markedRuns } from "@fcalell/ui-core/form";
import {
	DEFINITION_BOX,
	DEFINITION_BOX_AREA,
	DEFINITION_LABEL,
	DEFINITION_LINE,
	DEFINITION_NAME,
	DEFINITION_NAME_AREA,
	DEFINITION_UNDER,
	DEFINITION_VALUE,
	FIELD_ALONE,
	FIELD_ALONE_LINE,
	FIELD_ERROR_LINE,
	FIELD_OPTIONAL,
	FIELD_OPTIONAL_BOX,
	FIELD_OPTIONAL_LINE,
	FIELD_OPTIONAL_NAME,
	FORM_FIELD_SUMMARY_GLYPH,
	LINE_IN,
	ROW_END,
	row,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useEffect, useId, useMemo, useRef } from "react";
import { useFieldDraft } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import { RunText } from "../../lib/code.tsx";
import { type FieldedKey, FieldOwned, GroupName } from "../../lib/field.ts";
import { focusFirst } from "../../lib/focus.ts";
import { partRuns, partText } from "../../lib/parts.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { Icon } from "../icon/index.tsx";
import { InputBase } from "../input/base.tsx";
import type { ProseProps, TextInputProps } from "../input/index.tsx";
import { ProseBase } from "../input/prose.tsx";
import { PickerBase } from "../picker/base.tsx";
import type {
	PickerListProps,
	PickerMenuProps,
	PickerSegmentsProps,
} from "../picker/index.tsx";
import { PickerListBase } from "../picker/list.tsx";
import { SegmentsBase } from "../picker/segments.tsx";
import { END_GROUP, VALUE_LINE } from "../row/index.tsx";
import { SliderBase } from "../slider/base.tsx";
import type { SliderProps } from "../slider/index.tsx";
import { ChangeMark } from "../status/change.tsx";
import { SwitchBase } from "../switch/base.tsx";
import type { CheckboxProps } from "../switch/checkbox.tsx";
import { CheckboxBase } from "../switch/checkbox.tsx";
import type { SwitchProps } from "../switch/index.tsx";

const DISABLED = "text-ink-disabled";
const SUMMARY = "flex items-center min-w-0";
const SUMMARY_GLYPH = "flex shrink-0";
const SUMMARY_LABEL = "min-w-0 truncate";
const SUMMARY_ANSWER = "min-w-0 grow truncate";
// The field is a definition row of the form's grid: the label in the first
// column, wrapping inside it, the value line in the second (the change mark,
// then the control filling the line, or a toggle at its end), the description
// or the error under the control.
const LABEL = "wrap-normal";
// A toggle placed alone stands at the end of its name's line.
const NAME_GROWS = "grow";
interface FormFieldBase extends Closed {
	/** Where the field stands in a change set: its mark ahead of the field, on its label's line. */
	change?: ChangeKind;
	/** The control's name, drawn over it (beside a switch or a checkbox) (a short phrase; wraps, truncates in an answered field's summary row). */
	label: string;
	/** Under the control; disabled, it is the reason (a sentence; wraps). */
	description?: string;
	/** The field may be left empty: the word `optional` stands under its label, in the meta ink. */
	optional?: boolean;
	/** The control takes no input: the label in the disabled ink, the control its disabled form. */
	disabled?: boolean;
	/** The question is answered: while set the field folds to one summary row (a check, the label, `answer`, an Edit act) and renders no control. Clearing it unfolds the field and focuses its control. */
	answered?: Answered;
}

// A pick's props less what the field supplies (its label, description,
// optional word and error, and the fit a descriptor names), each of its forms
// keeping its own value and handler.
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

/** One control with its label, its description and its error. The control is the one descriptor set (`input`, `textArea`, `picker`, `switch`, `checkbox`, `slider`, `options`, `segments`: the component's own props, less the label the field supplies), which the field draws in its value line (a switch or a checkbox at its end); or any other control as `children`. Unbound, the consumer gives the error and the control; bound, the form's field gives both, and the control is a function of the field's value: `{(control) => <Input {...control} />}`. */
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
				/** The message that takes the description's place, the control drawn in error (a sentence; wraps): words, or runs whose `{ code }` stands boxed in the mono. */
				error?: Run | Runs;
				children?: never;
		  })
		| (Never<Controls<S, O, T>> &
				(
					| {
							/** Unbound. */
							field?: never;
							/** The message that takes the description's place, the control drawn in error (a sentence; wraps): words, or runs whose `{ code }` stands boxed in the mono. */
							error?: Run | Runs;
							/** Any other control. */
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
export type Body = FormFieldBase & {
	change?: ChangeKind;
	field?: FieldBinding<unknown>;
	error?: Run | Runs;
	children?: ReactNode | ((control: FieldControl<unknown>) => ReactNode);
	/** A control placed alone: no form's label column to share, so the name stands over the control (`FIELD_ALONE`). */
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

// The field's form follows which descriptor is set: a switch or a checkbox at
// the value line's end, any other filling it; a slider's head is its own
// label; a group of controls is named by the label and holds controls named
// on their own.
type Form = "field" | ControlKind;

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
// holds, or its children, bound drawn from the field's value.
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
	if (props.checkbox)
		return (
			<CheckboxBase
				{...props.checkbox}
				draft={draft as Draft<boolean | "mixed">}
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
	// The field names what it holds: a control among its children draws no
	// field of its own.
	const { field, children } = props;
	if (typeof children !== "function")
		return <FieldOwned value>{children}</FieldOwned>;
	return field ? (
		<FieldOwned value>
			{children({
				value: field.value,
				onChange: field.onChange,
				onCommit: field.onCommit,
			})}
		</FieldOwned>
	) : null;
}

// The field itself, one definition row: the label in the label column, the
// control in the value line, the description (meta) or the error under it;
// placed alone (`alone`), the label over the control. Base UI's field wires
// the label, the description, the error, the validity and the disabled state
// into the control. Outside the package's exports: a control placed alone
// draws itself through it.
export function FieldBody(props: Body) {
	const { label, description, optional, disabled, answered, change, alone } =
		props;
	const words = useWords();
	const folded = answered !== undefined;
	// One name for the field folded or not, so the browser moves the summary
	// into the field and back.
	// The field hosts its control's save: a save the server refused stands in
	// the error line until the control's next change.
	const kind = kindOf(props);
	const { draft, refused } = useFieldDraft(savedOf(props, kind));
	// The error as runs, a refused save's own message too (the server's
	// backticks box a machine name), and its words, which key its line and
	// say whether it stands.
	const given =
		refused === undefined
			? props.field
				? props.field.error
				: props.error
			: markedRuns(refused);
	const worded = given === undefined ? "" : partText(given);
	const error = worded === "" ? undefined : worded;
	const errorLine =
		given === undefined ? null : <RunText runs={partRuns(given)} />;
	// A folded field draws no control, so the consumer's function is not called.
	const control = folded ? null : controlOf(props, kind, draft, error);
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
	const groupName = useMemo(() => ({ labelledBy: labelId }), [labelId]);
	// A toggle stands at the value line's end; any other control fills it.
	const atEnd = form === "switch" || form === "checkbox";
	const area = form === "textArea";
	// An optional field on one line: its word hangs under a name as high as the
	// control (a text area's name hangs from its top, a slider names itself).
	const stacked = optional === true && !area && form !== "slider" && !alone;
	// The name on the first line, the word `optional` under it.
	const labelled = optional ? (
		<span>
			{label}
			<span className={cn(text({ role: "meta" }), FIELD_OPTIONAL)}>
				{words.optional}
			</span>
		</span>
	) : (
		label
	);
	const name = cn(
		text({ role: "body" }),
		DEFINITION_NAME,
		area && !alone && DEFINITION_NAME_AREA,
		alone && atEnd && NAME_GROWS,
		LABEL,
		stacked && FIELD_OPTIONAL_NAME,
		disabled && DISABLED,
	);
	const named = (
		<Field.Label
			// A trigger is a button: a label element would press it.
			nativeLabel={form !== "picker"}
			render={form === "picker" ? <div /> : undefined}
			className={name}
		>
			{labelled}
		</Field.Label>
	);
	const said = error ? (
		<Field.Error
			key={error}
			match
			className={cn(FIELD_ERROR_LINE, LINE_IN, DEFINITION_UNDER)}
		>
			{errorLine}
		</Field.Error>
	) : description ? (
		<Field.Description className={cn(text({ role: "meta" }), DEFINITION_UNDER)}>
			{description}
		</Field.Description>
	) : null;
	const mark = change ? <ChangeMark kind={change} /> : null;
	// A group takes no field context: its label names the group, never the
	// controls inside.
	if (answered)
		return (
			<div ref={root} className={cn(row({ state: "rest" }), SUMMARY)}>
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
				<Button
					glyph
					icon="Pencil"
					label={`${words.edit} ${label}`}
					onAct={answered.onEdit}
				/>
			</div>
		);
	if (alone) {
		const group = form === "options" || form === "segments";
		const head =
			form === "slider" ? (
				mark
			) : (
				<div className={FIELD_ALONE_LINE}>
					{mark}
					{group ? (
						<p id={labelId} className={name}>
							{labelled}
						</p>
					) : (
						named
					)}
					{atEnd ? (
						<span className={cn(ROW_END, END_GROUP)}>{control}</span>
					) : null}
				</div>
			);
		const body = group ? (
			<GroupName value={groupName}>{control}</GroupName>
		) : atEnd ? null : (
			control
		);
		// A group takes no field context, so its line under is its own.
		if (group)
			return (
				<div ref={root} className={FIELD_ALONE}>
					{head}
					{body}
					{error || description ? (
						<p
							key={error}
							className={
								error ? cn(FIELD_ERROR_LINE, LINE_IN) : text({ role: "meta" })
							}
						>
							{error ? errorLine : description}
						</p>
					) : null}
				</div>
			);
		return (
			<Field.Root
				ref={root}
				invalid={Boolean(error)}
				disabled={disabled}
				className={FIELD_ALONE}
			>
				{head}
				{body}
				{said}
			</Field.Root>
		);
	}
	if (form === "options" || form === "segments") {
		const title = (
			<p id={labelId} className={name}>
				{labelled}
			</p>
		);
		const under =
			error || description ? (
				<p
					key={error}
					className={cn(
						error ? cn(FIELD_ERROR_LINE, LINE_IN) : text({ role: "meta" }),
						DEFINITION_UNDER,
					)}
				>
					{error ? errorLine : description}
				</p>
			) : null;
		return (
			<div
				ref={root}
				className={cn(
					row({ state: "rest" }),
					DEFINITION_BOX,
					stacked && FIELD_OPTIONAL_BOX,
				)}
			>
				<span className={DEFINITION_LABEL}>{title}</span>
				<div
					className={cn(
						DEFINITION_LINE,
						VALUE_LINE,
						stacked && FIELD_OPTIONAL_LINE,
					)}
				>
					{mark}
					<div className={DEFINITION_VALUE}>
						<GroupName value={groupName}>{control}</GroupName>
					</div>
				</div>
				{under}
			</div>
		);
	}
	return (
		<Field.Root
			ref={root}
			invalid={Boolean(error)}
			disabled={disabled}
			className={cn(
				row({ state: "rest" }),
				DEFINITION_BOX,
				area && DEFINITION_BOX_AREA,
				stacked && FIELD_OPTIONAL_BOX,
			)}
		>
			{/* A slider's head is its own label. */}
			<span className={DEFINITION_LABEL}>
				{form === "slider" ? null : named}
			</span>
			<div
				className={cn(
					DEFINITION_LINE,
					VALUE_LINE,
					stacked && FIELD_OPTIONAL_LINE,
				)}
			>
				{mark}
				{atEnd ? (
					<span className={cn(ROW_END, END_GROUP)}>{control}</span>
				) : (
					<div className={DEFINITION_VALUE}>{control}</div>
				)}
			</div>
			{said}
		</Field.Root>
	);
}

/** One row of its form: the label (the body role) in the label column, as wide as the form's widest, the control filling the value line (a switch or a checkbox at its end) and the description (meta) or the error under the control; on touch the label stands over the control. Base UI's field wires the label, the description, the error, the validity and the disabled state into the control. A `change` draws the change mark at the value line's start. The label and the description are constants and always stand; a control given a selection paints itself, inert, until its read lands. The field hosts the save of its descriptor's control: the viewer's value holds while the save pends, and a refusal stands in the field's error line until the control's next change. */
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
