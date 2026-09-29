import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import { GROUP, row, text } from "@fcalell/ui-core/variants";
import { Check, ChevronDown } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Glyph } from "../../lib/glyph";
import { Input } from "../input";
import { List } from "../list";
import { Sheet } from "../sheet";

export interface PickerProps extends Closed {
	label: string;
	options: readonly Option[] | readonly OptionGroup[];
	value?: string;
	onChange: (value: string) => void;
}

// Up to this many options the sheet is a plain list; above it, a search field
// sits on top.
const SEARCHABLE_ABOVE = 6;

// The options as groups: a flat list is one group with no label.
type Grouped = { label?: string; options: readonly Option[] };

function grouped(options: PickerProps["options"]): readonly Grouped[] {
	const first = options[0];
	if (first === undefined || !("options" in first)) {
		return [{ options: options as readonly Option[] }];
	}
	return options as readonly OptionGroup[];
}

// A control showing its value; a tap opens one-line rows with a tick, under
// their group's label when the options come in groups. The value of a
// `DefinitionRow` when the pick applies at once; the control of a
// `FormField` when it is part of what a form submits.
export function Picker({ label, options, value, onChange }: PickerProps) {
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
					"min-h-11 flex-row items-center gap-row px-4 active:bg-edge",
				)}
			>
				<RNText className={cn(text({ role: "body" }), "flex-1")}>
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
									className={cn(text({ role: "label" }), "px-inset")}
								>
									{group.label}
								</RNText>
							) : null}
							<List>
								{group.options.map((option) => {
									const selected = option.value === value;
									return (
										<Pressable
											key={option.value}
											accessibilityRole="radio"
											accessibilityState={{ selected }}
											onPress={() => {
												onChange(option.value);
												setOpen(false);
											}}
											className={cn(
												row({ state: "rest" }),
												"flex-row items-center active:bg-edge",
											)}
										>
											<View className="min-w-0 flex-1 gap-pair">
												<RNText
													numberOfLines={1}
													className={text({ role: "body" })}
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
											{selected ? <Glyph icon={Check} tone="tint" /> : null}
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
