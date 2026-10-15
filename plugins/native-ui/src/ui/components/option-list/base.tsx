import { type Draft, useSelections } from "@fcalell/plugin-api/tanstack-query";
import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import {
	choose,
	chosenOf,
	type OptionChoice,
	optionBlocked,
	optionsOf,
} from "@fcalell/ui-core/list-state";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import {
	OPTION_CHILDREN,
	OPTION_GROUP_LABEL,
	OPTION_INDENT,
	OPTION_LINE,
	OPTION_LIST,
	OPTION_RADIO_DOT,
	OPTION_ROW,
	optionRadio,
	ROW_META_LINE,
	row,
	SELECT_GROUP,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Fragment, type ReactNode, useContext } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { FieldDisabled, GroupName } from "../../lib/field";
import { inertProps, Painted, paintControl, useShown } from "../../lib/paint";
import { Strut } from "../../lib/strut";
import { useWords } from "../../lib/words";
import { HeldCheckbox } from "../checkbox/base";
import { Chip } from "../chip";
import type { OptionListShape } from "./index";

// The row is the target of its box or radio: a press anywhere toggles or
// chooses it.
const OPTION = "flex-row items-center";
const PRESS = "active:bg-wash-press";
// A blocked option's label and reason, and its radio's disabled ring.
const BLOCKED_INK = "text-ink-disabled";
const RADIO_BLOCKED = "border-edge bg-fill-disabled";
// A label is the whole text of a choice: it wraps, and an unmarked row keeps
// the one-line row's height as its floor.
const OPTION_WHOLE = "min-h-row";
const LINE = "flex-1 min-w-0 flex-row items-start";
// The box stands on its label's first line, beside a zero-width line of the
// body role.
const BOX_LINE = "flex-row shrink-0 items-center";
const LABEL = "flex-1 min-w-0";
const TEXT = "flex-1 min-w-0";
const DESCRIPTION_LINE = "flex-row flex-wrap items-center min-w-0";
// The radio's dot centred in its ring.
const RADIO = "shrink-0 items-center justify-center";
const CHILDREN = "flex-row";
const INDENT = "shrink-0";
const CHILDREN_BODY = "flex-1 min-w-0";

function groupsOf<V extends string>(
	options: readonly Option<V>[] | readonly OptionGroup<V>[],
): readonly { label?: string; options: readonly Option<V>[] }[] {
	const first = options[0];
	if (first === undefined || !("options" in first))
		return [{ options: options as readonly Option<V>[] }];
	return options as readonly OptionGroup<V>[];
}

// The rows a waiting `items` paints: `PAINT_ROWS` options, in one group when
// the map declares `group`. Which slots it declares is read by key, none run:
// the filler decides nothing but the shape, a label over the group and a
// description under each label.
function paintedGroups<V extends string>(
	slots: { description?: unknown; group?: unknown } = {},
): readonly Option<V>[] | readonly OptionGroup<V>[] {
	const options = Array.from({ length: PAINT_ROWS }, (_, at) => ({
		value: `painted-${at}` as V,
		label: "",
		description: slots.description === undefined ? undefined : "",
	}));
	return slots.group === undefined ? options : [{ label: "", options }];
}

