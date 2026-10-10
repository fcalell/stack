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
	GROUP_ITEM,
	summaryContentTone,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import {
	isValidElement,
	type ReactNode,
	useContext,
	useMemo,
	useState,
} from "react";
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
import { GroundContext } from "../../lib/ground";
import { Ink } from "../../lib/ink";
import { Strut } from "../../lib/strut";
import { useWords } from "../../lib/words";
import { Checkbox, type CheckboxProps } from "../checkbox";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";
import { OptionList, type OptionListProps } from "../option-list";
import { SegmentedControl } from "../segmented-control";
import { Slider } from "../slider";
import { ChangeMark } from "../status/change";
import { Switch } from "../switch";

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

// Unbound, the consumer gives the error and the control; bound, the form's
// field gives both, and the control is a function of the field's value:
// `{(control) => <Input {...control} />}`.
export type FormFieldProps<V = unknown> = FormFieldBase &
	(
		| {
				field?: never;
				/** The message that takes the description's place, the control drawn in error (a sentence; wraps). */
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
	if (type === OptionList) return "options";
	if (type === SegmentedControl) return "segments";
	return "field";
}

// The form a `FormField` element waits as, read off its props before its data:
// a loading `Section` and a `Form` stand it for each field they hold. An
// answered field folds to one summary row, whatever its control; a list of
// options carries the rows its source declares.
export function fieldWaitOf(node: ReactNode): FieldShape {
	if (!isValidElement<FormFieldProps>(node))
		return { holds: "field", described: false };
	const { answered, description } = node.props;
	const described = Boolean(description);
	if (answered) return { holds: "folded", described };
	const control = fieldControl(node.props);
	const form = formOf(control);
	if (form === "options" && isValidElement<OptionListProps>(control))
		return {
			holds: "options",
			described,
			options: optionsWaitOf(control.props),
		};
	return {
		holds:
			form === "switch" ||
			form === "checkbox" ||
			form === "slider" ||
			form === "segments"
				? form
				: "field",
		described,
	};
}

// The field itself: the label over its control, a switch at the label's end and a
// checkbox on its first line, the label row its target. The label names a
// typing control; disabled, the label takes the disabled ink, the control its
// disabled cells, and the description stays as the reason.
function FieldBody<V>(props: FormFieldProps<V>) {
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
	const control = folded ? null : fieldControl(props);
	const form = formOf(control);
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
	if (form === "checkbox" && isValidElement<CheckboxProps>(control)) {
		const { checked, onChange } = control.props;
		return (
			<Pressable
				accessibilityRole="checkbox"
				accessibilityLabel={label}
				accessibilityState={{ checked, disabled }}
				disabled={disabled}
				onPress={() => onChange(checked !== true)}
				className={cn(formField({ holds: "checkbox" }), AHEAD)}
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
// the field, on its label's line. In a `Group` it stands as one of the card's
// items at the card's inset, the group's hairline between, its label kept.
export function FormField<V>(props: FormFieldProps<V>) {
	const { change } = props;
	const item = useContext(GroundContext) === "group" && GROUP_ITEM;
	const field = <FieldBody<V> {...props} />;
	const marked =
		change === undefined ? (
			field
		) : (
			<View className={MARKED}>
				<View className={BOX_LINE}>
					<Strut role="body" />
					<ChangeMark kind={change} />
				</View>
				<View className={MARKED_BODY}>{field}</View>
			</View>
		);
	if (!item) return marked;
	// The field is the card's one item: what it holds (a Slider) is no second
	// item, so its control stands on the list ground.
	return (
		<View className={item}>
			<GroundContext.Provider value="list">{marked}</GroundContext.Provider>
		</View>
	);
}
