import type {
	IconAct,
	Option,
	OptionGroup,
} from "@fcalell/ui-core/descriptors";
import {
	FIELD_PLACEHOLDER,
	field,
	fieldValue,
	PICKER_EMPTY,
	PICKER_VALUE,
	PILL_ACT,
	type PickerFit,
	picker,
} from "@fcalell/ui-core/variants";
import { type ReactNode, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { Icon } from "../icon";
import { Status } from "../status";
import { groupsOf, PickSheet } from "./sheet";

// A field-fit trigger is the field box at the bar fit.
const FIELD_TRIGGER = "flex-row shrink-0 items-center";
const FIELD_VALUE = "min-w-0 grow shrink";
const FIELD_STATUS = "min-w-0 grow shrink flex-row";
// A row-fit trigger centres in its row and pulls back by its own padding at
// the row's end; it stands over a row's hit. Open, it holds the press wash
// and the value takes the body ink.
const ROW_TRIGGER =
	"flex-row shrink-0 self-center items-center -me-inside active:bg-wash-press";
const ROW_OPEN = "bg-wash-press";
const ROW_VALUE = "shrink";
const OPEN_VALUE = "text-ink-body";

// `V` is read off the options alone, so an enum's options pick that enum and
// a value outside them is a type error. An option whose value is `null` is
// the empty choice: it makes the pick nullable, `onChange` hears `null` for
// it, and it reads as a placeholder, in `ink-meta`.
export interface PickerProps<V extends string | null = string> extends Closed {
	// What is picked: the trigger's name, and the sheet's title.
	label: string;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	value?: NoInfer<V>;
	onChange: (value: NoInfer<V>) => void;
	// Where it stands: a field box (the default), or a row's trailing value in
	// a pill.
	fit?: PickerFit;
	// The act that makes a new option, ending the list under a hairline.
	act?: IconAct;
}

// A pick that applies at once, outside a form: the field box showing the
// chosen label (the empty choice in the placeholder's ink), or a row's value
// and a chevron in a pill; with no value either shows `label` in the
// placeholder's ink, and an option carrying a state shows as its status. A
// tap opens the sheet of options titled `label`, `act` under a hairline after
// them.
export function Picker<V extends string | null = string>({
	label,
	options,
	value,
	onChange,
	fit = "field",
	act,
}: PickerProps<V>) {
	const [open, setOpen] = useState(false);
	const current = groupsOf(options)
		.flatMap((group) => group.items)
		.find((option) => option.value === value);
	const status = current?.status ? (
		<Status state={current.status} label={current.label} />
	) : null;
	const row = fit === "row";
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
				accessibilityLabel={label}
				accessibilityValue={{ text: current?.label }}
				accessibilityState={{ expanded: open }}
				onPress={() => setOpen(true)}
				className={
					row
						? cn(PILL_ACT, picker({ fit }), ROW_TRIGGER, open && ROW_OPEN)
						: cn(field({ fit: "bar" }), picker({ fit }), FIELD_TRIGGER)
				}
			>
				{shown}
				<Ink.Provider value={row && open ? "ink-body" : "ink-meta"}>
					<Icon name="ChevronDown" fit={row ? "meta" : "control"} />
				</Ink.Provider>
			</Pressable>
			<PickSheet
				title={label}
				options={options}
				value={value}
				onChange={onChange}
				open={open}
				onClose={() => setOpen(false)}
				act={act}
			/>
		</>
	);
}
