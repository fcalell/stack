import type {
	IconAct,
	Option,
	OptionGroup,
} from "@fcalell/ui-core/descriptors";
import type { ChipFamily } from "@fcalell/ui-core/tokens";
import {
	HAIRLINE,
	OPTION_GROUP_LABEL,
	PICKER_EMPTY,
	ROW_LEADING,
	row,
	SELECT_GROUP,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { Avatar } from "../avatar";
import { Chip } from "../chip";
import { Icon } from "../icon";
import { Input } from "../input";
import { SheetBase } from "../sheet/base";
import { StatusDot } from "../status/dot";

export type PickOptions<V extends string | null> =
	| readonly Option<V>[]
	| readonly OptionGroup<V>[];

// The rows stand a pair under the head, and under the search fixed above
// them, which stands a pair under the head.
const ROWS = "pt-pair pb-card";
const SEARCH_SLOT = "px-card pt-pair";
const OPTION = "flex-row items-center active:bg-wash-press";
const OPTION_TEXT = "flex-1 min-w-0";
const TICK = "shrink-0";
// A glyph leads an option in the row's leading slot.
const LEADING = "shrink-0 items-center justify-center";
// A chip column's options are its chips.
const CHIP_SLOT = "flex-row grow min-w-0";
// The act that ends the list stands under a hairline across it, a float
// inset below the line.
const ACT_SLOT = "border-t pt-float";
const ACT_GLYPH = "shrink-0";

// Past six options a search leads the list.
const SEARCH_PAST = 6;

interface Grouped<V extends string | null> {
	label?: string;
	items: readonly Option<V>[];
}

export function groupsOf<V extends string | null>(
	options: PickOptions<V>,
): Grouped<V>[] {
	const first = options[0];
	if (first === undefined || !("options" in first))
		return [{ items: options as readonly Option<V>[] }];
	return (options as readonly OptionGroup<V>[]).map((group) => ({
		label: group.label,
		items: group.options,
	}));
}

// A chip column's option draws as its chip alone, its description unsaid.
const asChip = (
	option: Option<string | null>,
	chip?: ChipFamily,
): chip is ChipFamily => chip !== undefined && option.value !== null;

// An option's label (the empty choice in the placeholder's ink) over its
// description; an option carrying a glyph leads with it, one carrying a state
// with its status's dot, one carrying an avatar with its avatar; a chip
// column's option is its chip.
function OptionText({
	option,
	chip,
}: {
	option: Option<string | null>;
	chip?: ChipFamily;
}) {
	if (asChip(option, chip))
		return (
			<View className={CHIP_SLOT}>
				<Chip family={chip} label={option.label} />
			</View>
		);
	return (
		<>
			{option.icon ? (
				<View className={cn(ROW_LEADING, LEADING)}>
					<Ink.Provider value="ink-meta">
						<Icon name={option.icon} />
					</Ink.Provider>
				</View>
			) : null}
			{option.status ? <StatusDot state={option.status} /> : null}
			{option.avatar ? (
				<Avatar name={option.label} src={option.avatar.src} />
			) : null}
			<View className={OPTION_TEXT}>
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
					<RNText numberOfLines={1} className={text({ role: "meta" })}>
						{option.description}
					</RNText>
				) : null}
			</View>
		</>
	);
}

// The sheet a `Picker` and a `Select` open: a menu sheet titled `title`, its
// rows edge to edge at the card's inset under their group labels, the chosen
// one ticked, a search leading them past six options and an act (the act that
// makes a new option) under a hairline after them; a pick or the act closes it.
// Outside the package's exports.
export function PickSheet<V extends string | null>({
	title,
	options,
	value,
	onChange,
	open,
	onClose,
	onGone,
	act,
	chip,
}: {
	title: string;
	options: PickOptions<V>;
	value: V | undefined;
	onChange: (value: V) => void;
	open: boolean;
	onClose: () => void;
	// Hears the sheet gone, its leave played.
	onGone?: () => void;
	act?: IconAct;
	chip?: ChipFamily;
}) {
	const [search, setSearch] = useState("");
	// The search clears as the sheet opens, during render, so the rows keep
	// their filter while the sheet leaves.
	const [wasOpen, setWasOpen] = useState(open);
	if (wasOpen !== open) {
		setWasOpen(open);
		if (open) setSearch("");
	}
	const groups = groupsOf(options);
	const searching = groups.flatMap((g) => g.items).length > SEARCH_PAST;
	const typed = search.trim().toLowerCase();
	const shown = groups
		.map((group) => ({
			...group,
			items: group.items.filter((option) =>
				option.label.toLowerCase().includes(typed),
			),
		}))
		.filter((group) => group.items.length > 0);
	return (
		<SheetBase
			form="menu"
			open={open}
			onClose={onClose}
			onGone={onGone}
			title={title}
			above={
				searching ? (
					<View className={SEARCH_SLOT}>
						<Input kind="search" value={search} onChange={setSearch} />
					</View>
				) : undefined
			}
		>
			<View accessibilityLabel={title} className={ROWS}>
				{shown.map((group, at) => (
					<View key={group.label ?? at} className={SELECT_GROUP}>
						{group.label ? (
							<RNText
								accessibilityRole="header"
								className={cn(
									OPTION_GROUP_LABEL,
									text({ role: "meta" }),
									textStrong({ role: "meta" }),
								)}
							>
								{group.label}
							</RNText>
						) : null}
						{group.items.map((option) => {
							const chosen = option.value === value;
							return (
								<Pressable
									key={String(option.value)}
									accessibilityRole="radio"
									accessibilityLabel={option.label}
									accessibilityState={{ checked: chosen }}
									onPress={() => {
										onClose();
										onChange(option.value);
									}}
									className={cn(
										row({
											lines:
												option.description && !asChip(option, chip)
													? "two"
													: "one",
											ground: "group",
										}),
										OPTION,
									)}
								>
									<OptionText option={option} chip={chip} />
									{chosen ? (
										<View className={TICK}>
											<Ink.Provider value="ink-body">
												<Icon name="Check" fit="body" />
											</Ink.Provider>
										</View>
									) : null}
								</Pressable>
							);
						})}
					</View>
				))}
				{act ? (
					<View className={cn(HAIRLINE, ACT_SLOT)}>
						<Pressable
							accessibilityRole="button"
							onPress={() => {
								onClose();
								act.onAct();
							}}
							className={cn(row({ ground: "group" }), OPTION)}
						>
							<View className={ACT_GLYPH}>
								<Ink.Provider value="ink-meta">
									<Icon name={act.icon} />
								</Ink.Provider>
							</View>
							<RNText
								numberOfLines={1}
								className={cn(text({ role: "body" }), OPTION_TEXT)}
							>
								{act.label}
							</RNText>
						</Pressable>
					</View>
				) : null}
			</View>
		</SheetBase>
	);
}
