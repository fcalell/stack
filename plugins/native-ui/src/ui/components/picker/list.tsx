import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import {
	choose,
	chosenOf,
	type OptionChoice,
	optionBlocked,
	optionsOf,
} from "@fcalell/ui-core/list-state";
import { groupsOf, paintedGroups } from "@fcalell/ui-core/pick";
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
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Fragment, type ReactNode, useContext } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { withUniwind } from "uniwind";
import { useHeldDraft } from "../../lib/act";
import { useDrawn } from "../../lib/arrive";
import { cn } from "../../lib/cn";
import { FieldDisabled, GroupName } from "../../lib/field";
import {
	blockIn,
	dotIn,
	dotOut,
	FadingText,
	FadingView,
	lineIn,
} from "../../lib/motion";
import {
	inertProps,
	PAINT_CONTROL,
	Painted,
	PaintText,
	PaintView,
} from "../../lib/paint";
import { PARTS_LINE, PartItem, usePartsGap } from "../../lib/parts";
import { Press } from "../../lib/press";
import { OptionsLine, useOptions } from "../../lib/read";
import { Strut } from "../../lib/strut";
import { useWords } from "../../lib/words";
import { BooleanMark } from "../row/marks";
import { HeldCheckbox } from "../switch/checkbox";
import type { PickerListBody, PickerListProps } from "./index";

// The row is the target of its box or radio: a press anywhere toggles or
// chooses it.
const OPTION = "flex-row items-center";
const WASH = "rounded-row bg-wash-press";
// The chosen radio's dot grows from nothing and shrinks away.
const Dot = withUniwind(Animated.View);
// A blocked option's label and reason, and its radio's disabled ring.
const BLOCKED_INK = "text-ink-disabled";
const RADIO_BLOCKED = "border-edge bg-fill-disabled";
// A label is the whole text of a choice: it wraps, and an unmarked row keeps
// the one-line row's height as its floor.
const OPTION_WHOLE = "py-gap";
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
const CHILDREN_BODY = "flex-1 min-w-0";

function GroupLabel({
	children,
	painted,
}: {
	children: ReactNode;
	painted: boolean;
}) {
	return (
		<PaintText
			painted={painted}
			accessibilityRole="header"
			className={cn(
				OPTION_GROUP_LABEL,
				text({ role: "meta" }),
				textStrong({ role: "meta" }),
			)}
		>
			{children}
		</PaintText>
	);
}

