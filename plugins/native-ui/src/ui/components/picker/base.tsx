import { useDraft } from "@fcalell/plugin-api/tanstack-query";
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
import { cn } from "../../lib/cn";
import type { CellFit } from "../../lib/field";
import { Ink } from "../../lib/ink";
import { inertProps, paintControl, useShown } from "../../lib/paint";
import { Chip } from "../chip";
import { Icon } from "../icon";
import { Status } from "../status";
import type { PickerProps, PickOneProps, PickSeveralProps } from "./index";
import { PickSheet, useOptionGroups } from "./sheet";

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
}

// What every pick draws: the public `Picker`, or a composer's pick that says
// more (a chip column's chips, a table cell's edit). Outside the package's exports. Overloaded as `Picker` is, so
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
	given: PickerProps<V> & Composed,
) {
	// The value is the viewer's pick once made, else the selection's; a painted
	// pick draws as a single one, as the placeholder is no array.
	const draft = useDraft<V | readonly V[] | undefined>(given.value);
	const painted = given.painted || draft.painted;
	const props = {
		...given,
		value: draft.painted ? undefined : draft.value,
		onChange: (next: V | V[]) => {
			draft.change(next);
			(given.onChange as (next: V | V[]) => void)(next);
		},
	} as Drawn<V>;
	const { label, options, fit = "field", act, chip, cell } = given;
	const visible = useShown(painted);
	const several = isSeveral(props) ? props : undefined;
	const value = isSeveral(props) ? undefined : props.value;
	// In a table cell the pick opens as its edit starts, and its sheet gone,
	// its leave played, ends the edit.
	const [open, setOpen] = useState(cell !== undefined);
	const groups = useOptionGroups(options);
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
					painted && HIDDEN,
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
					painted && HIDDEN,
				)}
			>
				{current?.label ?? label}
			</RNText>
		);
	// The chips of a pick of several each hold their own remove act, so the
	// box is no press: the trigger that opens the sheet stands after them.
	const trigger = several ? (
		<View
			{...inertProps(painted === true)}
			className={cn(
				field({ fit: "bar" }),
				picker({ fit: "bar" }),
				SEVERAL_BOX,
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
							painted && HIDDEN,
						)}
					>
						{label}
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
			accessibilityState={{ expanded: open }}
			onPress={() => setOpen(true)}
			{...inertProps(painted === true)}
			className={cn(
				row
					? cn(WORD_ACT, picker({ fit }), ROW_TRIGGER, open && ROW_OPEN)
					: cn(
							field({ fit: "bar" }),
							picker({ fit }),
							FIELD_TRIGGER,
							(cell || fit === "bar") && FILL,
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
		</>
	);
}
