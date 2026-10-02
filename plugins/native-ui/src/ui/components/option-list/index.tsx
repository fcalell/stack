import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import {
	lineBox,
	OPTION_CHILDREN,
	OPTION_GROUP_LABEL,
	OPTION_INDENT,
	OPTION_LINE,
	OPTION_LIST,
	ROW_META_LINE,
	row,
	SELECT_GROUP,
	skeleton,
	skeletonLane,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Fragment, type ReactNode, useContext } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { GroupName, LabelTarget } from "../../lib/field";
import { useWords } from "../../lib/words";
import { Checkbox } from "../checkbox";
import { Chip } from "../chip";

// The row is the target of its box: a press anywhere toggles it.
const OPTION = "flex-row items-center active:bg-wash-press";
const LINE = "flex-1 min-w-0 flex-row items-start";
// The box stands on its label's first line, beside a zero-width line of the
// body role.
const BOX_LINE = "flex-row shrink-0 items-center";
const LABEL = "flex-1 min-w-0";
const TEXT = "flex-1 min-w-0";
const DESCRIPTION_LINE = "flex-row flex-wrap items-center min-w-0";
const CHILDREN = "flex-row";
const INDENT = "shrink-0";
const CHILDREN_BODY = "flex-1 min-w-0";
// Loading, each row keeps its height: a box-sized skeleton and a bar at a
// label's length in a short label's lane.
const LABEL_WAIT = "flex-row items-center";
const BAR_ROOM = "flex-row grow min-w-0";
const BOX_WAIT = "shrink-0";
const ROW_WAIT = "flex-row items-center";
const LABEL_BAR = "w-1/3";
const ROW_BARS = ["w-1/3", "w-2/3", "w-2/3", "w-1/2"] as const;
const STRUT = "​";

export interface OptionListProps<V extends string = string> extends Closed {
	// The choices, flat or under group labels.
	options: readonly Option<V>[] | readonly OptionGroup<V>[];
	// The chosen options' values.
	value: readonly V[];
	// Hears the whole chosen set after a toggle.
	onChange: (value: V[]) => void;
	// The options wait: skeleton rows stand in for them.
	loading?: boolean;
	// What a chosen option opens, under the first one chosen at its label's
	// start.
	children?: ReactNode;
}

function groupsOf<V extends string>(
	options: OptionListProps<V>["options"],
): readonly { label?: string; options: readonly Option<V>[] }[] {
	const first = options[0];
	if (first === undefined || !("options" in first))
		return [{ options: options as readonly Option<V>[] }];
	return options as readonly OptionGroup<V>[];
}

function GroupLabel({ children }: { children: string }) {
	return (
		<RNText
			accessibilityRole="header"
			className={cn(
				OPTION_GROUP_LABEL,
				text({ role: "meta" }),
				textStrong({ role: "meta" }),
			)}
		>
			{children}
		</RNText>
	);
}

function Loading() {
	const words = useWords();
	return (
		<View
			accessibilityLabel={words.loading}
			accessibilityState={{ busy: true }}
			className={OPTION_LIST}
		>
			<View className={SELECT_GROUP}>
				<View className={cn(OPTION_GROUP_LABEL, LABEL_WAIT)}>
					<RNText className={lineBox({ role: "meta" })}>{STRUT}</RNText>
					<View className={cn(skeletonLane({ role: "meta" }), BAR_ROOM)}>
						<View className={cn(skeleton({ kind: "line" }), LABEL_BAR)} />
					</View>
				</View>
				{ROW_BARS.map((bar, at) => (
					<View
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed stand-ins
						key={at}
						className={cn(row({ lines: "one" }), ROW_WAIT)}
					>
						<View className={cn(skeleton({ kind: "check" }), BOX_WAIT)} />
						<View className={cn(skeletonLane({ role: "body" }), BAR_ROOM)}>
							<View className={cn(skeleton({ kind: "line" }), bar)} />
						</View>
					</View>
				))}
			</View>
		</View>
	);
}

// Option rows on a hairline card, each the Checkbox on its label's first
// line, a description and the recommended mark on the line under it; the
// pressed row washes, the checked box is the choice. The children stand
// under the first chosen option.
export function OptionList<V extends string = string>({
	options,
	value,
	onChange,
	loading,
	children,
}: OptionListProps<V>) {
	const words = useWords();
	const named = useContext(GroupName);
	if (loading) return <Loading />;
	const first = value[0];
	const toggle = (option: V) =>
		onChange(
			value.includes(option)
				? value.filter((each) => each !== option)
				: [...value, option],
		);
	return (
		<View
			accessibilityLabel={named?.label}
			accessibilityHint={named?.said}
			className={OPTION_LIST}
		>
			{groupsOf(options).map((group, at) => (
				<View key={group.label ?? at} className={SELECT_GROUP}>
					{group.label ? <GroupLabel>{group.label}</GroupLabel> : null}
					{group.options.map((option) => {
						const chosen = value.includes(option.value);
						const marked = option.description || option.recommended;
						return (
							<Fragment key={option.value}>
								<Pressable
									accessibilityRole="checkbox"
									accessibilityLabel={option.label}
									accessibilityHint={option.description}
									accessibilityState={{ checked: chosen }}
									onPress={() => toggle(option.value)}
									className={cn(row({ lines: marked ? "two" : "one" }), OPTION)}
								>
									<View className={cn(OPTION_LINE, LINE)}>
										<View className={BOX_LINE}>
											<RNText className={lineBox({ role: "body" })}>
												{STRUT}
											</RNText>
											<LabelTarget.Provider value>
												<Checkbox
													checked={chosen}
													onChange={() => toggle(option.value)}
													label={option.label}
												/>
											</LabelTarget.Provider>
										</View>
										{marked ? (
											<View className={TEXT}>
												<RNText
													numberOfLines={1}
													className={text({ role: "body" })}
												>
													{option.label}
												</RNText>
												<View className={cn(ROW_META_LINE, DESCRIPTION_LINE)}>
													{option.description ? (
														<RNText className={text({ role: "meta" })}>
															{option.description}
														</RNText>
													) : null}
													{option.recommended ? (
														<Chip family="neutral" label={words.recommended} />
													) : null}
												</View>
											</View>
										) : (
											<RNText
												numberOfLines={1}
												className={cn(text({ role: "body" }), LABEL)}
											>
												{option.label}
											</RNText>
										)}
									</View>
								</Pressable>
								{option.value === first && chosen && children ? (
									<View className={cn(OPTION_CHILDREN, CHILDREN)}>
										<View className={cn(OPTION_INDENT, INDENT)} />
										<View className={CHILDREN_BODY}>{children}</View>
									</View>
								) : null}
							</Fragment>
						);
					})}
				</View>
			))}
		</View>
	);
}
