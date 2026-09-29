import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import {
	GROUP,
	PICKER_EMPTY,
	row,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Check, ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Glyph } from "../../lib/glyph";
import { useRowClaim } from "../../lib/row";
import { Input } from "../input";
import { List } from "../list";
import { Sheet } from "../sheet";

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

// Up to this many options the sheet is a plain list; above it, a search field
// sits on top.
const SEARCHABLE_ABOVE = 6;

// The options as groups: a flat list is one group with no label.
type Grouped<V extends string | null> = {
	label?: string;
	options: readonly Option<V>[];
};

function grouped<V extends string | null>(
	options: PickerProps<V>["options"],
): readonly Grouped<V>[] {
	const first = options[0];
	if (first === undefined || !("options" in first)) {
		return [{ options: options as readonly Option<V>[] }];
	}
	return options as readonly OptionGroup<V>[];
}

// A control showing its value; a tap opens one-line rows with a tick, under
// their group's label when the options come in groups. The value of a
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
	const [query, setQuery] = useState("");
	const groups = grouped(options);
	const all = groups.flatMap((group) => [...group.options]);
	const current = all.find((option) => option.value === value);
	const searchable = all.length > SEARCHABLE_ABOVE;
	const needle = query.trim().toLowerCase();
	const shown = searchable
		? groups.map((group) => ({
				label: group.label,
				options: group.options.filter((option) =>
					option.label.toLowerCase().includes(needle),
				),
			}))
		: groups;
	return (
		<>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={label}
				accessibilityValue={{ text: current?.label }}
				onPress={() => setOpen(true)}
				className={cn(
					GROUP,
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
			<Sheet open={open} onClose={() => setOpen(false)} title={label}>
				{searchable ? (
					<Input kind="search" value={query} onChange={setQuery} />
				) : null}
				{shown.map((group, at) =>
					group.options.length === 0 ? null : (
						<View key={group.label ?? at} className="gap-pair">
							{group.label ? (
								<RNText
									accessibilityRole="header"
									className={cn(
										text({ role: "meta" }),
										textStrong({ role: "meta" }),
										"px-card",
									)}
								>
									{group.label}
								</RNText>
							) : null}
							<List>
								{group.options.map((option) => {
									const selected = option.value === value;
									return (
										<Pressable
											key={String(option.value)}
											accessibilityRole="radio"
											accessibilityState={{ selected }}
											onPress={() => {
												onChange(option.value);
												setOpen(false);
											}}
											className={cn(
												row({ state: "rest" }),
												"flex-row items-center active:bg-wash-press",
											)}
										>
											<View className="min-w-0 flex-1 gap-pair">
												<RNText
													numberOfLines={1}
													className={cn(
														text({ role: "body" }),
														option.value === null && PICKER_EMPTY,
													)}
												>
													{option.label}
												</RNText>
												{option.description ? (
													<RNText
														numberOfLines={1}
														className={text({ role: "meta" })}
													>
														{option.description}
													</RNText>
												) : null}
											</View>
											{selected ? (
												<Glyph icon={Check} tone="accent-ink" />
											) : null}
										</Pressable>
									);
								})}
							</List>
						</View>
					),
				)}
			</Sheet>
		</>
	);
}
