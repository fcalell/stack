import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import { toggled } from "@fcalell/ui-core/list-state";
import type { ChipFamily } from "@fcalell/ui-core/tokens";
import {
	CHIPS_RUN,
	CHIPS_TRIGGER,
	FIELD_PLACEHOLDER,
	field,
	fieldValue,
	PICKER_EMPTY,
	PICKER_VALUE,
	picker,
	WORD_ACT,
} from "@fcalell/ui-core/variants";
import { type ReactElement, type ReactNode, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { useHeldDraft } from "../../lib/act";
import { cn } from "../../lib/cn";
import type { CellFit } from "../../lib/field";
import { Ink } from "../../lib/ink";
import { inertProps, paintControl, useShown } from "../../lib/paint";
import { OptionsLine, useOptions } from "../../lib/read";
import { Chip } from "../chip";
import { Icon } from "../icon";
import { Status } from "../status";
import type { PickerProps, PickOneProps, PickSeveralProps } from "./index";
import { NO_OPTIONS, PickSheet, useOptionGroups } from "./sheet";

// A field-fit trigger is the field box at the bar fit; in a table cell it
// fills the cell it stands in for. It yields only past its line, so a long
// value truncates before the chevron.
const FIELD_TRIGGER = "flex-row max-w-full items-center";
const FILL = "w-full";
const FIELD_VALUE = "min-w-0 grow shrink";
// A pick of several: the chips wrap in a run, and the trigger that opens the
// sheet stands beside it, filling what the run leaves, its chevron at the
// box's end; the run wraps, so the chevron never takes a line of its own.
const SEVERAL_BOX = "flex-row items-stretch w-full";
const SEVERAL_RUN = "flex-row flex-wrap items-center gap-inside shrink min-w-0";
const SEVERAL_TRIGGER =
	"flex-row grow shrink-0 items-center justify-end min-w-target";
const FIELD_STATUS = "min-w-0 grow shrink flex-row";
// A chip column's value is its chip.
const CHIP_SLOT = "flex-row grow min-w-0";
// An option's own chip, centred on the value's line (a chip hugs the top of its row).
const KIND = "shrink-0 self-center";
// A row-fit trigger centres in its row and pulls back by its own padding at
// the row's end; it stands over a row's hit. Open, it holds the press wash
// and the value takes the body ink.
const ROW_TRIGGER =
	"flex-row shrink-0 self-center items-center -me-inside active:bg-wash-press";
const ROW_OPEN = "bg-wash-press";
const ROW_VALUE = "shrink";
const OPEN_VALUE = "text-ink-body";
const HIDDEN = "opacity-0";
const DISABLED_FILL = "bg-fill-disabled";
const DISABLED_INK = "text-ink-disabled";

interface Several<V extends string | null> {
	value: readonly V[];
	onChange: (value: V[]) => void;
}

// A pick's props once its value is drawn: the viewer's pick or the
// selection's, no longer a datum.
type Drawn<V extends string | null> = Omit<
	PickerProps<V>,
	"value" | "onChange"
> &
	(
		| { value?: V; onChange: (value: V) => void }
		| { value: readonly V[]; onChange: (value: V[]) => void }
	);

function isSeveral<V extends string | null>(
	props: Drawn<V>,
): props is Drawn<V> & Several<V> {
	return Array.isArray(props.value);
}

interface Composed {
	// The family a chip column's value and options draw as chips of.
	chip?: ChipFamily;
	// The `Table` cell it edits in: the pick opens as the edit starts, named by the cell.
	cell?: CellFit;
	// Its data is not here: the trigger's box filled at its loaded size, its content not drawn, inert.
	painted?: boolean;
	// Set by a `FormField` around the pick: the box stands at the form's field
	// height, `edge-error` when the field is in error and the disabled fill when
	// it is disabled, and the field's label names the pick (so no `placeholder`
	// falls back to it).
	form?: { invalid: boolean; disabled: boolean };
}

// What every pick draws, on the `draft` its host holds: a field hosts the draft
// of its picker and draws a rejection in its own line. Waiting options paint
// the trigger, and ended ones say so in a line under it. Outside the package's
// exports.
export function PickerBase<V extends string | null = string>(
	given: Omit<PickerProps<V>, "value" | "onChange"> & {
		draft: Draft<V | readonly V[] | undefined>;
		onChange: (next: V | V[]) => unknown;
	} & Composed,
) {
	// The value is the viewer's pick once made, else the selection's; a painted
	// pick draws as a single one, as the placeholder is no array.
	const { draft } = given;
	// Waiting options paint the trigger as a waiting value does, and the sheet
	// has no rows to open.
	const { drawn: waiting, retry } = useOptions(given.options);
	const painted = given.painted || draft.painted || waiting.painted;
	const props = {
		...given,
		value: draft.painted ? undefined : draft.value,
		onChange: (next: V | V[]) => {
			draft.change(next, () => given.onChange(next));
		},
	} as Drawn<V>;
	const { label, placeholder, fit = "field", act, chip, cell, form } = given;
	// What an empty box says: the hint, else what is picked (a field's own label
	// stands over it already).
	const hint = placeholder ?? (form ? undefined : label);
	const fieldBox = field({
		fit: form ? "form" : "bar",
		state: form?.invalid ? "error" : "rest",
	});
	const disabled = form?.disabled === true;
	const visible = useShown(painted);
	const several = isSeveral(props) ? props : undefined;
	const value = isSeveral(props) ? undefined : props.value;
	// In a table cell the pick opens as its edit starts, and its sheet gone,
	// its leave played, ends the edit.
	const [open, setOpen] = useState(cell !== undefined);
	const groups = useOptionGroups(waiting.painted ? NO_OPTIONS : waiting.value);
	// Painted, the trigger shows the label alone, not drawn.
	const current = painted
		? undefined
		: groups.flat.find((option) => option.value === value);
	const chosen = (painted ? [] : (several?.value ?? [])).flatMap(
		(one) => groups.flat.find((option) => option.value === one) ?? [],
	);
	// The sheet closes itself on a single pick; a pick of several keeps it
	// open, an option toggling in and out.
	const pick = (next: V) => {
		if (isSeveral(props)) props.onChange(toggled(props.value, next));
		else props.onChange(next);
	};
	const status = current?.status ? (
		<Status state={current.status} label={current.label} />
	) : null;
	const row = fit === "row";
	const ink = disabled ? "ink-disabled" : row && open ? "ink-body" : "ink-meta";
	const glyph = current?.icon ? (
		<Ink.Provider value={ink}>
			<Icon name={current.icon} fit={row ? "meta" : "control"} />
		</Ink.Provider>
	) : null;
	let shown: ReactNode;
	if (status)
		shown = row ? status : <View className={FIELD_STATUS}>{status}</View>;
	else if (row)
		shown = (
			<RNText
				numberOfLines={1}
				className={cn(
					PICKER_VALUE,
					ROW_VALUE,
					current === undefined && FIELD_PLACEHOLDER,
					open && OPEN_VALUE,
					painted && HIDDEN,
				)}
			>
				{current?.label ?? hint}
			</RNText>
		);
	else if (chip && current && current.value !== null)
		shown = (
			<View className={CHIP_SLOT}>
				<Chip family={chip} label={current.label} />
			</View>
		);
	else
		shown = (
			<RNText
				numberOfLines={1}
				className={cn(
					fieldValue({ kind: "text" }),
					current === undefined && FIELD_PLACEHOLDER,
					(current?.value ?? null) === null && PICKER_EMPTY,
					FIELD_VALUE,
					disabled && DISABLED_INK,
					painted && HIDDEN,
				)}
			>
				{current?.label ?? hint}
			</RNText>
		);
	// The chips of a pick of several each hold their own remove act, so the
	// box is no press: the trigger that opens the sheet stands after them.
	const trigger = several ? (
		<View
			{...inertProps(painted === true || disabled)}
			className={cn(
				fieldBox,
				picker({ fit: "bar" }),
				SEVERAL_BOX,
				disabled && DISABLED_FILL,
				painted && paintControl(visible),
			)}
		>
			{chosen.length > 0 ? (
				<View className={cn(CHIPS_RUN, SEVERAL_RUN)}>
					{chosen.map((option) => (
						<Chip
							key={String(option.value)}
							family="neutral"
							label={option.label}
							onRemove={() =>
								several.onChange(toggled(several.value, option.value))
							}
						/>
					))}
				</View>
			) : null}
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityState={{ expanded: open }}
				onPress={() => setOpen(true)}
				className={cn(CHIPS_TRIGGER, SEVERAL_TRIGGER)}
			>
				{chosen.length === 0 ? (
					<RNText
						numberOfLines={1}
						className={cn(
							fieldValue({ kind: "text" }),
							FIELD_PLACEHOLDER,
							FIELD_VALUE,
							disabled && DISABLED_INK,
							painted && HIDDEN,
						)}
					>
						{hint}
					</RNText>
				) : null}
				<View className={painted ? HIDDEN : undefined}>
					<Icon name="ChevronDown" fit="control" />
				</View>
			</Pressable>
		</View>
	) : (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={cell?.label ?? label}
			accessibilityValue={{ text: current?.label }}
			accessibilityState={{ expanded: open, disabled }}
			disabled={disabled}
			onPress={() => setOpen(true)}
			{...inertProps(painted === true)}
			className={cn(
				row
					? cn(WORD_ACT, picker({ fit }), ROW_TRIGGER, open && ROW_OPEN)
					: cn(
							fieldBox,
							picker({ fit }),
							FIELD_TRIGGER,
							(cell || fit === "bar") && FILL,
							disabled && DISABLED_FILL,
						),
				painted && paintControl(visible),
			)}
		>
			{glyph}
			{shown}
			{current?.chip ? (
				<View className={KIND}>
					<Chip {...current.chip} />
				</View>
			) : null}
			<View className={painted ? HIDDEN : undefined}>
				<Ink.Provider value={ink}>
					<Icon name="ChevronDown" fit={row ? "meta" : "control"} />
				</Ink.Provider>
			</View>
		</Pressable>
	);
	return (
		<>
			{trigger}
			<PickSheet
				title={label}
				groups={groups}
				value={value}
				chosen={several?.value}
				onChange={pick}
				open={open}
				onClose={() => setOpen(false)}
				onGone={cell?.done}
				typing={cell !== undefined}
				act={act}
				chip={chip}
			/>
			<OptionsLine drawn={waiting} retry={retry} />
		</>
	);
}

// A Picker that holds its own draft, as a bare one, a row's pick and a cell's
// do; a rejection toasts. Overloaded as `Picker` is. Outside the package's
// exports.
export function HeldPicker<V extends string | null = string>(
	props: PickOneProps<V> & Composed,
): ReactElement;
export function HeldPicker<V extends string | null = string>(
	props: PickSeveralProps<V> & Composed,
): ReactElement;
export function HeldPicker<V extends string | null = string>(
	props: PickerProps<V> & Composed,
): ReactElement;
export function HeldPicker<V extends string | null = string>(
	props: PickerProps<V> & Composed,
) {
	const { value, onChange, label, placeholder, options, fit, act } = props;
	return (
		<PickerBase<V>
			draft={useHeldDraft<V | readonly V[] | undefined>(value)}
			onChange={onChange as (next: V | V[]) => unknown}
			label={label}
			placeholder={placeholder}
			options={options}
			fit={fit}
			act={act}
			chip={props.chip}
			cell={props.cell}
			painted={props.painted}
		/>
	);
}
