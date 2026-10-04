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
import { type ReactNode, useContext, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { CellField } from "../../lib/field";
import { Ink } from "../../lib/ink";
import { Chip } from "../chip";
import { Icon } from "../icon";
import { Status } from "../status";
import type { PickerProps } from "./index";
import { PickSheet, useOptionGroups } from "./sheet";

// A field-fit trigger is the field box at the bar fit; in a table cell it
// fills the cell it stands in for.
const FIELD_TRIGGER = "flex-row shrink-0 items-center";
const IN_CELL = "w-full";
const FIELD_VALUE = "min-w-0 grow shrink";
const FIELD_STATUS = "min-w-0 grow shrink flex-row";
// A chip column's value is its chip.
const CHIP_SLOT = "flex-row grow min-w-0";
// A row-fit trigger centres in its row and pulls back by its own padding at
// the row's end; it stands over a row's hit. Open, it holds the press wash
// and the value takes the body ink.
const ROW_TRIGGER =
	"flex-row shrink-0 self-center items-center -me-inside active:bg-wash-press";
const ROW_OPEN = "bg-wash-press";
const ROW_VALUE = "shrink";
const OPEN_VALUE = "text-ink-body";

/** What every pick draws: the public `Picker`, or a composer's pick that says more (a sort's name with its direction, a chip column's chips, a table cell's edit). Outside the package's exports. */
export function PickerBase<V extends string | null = string>({
	label,
	options,
	value,
	onChange,
	fit = "field",
	act,
	chip,
	name,
}: PickerProps<V> & {
	/** The family a chip column's value and options draw as chips of. */
	chip?: ChipFamily;
	/** The trigger's name where its composer says more than the value (a sort's direction). */
	name?: string;
}) {
	// In a table cell the pick opens as its edit starts, and its sheet gone,
	// its leave played, ends the edit.
	const cell = useContext(CellField);
	const [open, setOpen] = useState(cell !== undefined);
	const groups = useOptionGroups(options);
	const current = groups.flat.find((option) => option.value === value);
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
	return (
		<>
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
								cell && IN_CELL,
							)
				}
			>
				{glyph}
				{shown}
				<Ink.Provider value={ink}>
					<Icon name="ChevronDown" fit={row ? "meta" : "control"} />
				</Ink.Provider>
			</Pressable>
			<PickSheet
				title={label}
				groups={groups}
				value={value}
				onChange={onChange}
				open={open}
				onClose={() => setOpen(false)}
				onGone={cell?.done}
				act={act}
				chip={chip}
			/>
		</>
	);
}
