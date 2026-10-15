import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import {
	FIELD_PLACEHOLDER,
	field,
	fieldValue,
} from "@fcalell/ui-core/variants";
import { useContext, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { FieldDisabled, FieldError, useFieldName } from "../../lib/field";
import { Ink } from "../../lib/ink";
import { inertProps, paintControl, useShown } from "../../lib/paint";
import { OptionsLine, useOptions } from "../../lib/read";
import { useTouched } from "../../lib/touched";
import { Icon } from "../icon";
import { NO_OPTIONS, PickSheet, useOptionGroups } from "../picker/sheet";
import type { SelectProps } from "./index";

// The field box every Select renders, on the `draft` its host holds: a field
// hosts the draft of its select and draws a rejection in its own line. It
// shows the chosen label and a chevron, `edge-error` when its `FormField` is
// in error, the disabled fill when its field is disabled; a tap opens the
// option sheet. Outside the package's exports.
export function SelectBase<V extends string | null = string>({
	draft,
	onChange,
	options,
	placeholder,
}: Omit<SelectProps<V>, "value"> & { draft: Draft<V | undefined> }) {
	// Waiting options paint the trigger as a waiting value does; ended ones
	// say so in a line under it.
	const { drawn: waiting, retry } = useOptions(options);
	const painted = draft.painted || waiting.painted;
	const chosen = painted ? undefined : draft.value;
	const shown = useShown(painted);
	const [open, setOpen] = useState(false);
	const { touch } = useTouched();
	const name = useFieldName();
	const error = useContext(FieldError);
	const disabled = useContext(FieldDisabled);
	const groups = useOptionGroups(waiting.painted ? NO_OPTIONS : waiting.value);
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
			<OptionsLine drawn={waiting} retry={retry} />
		</>
	);
}
