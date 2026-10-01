import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import { PICKER_EMPTY, row, text, textStrong } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { Icon } from "../components/icon";
import { Input } from "../components/input";
import { List } from "../components/list";
import { Sheet } from "../components/sheet";
import { cn } from "./cn";
import { Ink } from "./ink";

export type PickOptions<V extends string | null> =
	| readonly Option<V>[]
	| readonly OptionGroup<V>[];

// Up to this many options the sheet is a plain list; above it, a search field
// sits on top.
const SEARCHABLE_ABOVE = 6;

// The options as groups: a flat list is one group with no label.
type Grouped<V extends string | null> = {
	label?: string;
	options: readonly Option<V>[];
};

function grouped<V extends string | null>(
	options: PickOptions<V>,
): readonly Grouped<V>[] {
	const first = options[0];
	if (first === undefined || !("options" in first)) {
		return [{ options: options as readonly Option<V>[] }];
	}
	return options as readonly OptionGroup<V>[];
}

// Every option, groups flattened, in order.
export function flatOptions<V extends string | null>(
	options: PickOptions<V>,
): readonly Option<V>[] {
	return grouped(options).flatMap((group) => [...group.options]);
}

// How a `Picker` and a `Select` offer their options: a sheet of one-line rows
// with a tick on the current one, under their group's label when the options
// come in groups, and a search field on top of a long list. A pick closes it.
export function PickSheet<V extends string | null>({
	title,
	options,
	value,
	onChange,
	open,
	onClose,
}: {
	title: string;
	options: PickOptions<V>;
	value: V | undefined;
	onChange: (value: V) => void;
	open: boolean;
	onClose: () => void;
}) {
	const [query, setQuery] = useState("");
	const groups = grouped(options);
	const searchable = flatOptions(options).length > SEARCHABLE_ABOVE;
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
		<Sheet open={open} onClose={onClose} title={title}>
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
											onClose();
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
											<Ink.Provider value="accent-ink">
												<Icon name="Check" />
											</Ink.Provider>
										) : null}
									</Pressable>
								);
							})}
						</List>
					</View>
				),
			)}
		</Sheet>
	);
}
