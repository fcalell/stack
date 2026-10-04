import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import {
	FIELD_PLACEHOLDER,
	field,
	fieldValue,
} from "@fcalell/ui-core/variants";
import { useContext, useState } from "react";
import { Pressable, Text as RNText } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldDisabled, FieldError, useFieldName } from "../../lib/field";
import { Ink } from "../../lib/ink";
import { useTouched } from "../../lib/touched";
import { Icon } from "../icon";
import { PickSheet, useOptionGroups } from "../picker/sheet";

// `V` is read off the options alone, so an enum's options pick that enum and
// a value outside them is a type error. An option whose value is `null` is
// the empty choice; it and no value at all draw the placeholder.
export interface SelectProps<V extends string | null = string> extends Closed {
	value?: NoInfer<V>;
	onChange: (value: NoInfer<V>) => void;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	placeholder?: string;
}

// One choice among options, the control a `FormField` labels: the field box
// showing the chosen label and a chevron, `edge-error` when its `FormField`
// is in error, the disabled fill when its field is disabled; a tap opens the
// option sheet.
export function Select<V extends string | null = string>({
	value,
	onChange,
	options,
	placeholder,
}: SelectProps<V>) {
	const [open, setOpen] = useState(false);
	const { touch } = useTouched();
	const name = useFieldName();
	const error = useContext(FieldError);
	const disabled = useContext(FieldDisabled);
	const groups = useOptionGroups(options);
	const current = groups.flat.find(
		(option) => option.value !== null && option.value === value,
	);
	return (
		<>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={name}
				accessibilityValue={{ text: current?.label }}
				accessibilityState={{ disabled }}
				disabled={disabled}
				onPress={() => setOpen(true)}
				className={cn(
					field({ state: error ? "error" : "rest" }),
					"flex-row items-center",
					disabled && "bg-fill-disabled",
				)}
			>
				<RNText
					numberOfLines={1}
					className={cn(
						fieldValue({ kind: "text" }),
						!current && FIELD_PLACEHOLDER,
						"flex-1",
						disabled && "text-ink-disabled",
					)}
				>
					{current?.label ?? placeholder}
				</RNText>
				<Ink.Provider value={disabled ? "ink-disabled" : "ink-meta"}>
					<Icon name="ChevronDown" fit="control" />
				</Ink.Provider>
			</Pressable>
			<PickSheet
				title={name ?? placeholder ?? ""}
				groups={groups}
				value={value}
				onChange={(next) => {
					touch();
					onChange(next);
				}}
				open={open}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