// The option rows every Picker in `fit: list` renders, on the `draft` its host holds: a
// field hosts the draft of its options and draws a rejection in its own line.
// Static `options` never paint; `items` paint `PAINT_ROWS` rows in the slots
// `option` declares while their read waits, and the draft paints the marks,
// inert. The list says its options' failed and missing state itself
// (`useOptions`). Outside the package's exports.
export function PickerListBase<V extends string = string, T = unknown>(
	props: PickerListBody<V, T> & {
		// Names the group where no `FormField` does.
		label?: string;
		draft: Draft<V | null | readonly V[]>;
		onChange: (next: V | V[]) => unknown;
	},
) {
	const { children, draft } = props;
	const words = useWords();
	const named = useContext(GroupName);
	const drawn = useDrawn();
	// Waiting items paint the rows; ended ones say so in a line under them.
	const { drawn: given, retry } = useOptions(props.items);
	// The rows paint while their items wait; the marks paint too while the
	// value does, the labels then standing. A value whose read ended leaves the
	// marks empty and blocked: a press says why and chooses nothing.
	const rowsPaint = given.painted;
	const partsGap = usePartsGap();
	const painted = rowsPaint || (draft.painted && draft.ended === undefined);
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
	const list = (
		<View
			accessibilityRole={one ? "radiogroup" : undefined}
			accessibilityLabel={named?.label ?? props.label}
			className={OPTION_LIST}
		>
			{groupsOf(options).map((group, at) => (
				<View key={group.label ?? at}>
					{group.label === undefined ? null : (
						<GroupLabel painted={rowsPaint}>
							{rowsPaint ? <Painted role="word" /> : group.label}
						</GroupLabel>
					)}
					{group.options.map((option, place) => {
						const chosen = chosenValues.includes(option.value);
						const blocked = optionBlocked(option, chosen);
						const meta = blocked ?? option.description;
						// The recommended mark leads the meta line (voice 9), so a
						// recommended option is two lines, its label keeping the
						// row's width at every size.
						const recommended = !rowsPaint && option.recommended === true;
						// A painted row is marked when the map declares a description.
						const marked = rowsPaint
							? option.description !== undefined
							: Boolean(meta) || recommended;
						// Beside the recommended mark the description is a part of the
						// mark's line, led by its middle dot, as a row's meta parts follow its
						// marks.
						const said = rowsPaint ? (
							<PaintText
								fills="phrase"
								painted
								className={cn(text({ role: "meta" }), "shrink")}
							>
								<Painted role="phrase" at={place + 1} />
							</PaintText>
						) : meta ? (
							<FadingText
								key={blocked}
								entering={blocked === undefined ? undefined : lineIn()}
								className={cn(
									text({ role: "meta" }),
									"shrink",
									blocked !== undefined && BLOCKED_INK,
								)}
							>
								{meta}
							</FadingText>
						) : null;
						const parted = recommended && said !== null;
						return (
							<Fragment key={option.value}>
								<Press
									{...inertProps(painted)}
									accessibilityRole={one ? "radio" : "checkbox"}
									accessibilityLabel={option.label}
									accessibilityState={{
										checked: chosen,
										disabled: blocked !== undefined,
									}}
									disabled={blocked !== undefined || painted}
									onPress={() => choose(choice, option.value)}
									wash={blocked === undefined && !painted ? WASH : undefined}
									className={cn(
										row(),
										OPTION_ROW,
										OPTION,
										!marked && OPTION_WHOLE,
									)}
								>
									<View className={cn(OPTION_LINE, LINE)}>
										<View className={BOX_LINE}>
											<Strut role="body" />
											{one ? (
												<PaintView
													painted={painted}
													className={cn(
														optionRadio({
															state: chosen ? "checked" : "unchecked",
														}),
														RADIO,
														blocked !== undefined && RADIO_BLOCKED,
														painted && PAINT_CONTROL,
													)}
												>
													{chosen ? (
														<Dot
															entering={dotIn()}
															exiting={dotOut()}
															className={OPTION_RADIO_DOT}
														/>
													) : null}
												</PaintView>
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
												<PaintText
													fills="phrase"
													painted={rowsPaint}
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
												</PaintText>
												<View
													style={parted ? { columnGap: partsGap } : undefined}
													className={
														parted
															? cn(PARTS_LINE, DESCRIPTION_LINE)
															: cn(ROW_META_LINE, DESCRIPTION_LINE)
													}
												>
													{recommended ? (
														<BooleanMark
															mark={{
																flag: "ThumbsUp",
																label: words.recommended,
															}}
														/>
													) : null}
													{said === null ? null : parted ? (
														<PartItem
															gap={partsGap}
															led
															className={text({ role: "meta" })}
														>
															{said}
														</PartItem>
													) : (
														said
													)}
												</View>
											</View>
										) : (
											<PaintText
												fills="phrase"
												painted={rowsPaint}
												className={cn(text({ role: "body" }), LABEL)}
											>
												{rowsPaint ? (
													<Painted role="phrase" at={place} />
												) : (
													option.label
												)}
											</PaintText>
										)}
									</View>
								</Press>
								{option.value === first && chosen && children ? (
									<FadingView
										entering={drawn ? blockIn() : undefined}
										className={cn(OPTION_CHILDREN, CHILDREN)}
									>
										<View className={cn(OPTION_INDENT, CHILDREN_BODY)}>
											{children}
										</View>
									</FadingView>
								) : null}
							</Fragment>
						);
					})}
				</View>
			))}
		</View>
	);
	return (
		<>
			{list}
			<OptionsLine drawn={given} retry={retry} />
		</>
	);
}

// A list that holds its own draft, as a bare one does; a rejection toasts.
// Outside the package's exports.
export function HeldList<V extends string = string, T = unknown>(
	props: PickerListProps<V, T>,
) {
	const { value, onChange, label, children, ...source } = props;
	return (
		<PickerListBase<V, T>
			{...(source as PickerListBody<V, T>)}
			label={label}
			draft={useHeldDraft<V | null | readonly V[]>(value)}
			onChange={onChange as (next: V | V[]) => unknown}
		>
			{children}
		</PickerListBase>
	);
}
