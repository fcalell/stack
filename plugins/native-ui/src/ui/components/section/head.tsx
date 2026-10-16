import {
	type Datum,
	paints,
	useDrawsFailure,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type {
	Act,
	IconAct,
	MenuItem,
	Part,
} from "@fcalell/ui-core/descriptors";
import { paintText } from "@fcalell/ui-core/paint";
import {
	SECTION_ACTS,
	SECTION_BODY,
	SECTION_HEAD,
	SECTION_HEAD_ROW,
	SECTION_TITLE,
	SECTION_TOGGLE,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { clipWhen, Painted } from "../../lib/paint";
import { partText } from "../../lib/parts";
import {
	BusyMark,
	endedItems,
	endedReason,
	type Frame,
	FrameLine,
} from "../../lib/read";
import { useWords } from "../../lib/words";
import { ButtonBase } from "../button/base";
import { Count } from "../count";
import { Icon } from "../icon";
import { IconButton } from "../icon-button";
import { MenuBase } from "../menu/base";
import { Text } from "../text";

const HEAD_ROW = "flex-row items-center";
// A labelled act that would squeeze the title column wraps under the title:
// the column's basis is its own width, so the row breaks once the title, its
// count and its description cannot stand beside the act.
const WRAP = "flex-wrap";
const TITLE_BLOCK = "grow min-w-0";
const TITLE_LINE = "flex-row items-center min-w-0";
const TOGGLE =
	"flex-row items-center grow min-w-0 -ms-inside active:bg-wash-press";
// The act and the more stand a row's act gap apart (`SECTION_ACTS`, as ListRow's).
const ACT_SLOT = "flex-row items-center shrink-0";

// A Section's head: the heading with its count, its description, its act and
// more, and the line of its read's state. It subscribes to the description,
// the act and the more itself, so one of those reads landing renders the head
// and nothing under the Section's body. Outside the package's exports.
export function SectionHead(props: {
	title: Part;
	// The body's total, when the frame gives none.
	count?: number;
	description?: Datum<string>;
	act?: Datum<Act | IconAct>;
	more?: Datum<readonly MenuItem[]>;
	// The Section folds: the title is the toggle, and `fold` turns it over.
	foldable: boolean;
	open: boolean;
	fold: () => void;
	// The Section's frame, whose count, busy mark and state line the head draws.
	frame: Frame;
}) {
	const { title, count, description, act, more, foldable, open, fold, frame } =
		props;
	const words = useWords();
	useDrawsFailure([act, more]);
	const [said, shownAct, shownMore] = useSelections([description, act, more]);
	let sentence: ReactNode = null;
	if (paints(said))
		sentence = (
			<RNText
				numberOfLines={1}
				{...clipWhen(true)}
				className={text({ role: "meta" })}
			>
				<Painted role="phrase" />
			</RNText>
		);
	else if (!said.painted && said.value)
		sentence = <Text role="meta">{said.value}</Text>;
	// A count is not drawn until its body has answered: a painted chip would
	// carry an unseen "0" for a number nobody knows yet, and the count arrives at
	// the title's end, where it moves nothing. A read of an array gives its length.
	const answered = frame.form === "ready" || frame.form === "empty";
	const total = answered ? (frame.count ?? count) : undefined;
	const tally =
		total !== undefined && total !== 0 ? <Count value={total} /> : null;
	// An act paints, inert, while its own datum waits; the frame's read is not
	// its concern. One whose own read ended stands blocked with its sentence,
	// never a false yes. A selection's shape is unknown until it lands, so its
	// paint is a labelled act.
	const given = shownAct.painted ? undefined : shownAct.value;
	const ended = shownAct.painted
		? endedReason(words, shownAct.phase)
		: undefined;
	const labelled =
		shownAct.painted || (given !== undefined && !("icon" in given));
	let actNode: ReactNode = null;
	if (shownAct.painted)
		actNode = (
			<ButtonBase
				act="secondary"
				fit="bar"
				label={ended ?? paintText("word")}
				blocked={ended}
				painted={ended === undefined}
			/>
		);
	else if (given !== undefined && "icon" in given)
		actNode = (
			<IconButton
				icon={given.icon}
				fit="bar"
				label={given.label}
				onAct={given.onAct}
				failed={given.failed}
			/>
		);
	else if (given !== undefined)
		actNode = (
			<ButtonBase
				act={given.destructive ? "destructive" : "secondary"}
				fit="bar"
				label={given.label}
				onAct={given.onAct}
				failed={given.failed}
				blocked={given.blocked}
			/>
		);
	const moreEnded = shownMore.painted
		? endedReason(words, shownMore.phase)
		: undefined;
	const items = moreEnded
		? endedItems(words, moreEnded)
		: shownMore.painted
			? []
			: (shownMore.value ?? []);
	const name = (
		<>
			<RNText numberOfLines={1} className={text({ role: "heading" })}>
				{partText(title)}
			</RNText>
			{tally}
			<BusyMark frame={frame} />
		</>
	);
	return (
		<View className={SECTION_HEAD}>
			<View
				className={cn(
					SECTION_BODY,
					SECTION_HEAD_ROW,
					HEAD_ROW,
					labelled && WRAP,
				)}
			>
				<View className={TITLE_BLOCK}>
					{foldable ? (
						<Pressable
							accessibilityRole="button"
							accessibilityState={{ expanded: open }}
							onPress={fold}
							className={cn(SECTION_TOGGLE, TOGGLE)}
						>
							{({ pressed }) => (
								<>
									<Ink.Provider value={pressed ? "ink-body" : "ink-meta"}>
										<Icon name={open ? "ChevronDown" : "ChevronRight"} />
									</Ink.Provider>
									{name}
								</>
							)}
						</Pressable>
					) : (
						<View
							accessibilityRole="header"
							className={cn(SECTION_TITLE, TITLE_LINE)}
						>
							{name}
						</View>
					)}
					{sentence}
				</View>
				{actNode || shownMore.painted || items.length ? (
					<View className={cn(SECTION_ACTS, ACT_SLOT)}>
						{actNode}
						{shownMore.painted || items.length ? (
							<MenuBase
								label={`${words.more} ${partText(title)}`}
								title={partText(title)}
								items={items}
								painted={shownMore.painted && moreEnded === undefined}
							/>
						) : null}
					</View>
				) : null}
			</View>
			<FrameLine frame={frame} />
		</View>
	);
}
