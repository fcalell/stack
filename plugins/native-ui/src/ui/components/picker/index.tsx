import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import { GROUP_GROUND, PICKER_EMPTY, text } from "@fcalell/ui-core/variants";
import { ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text as RNText } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Glyph } from "../../lib/glyph";
import { flatOptions, PickSheet } from "../../lib/pick-sheet";
import { useRowClaim } from "../../lib/row";

// `V` is read off the options alone, so an enum's options pick that enum and
// a value outside them is a type error. An option whose value is `null` is
// the empty choice: it makes the pick nullable, `onChange` hears `null` for
// it, and it reads as a placeholder, in `ink-meta`, in the sheet and on the
// control, as the control does with no value at all.
export interface PickerProps<V extends string | null = string> extends Closed {
	label: string;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	value?: NoInfer<V>;
	onChange: (value: NoInfer<V>) => void;
}

// A control showing its value; a tap opens the option sheet. The value of a
// `DefinitionRow` when the pick applies at once; the control of a
// `FormField` when it is part of what a form submits.
export function Picker<V extends string | null = string>({
	label,
	options,
	value,
	onChange,
}: PickerProps<V>) {
	useRowClaim();
	const [open, setOpen] = useState(false);
	const current = flatOptions(options).find((option) => option.value === value);
	return (
		<>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityValue={{ text: current?.label }}
				onPress={() => setOpen(true)}
				className={cn(
					GROUP_GROUND,
					"min-h-11 flex-row items-center gap-inside px-4 active:bg-wash-press",
				)}
			>
				<RNText
					className={cn(
						text({ role: "body" }),
						(current?.value ?? null) === null && PICKER_EMPTY,
						"flex-1",
					)}
				>
					{current?.label ?? label}
				</RNText>
				<Glyph icon={ChevronDown} tone="ink-meta" size={16} />
			</Pressable>
			<PickSheet
				title={label}
				options={options}
				value={value}
				onChange={onChange}
				open={open}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