function GroupLabel({ children }: { children: ReactNode }) {
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

// The option rows every OptionList renders, on the `draft` its host holds: a
// field hosts the draft of its options and draws a rejection in its own line.
// Static `options` never paint; `items` paint `PAINT_ROWS` rows in the slots
// `option` declares while their read waits, and the draft paints the marks,
// inert. The frame that holds the read draws its failed, missing and empty
// forms. Outside the package's exports.
export function OptionListBase<V extends string = string, T = unknown>(
	props: OptionListShape<V, T> & {
		draft: Draft<V | null | readonly V[]>;
		onChange: (next: V | V[]) => unknown;
	},
) {
	const { children, draft } = props;
	const words = useWords();
	const named = useContext(GroupName);
	const [given] = useSelections([props.items] as const);
	// The rows paint while their items wait; the marks paint too while the
	// value does, the labels then standing.
	const rowsPaint = given.painted;
	const painted = rowsPaint || draft.painted;
	const shown = useShown(painted);
	// The placeholder is no array, so a painted value is one choice.
	const one = !Array.isArray(draft.value);
	const choice = {
		value: draft.painted ? (one ? null : []) : draft.value,
		onChange: (next: V | V[]) => {
			draft.change(next, () => props.onChange(next));
		},
	} as OptionChoice<V>;
	const options = rowsPaint
		? paintedGroups<V>(props.option)
		: (props.options ?? optionsOf(given.value as readonly T[], props.option));
	const chosenValues = painted ? [] : chosenOf(choice);
	const first = chosenValues[0];
	return (
		<View
			accessibilityRole={one ? "radiogroup" : undefined}
			accessibilityLabel={named?.label}
			className={OPTION_LIST}
		>
			{groupsOf(options).map((group, at) => (
				<View key={group.label ?? at} className={SELECT_GROUP}>
					{group.label === undefined ? null : (
						<GroupLabel>
							{rowsPaint ? <Painted role="word" /> : group.label}
						</GroupLabel>
					)}
					{group.options.map((option, place) => {
						const chosen = chosenValues.includes(option.value);
						const blocked = optionBlocked(option, chosen);
						const meta = blocked ?? option.description;
						// A painted row is marked when the map declares a description.
						const marked = rowsPaint
							? option.description !== undefined
							: meta || option.recommended;
						return (
							<Fragment key={option.value}>
								<Pressable
									{...inertProps(painted)}
									accessibilityRole={one ? "radio" : "checkbox"}
									accessibilityLabel={option.label}
									accessibilityState={{
										checked: chosen,
										disabled: blocked !== undefined,
									}}
									disabled={blocked !== undefined || painted}
									onPress={() => choose(choice, option.value)}
									className={cn(
										row({ lines: marked ? "two" : "whole" }),
										OPTION_ROW,
										OPTION,
										blocked === undefined && !painted && PRESS,
										!marked && OPTION_WHOLE,
									)}
								>
									<View className={cn(OPTION_LINE, LINE)}>
										<View className={BOX_LINE}>
											<Strut role="body" />
											{one ? (
												<View
													className={cn(
														optionRadio({
															state: chosen ? "checked" : "unchecked",
														}),
														RADIO,
														blocked !== undefined && RADIO_BLOCKED,
														painted && paintControl(shown),
													)}
												>
													{chosen ? (
														<View className={OPTION_RADIO_DOT} />
													) : null}
												</View>
											) : (
												<FieldDisabled.Provider value={blocked !== undefined}>
													<HeldCheckbox
														target
														checked={chosen}
														onChange={() => choose(choice, option.value)}
														label={option.label}
														painted={painted}
													/>
												</FieldDisabled.Provider>
											)}
										</View>
										{marked ? (
											<View className={TEXT}>
												<RNText
													className={cn(
														text({ role: "body" }),
														blocked !== undefined && BLOCKED_INK,
													)}
												>
													{rowsPaint ? (
														<Painted role="phrase" at={place} />
													) : (
														option.label
													)}
												</RNText>
												<View className={cn(ROW_META_LINE, DESCRIPTION_LINE)}>
													{rowsPaint ? (
														<RNText
															className={cn(text({ role: "meta" }), "shrink")}
														>
															<Painted role="phrase" at={place + 1} />
														</RNText>
													) : meta ? (
														<RNText
															className={cn(
																text({ role: "meta" }),
																"shrink",
																blocked !== undefined && BLOCKED_INK,
															)}
														>
															{meta}
														</RNText>
													) : null}
													{option.recommended ? (
														<Chip family="neutral" label={words.recommended} />
													) : null}
												</View>
											</View>
										) : (
											<RNText className={cn(text({ role: "body" }), LABEL)}>
												{rowsPaint ? (
													<Painted role="phrase" at={place} />
												) : (
													option.label
												)}
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
