import { toggled } from "@fcalell/ui-core/list-state";
import type { ChipFamily } from "@fcalell/ui-core/tokens";
import {
	FIELD_PLACEHOLDER,
	field,
	fieldValue,
	PICKER_EMPTY,
	PICKER_VALUE,
	PILL_ACT,
	picker,
} from "@fcalell/ui-core/variants";
import { type ReactElement, type ReactNode, useContext, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { CellField } from "../../lib/field";
import { Ink } from "../../lib/ink";
import { Chip } from "../chip";
import { Icon } from "../icon";
import { Status } from "../status";
import type { PickerProps, PickOneProps, PickSeveralProps } from "./index";
import { PickSheet, useOptionGroups } from "./sheet";

// A field-fit trigger is the field box at the bar fit; in a table cell it
// fills the cell it stands in for.
const FIELD_TRIGGER = "flex-row shrink-0 items-center";
const FILL = "w-full";
const FIELD_VALUE = "min-w-0 grow shrink";
// A pick of several: the box wraps its chips, and the trigger that opens the
// sheet fills the line after them, its chevron at the box's end.
const SEVERAL_BOX = "flex-row flex-wrap items-center w-full";
const SEVERAL_TRIGGER =
	"flex-row grow self-stretch items-center justify-between min-w-target";
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

interface Several<V extends string | null> {
	value: readonly V[];
	onChange: (value: V[]) => void;
}

export function isSeveral<V extends string | null>(
	props: PickerProps<V>,
): props is PickerProps<V> & Several<V> {
	return Array.isArray(props.value);
}

interface Composed {
	// The family a chip column's value and options draw as chips of.
	chip?: ChipFamily;
	// The trigger's name where its composer says more than the value (a sort's direction).
	name?: string;
}

// What every pick draws: the public `Picker`, or a composer's pick that says
// more (a sort's name with its direction, a chip column's chips, a table
// cell's edit). Outside the package's exports. Overloaded as `Picker` is, so
// a handler's parameter is typed by the value beside it.
export function PickerBase<V extends string | null = string>(
	props: PickOneProps<V> & Composed,
): ReactElement;
export function PickerBase<V extends string | null = string>(
	props: PickSeveralProps<V> & Composed,
): ReactElement;
export function PickerBase<V extends string | null = string>(
	props: PickerProps<V> & Composed,
): ReactElement;
export function PickerBase<V extends string | null = string>(
	props: PickerProps<V> & Composed,
) {
	const { label, options, fit = "field", act, chip, name } = props;
	const several = isSeveral(props) ? props : undefined;
	const value = isSeveral(props) ? undefined : props.value;
	// In a table cell the pick opens as its edit starts, and its sheet gone,
	// its leave played, ends the edit.
	const cell = useContext(CellField);
	const [open, setOpen] = useState(cell !== undefined);
	const groups = useOptionGroups(options);
	const current = groups.flat.find((option) => option.value === value);
	const chosen = (several?.value ?? []).flatMap(
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
	const ink = row && open ? "ink-body" : "ink-meta";
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
				)}
			>
				{current?.label ?? label}
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
				)}
			>
				{current?.label ?? label}
			</RNText>
		);
	// The chips of a pick of several each hold their own remove act, so the
	// box is no press: the trigger that opens the sheet stands after them.
	const trigger = several ? (
		<View
			className={cn(field({ fit: "bar" }), picker({ fit: "bar" }), SEVERAL_BOX)}
		>
			{chosen.map((option) => (
				<Chip
					key={String(option.value)}
					family="neutral"
					label={option.label}
					onRemove={() =>
						several.onChange(
							several.value.filter((one) => one !== option.value),
						)
					}
				/>
			))}
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={name ?? label}
				accessibilityState={{ expanded: open }}
				onPress={() => setOpen(true)}
				className={SEVERAL_TRIGGER}
			>
				{chosen.length === 0 ? (
					<RNText
						numberOfLines={1}
						className={cn(
							fieldValue({ kind: "text" }),
							FIELD_PLACEHOLDER,
							FIELD_VALUE,
						)}
					>
						{label}
					</RNText>
				) : null}
				<Icon name="ChevronDown" fit="control" />
			</Pressable>
		</View>
	) : (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={name ?? cell?.label ?? label}
			accessibilityValue={{ text: current?.label }}
			accessibilityState={{ expanded: open }}
			onPress={() => setOpen(true)}
			className={
				row
					? cn(PILL_ACT, picker({ fit }), ROW_TRIGGER, open && ROW_OPEN)
					: cn(
							field({ fit: "bar" }),
							picker({ fit }),
							FIELD_TRIGGER,
							(cell || fit === "bar") && FILL,
						)
			}
		>
			{glyph}
			{shown}
			{current?.chip ? (
				<View className={KIND}>
					<Chip {...current.chip} />
				</View>
			) : null}
			<Ink.Provider value={ink}>
				<Icon name="ChevronDown" fit={row ? "meta" : "control"} />
			</Ink.Provider>
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
				act={act}
				chip={chip}
			/>
		</>
	);
}
