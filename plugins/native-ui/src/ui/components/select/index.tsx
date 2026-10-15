import type { Datum } from "@fcalell/plugin-api/tanstack-query";
import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import {
	FIELD_PLACEHOLDER,
	field,
	fieldValue,
} from "@fcalell/ui-core/variants";
import { useContext, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { useHeldDraft } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldDisabled, FieldError, useFieldName } from "../../lib/field";
import { Ink } from "../../lib/ink";
import { inertProps, paintControl, useShown } from "../../lib/paint";
import { useTouched } from "../../lib/touched";
import { Icon } from "../icon";
import { PickSheet, useOptionGroups } from "../picker/sheet";

// `V` is read off the options alone, so an enum's options pick that enum and
// a value outside them is a type error. An option whose value is `null` is
// the empty choice; it and no value at all draw the placeholder.
export interface SelectProps<V extends string | null = string> extends Closed {
	// A selection paints the trigger, inert, until its read lands and follows it
	// until the viewer picks.
	value?: Datum<NoInfer<V>>;
	// A promise it returns holds the viewer's value while it pends; a refusal
	// puts it back, with its reason.
	onChange: (value: NoInfer<V>) => unknown;
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	/** The hint drawn while nothing is chosen; never the field's name (a short phrase; truncates). */
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
	const draft = useHeldDraft<V | undefined>(value);
	const painted = draft.painted;
	const chosen = painted ? undefined : draft.value;
	const shown = useShown(painted);
	const [open, setOpen] = useState(false);
	const { touch } = useTouched();
	const name = useFieldName();
	const error = useContext(FieldError);
	const disabled = useContext(FieldDisabled);
	const groups = useOptionGroups(options);
	const current = groups.flat.find(
		(option) => option.value !== null && option.value === chosen,
	);
	return (
		<>
			<Pressable
				{...inertProps(painted)}
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
					painted && paintControl(shown),
				)}
			>
				<RNText
					numberOfLines={1}
					className={cn(
						fieldValue({ kind: "text" }),
						!current && FIELD_PLACEHOLDER,
						"flex-1",
						disabled && "text-ink-disabled",
						painted && "opacity-0",
					)}
				>
					{current?.label ?? placeholder}
				</RNText>
				<View className={painted ? "opacity-0" : undefined}>
					<Ink.Provider value={disabled ? "ink-disabled" : "ink-meta"}>
						<Icon name="ChevronDown" fit="control" />
					</Ink.Provider>
				</View>
			</Pressable>
			<PickSheet
				title={name ?? placeholder ?? ""}
				groups={groups}
				value={chosen}
				onChange={(next) => {
					touch();
					draft.change(next, () => onChange(next));
				}}
				open={open}
				onClose={() => setOpen(false)}
			/>
		</>
	);
}
