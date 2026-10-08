import type { Option, OptionGroup } from "@fcalell/ui-core/descriptors";
import {
	choose,
	chosenOf,
	isOneChoice,
	listState,
	type OneChoice,
	type OptionChoice,
	type OptionShape,
	type OptionSlots,
	optionBlocked,
	optionShape,
	optionsOf,
	optionsShape,
	retryOf,
	type SetChoice,
} from "@fcalell/ui-core/list-state";
import {
	OPTION_CHILDREN,
	OPTION_GROUP_LABEL,
	OPTION_INDENT,
	OPTION_LINE,
	OPTION_LIST,
	OPTION_RADIO_DOT,
	optionRadio,
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
import { FieldDisabled, GroupName, LabelTarget } from "../../lib/field";
import { navigate } from "../../lib/navigate";
import { Strut } from "../../lib/strut";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { Chip } from "../chip";
import { useBackAct } from "../missing/base";
import type { QueryLike } from "../query-boundary";

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
// Loading, each row keeps its height: a box-sized skeleton on the label's
// line, and a bar at a label's length in a short label's lane on each line
// the row draws, a strut setting each line's height.
const LABEL_WAIT = "flex-row items-center";
const STRUT_BAR = "flex-row items-center grow min-w-0";
const BAR_ROOM = "flex-row grow min-w-0";
const ROW_WAIT = "flex-row items-center";
const LABEL_BAR = "w-1/3";
const ROW_BARS = [
	["w-1/3", "w-1/2"],
	["w-2/3", "w-1/3"],
	["w-2/3", "w-1/2"],
	["w-1/2", "w-1/4"],
] as const;
// The failed, missing and empty lines: the sentence, and Retry or Back at its
// end.
const NOTE = "flex-row items-center";
const SENTENCE = "flex-1 min-w-0";

// Where an OptionList's options come from.
type OptionSource<T, V extends string> =
	| {
			// The choices, flat or under group labels.
			options: readonly Option<V>[] | readonly OptionGroup<V>[];
			// The options wait: skeleton rows stand in for them.
			loading?: boolean;
			/** The card's line with no option; without it an empty set draws an empty card (a sentence; wraps). */
			empty?: string;
			query?: never;
			option?: never;
			sentence?: never;
	  }
	| {
			// The query whose items the check rows draw.
			query: QueryLike<readonly T[]>;
			// One function per check row slot, each called with a loaded item;
			// the slots given are the shape the waiting rows draw.
			option: OptionSlots<T, V>;
			/** What failed to load, beside the retry act (a sentence; wraps). */
			sentence: string;
			/** The card's line when the query answers with no item (a sentence; wraps). */
			empty: string;
			options?: never;
			loading?: never;
	  };

type OptionListBase<V extends string, T> = OptionSource<T, V> & {
	// What a chosen option opens, under the first one chosen at its label's
	// start.
	children?: ReactNode;
};

// One choice or several from one list, static or from a query: `value` one
// value or null draws radio rows, a set check rows. `V` is read off the
// options or the `option` map's `value`.
export type OptionListProps<V extends string = string, T = unknown> = Closed &
	OptionListBase<V, T> &
	OptionChoice<V>;

function groupsOf<V extends string>(
	options: readonly Option<V>[] | readonly OptionGroup<V>[],
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

// The waiting rows in the slots the options declare, each led by the mark
// its form draws (a box, or a radio's ring): a group label's bar over them
// when they stand under labels, a description bar under each label when they
// are described.
function Wait({
	shape,
	mark,
}: {
	shape: OptionShape;
	mark: "check" | "radio";
}) {
	return (
		<View className={SELECT_GROUP}>
			{shape.group ? (
				<View className={cn(OPTION_GROUP_LABEL, LABEL_WAIT)}>
					<Strut role="meta" />
					<View className={cn(skeletonLane({ role: "meta" }), BAR_ROOM)}>
						<View className={cn(skeleton({ kind: "line" }), LABEL_BAR)} />
					</View>
				</View>
			) : null}
			{ROW_BARS.map(([label, description], at) => (
				<View
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed stand-ins
					key={at}
					className={cn(
						row({ lines: shape.description ? "two" : "one" }),
						ROW_WAIT,
					)}
				>
					<View className={cn(OPTION_LINE, LINE)}>
						<View className={BOX_LINE}>
							<Strut role="body" />
							<View className={skeleton({ kind: mark })} />
						</View>
						<View className={TEXT}>
							<View className={STRUT_BAR}>
								<Strut role="body" />
								<View className={cn(skeletonLane({ role: "body" }), BAR_ROOM)}>
									<View className={cn(skeleton({ kind: "line" }), label)} />
								</View>
							</View>
							{shape.description ? (
								<View className={cn(ROW_META_LINE, STRUT_BAR)}>
									<Strut role="meta" />
									<View
										className={cn(skeletonLane({ role: "meta" }), BAR_ROOM)}
									>
										<View
											className={cn(skeleton({ kind: "line" }), description)}
										/>
									</View>
								</View>
							) : null}
						</View>
					</View>
				</View>
			))}
		</View>
	);
}

// Option rows on a hairline card, each the Checkbox (several choices) or the
// radio (one choice, a radiogroup) on its label's
// first line, a description and the recommended mark on the line under it;
// the pressed row washes, the checked box or the ringed dot is the choice.
// The children stand under the first chosen option. From a query it draws its
// states in the card: waiting rows in the slots `option` declares, a failed
// line with `sentence` and Retry, a line saying it no longer exists with Back
// (never Retry) when the query answers not found, the `empty` sentence, then
// the rows.
export function OptionList<V extends string = string, T = unknown>(
	props: Closed & OptionListBase<V, T> & OneChoice<V>,
): ReactNode;
export function OptionList<V extends string = string, T = unknown>(
	props: Closed & OptionListBase<V, T> & SetChoice<V>,
): ReactNode;
export function OptionList<V extends string = string, T = unknown>(
	props: OptionListProps<V, T>,
) {
	const { children } = props;
	const words = useWords();
	const back = useBackAct();
	const named = useContext(GroupName);
	const input = {
		query: props.query,
		items: props.options,
		loading: props.loading,
		sectionLoading: false,
		inSection: false,
		hasEmpty: props.empty !== undefined,
	};
	const state = listState(input);
	const one = isOneChoice(props);
	const frame = (body: ReactNode, radios = false) => (
		<View
			accessibilityRole={radios ? "radiogroup" : undefined}
			accessibilityLabel={named?.label}
			className={OPTION_LIST}
		>
			{body}
		</View>
	);
	if (state === "pending")
		return frame(
			<Wait
				shape={
					props.option ? optionShape(props.option) : optionsShape(props.options)
				}
				mark={one ? "radio" : "check"}
			/>,
		);
	if (state === "missing")
		return frame(
			<View className={cn(row({ lines: "one" }), NOTE)}>
				<RNText className={cn(text({ role: "meta" }), SENTENCE)}>
					{words.missing}
				</RNText>
				{back ? (
					<Button
						act="secondary"
						fit="bar"
						label={back.label}
						onAct={() => navigate(back.href)}
					/>
				) : null}
			</View>,
		);
	if (state === "failed" && props.query !== undefined)
		return frame(
			<View className={cn(row({ lines: "one" }), NOTE)}>
				<RNText className={cn(text({ role: "meta" }), SENTENCE)}>
					{props.sentence}
				</RNText>
				<Button
					act="secondary"
					fit="bar"
					label={words.retry}
					onAct={retryOf(props.query)}
				/>
			</View>,
		);
	if (state === "empty")
		return frame(
			<View className={cn(row({ lines: "one" }), NOTE)}>
				<RNText className={cn(text({ role: "meta" }), SENTENCE)}>
					{props.empty}
				</RNText>
			</View>,
		);
	const options = props.query
		? optionsOf(props.query.data ?? [], props.option)
		: props.options;
	const chosenValues = chosenOf(props);
	const first = chosenValues[0];
	return frame(
		groupsOf(options).map((group, at) => (
			<View key={group.label ?? at} className={SELECT_GROUP}>
				{group.label ? <GroupLabel>{group.label}</GroupLabel> : null}
				{group.options.map((option) => {
					const chosen = chosenValues.includes(option.value);
					const blocked = optionBlocked(option, chosen);
					const meta = blocked ?? option.description;
					const marked = meta || option.recommended;
					return (
						<Fragment key={option.value}>
							<Pressable
								accessibilityRole={one ? "radio" : "checkbox"}
								accessibilityLabel={option.label}
								accessibilityState={{
									checked: chosen,
									disabled: blocked !== undefined,
								}}
								disabled={blocked !== undefined}
								onPress={() => choose<V>(props, option.value)}
								className={cn(
									row({ lines: marked ? "two" : "whole" }),
									OPTION,
									blocked === undefined && PRESS,
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
												)}
											>
												{chosen ? <View className={OPTION_RADIO_DOT} /> : null}
											</View>
										) : (
											<LabelTarget.Provider value>
												<FieldDisabled.Provider value={blocked !== undefined}>
													<Checkbox
														checked={chosen}
														onChange={() => choose<V>(props, option.value)}
														label={option.label}
													/>
												</FieldDisabled.Provider>
											</LabelTarget.Provider>
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
												{option.label}
											</RNText>
											<View className={cn(ROW_META_LINE, DESCRIPTION_LINE)}>
												{meta ? (
													<RNText
														className={cn(
															text({ role: "meta" }),
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
		)),
		one,
	);
}
