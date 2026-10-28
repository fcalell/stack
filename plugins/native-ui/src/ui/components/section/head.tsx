import {
	type Datum,
	paints,
	useDrawsFailure,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { IconLinkAct, Run } from "@fcalell/ui-core/descriptors";
import { endedReason } from "@fcalell/ui-core/read";
import {
	PAGE_TITLE_FLOOR,
	SECTION_ACTS,
	SECTION_BODY,
	SECTION_HEAD,
	SECTION_HEAD_ROW,
	SECTION_TITLE,
	SECTION_TOGGLE,
	text,
} from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { asIconAct, type IconAct, type MenuEntry } from "../../lib/act";
import { cn } from "../../lib/cn";
import { RunText } from "../../lib/code";
import { tokenPx } from "../../lib/frame";
import { Ink } from "../../lib/ink";
import { clipWhen, inertProps, Painted, PaintText } from "../../lib/paint";
import { partRuns, partText } from "../../lib/parts";
import { BusyMark, type Frame, FrameLine, moreMenu } from "../../lib/read";
import { useCSSVariable } from "../../lib/theme";
import { Turn } from "../../lib/turn";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { IconButtonBase } from "../button/glyph";
import { Count } from "../count";
import { MenuBase } from "../menu/base";
import { Text } from "../text";

// An ended act's press: it is blocked, so its reason stands instead.
const NOOP = () => {};

const HEAD_ROW = "flex-row items-center";
// The title keeps its floor (`PAGE_TITLE_FLOOR`) and wraps whole, and the act
// stands at its icon beside the more act.
const TITLE_BLOCK = "grow min-w-0";
const TITLE_LINE = "flex-row items-center min-w-0";
// The heading and its count stand on one baseline, the sizes differing; the
// busy mark and the chevron beside them stay centred on the line.
// The heading gives way to its count and the line before it clips.
const TITLE_WORD = "min-w-0 shrink";
const NAME = "flex-row items-baseline min-w-0 shrink";
// The toggle is a target tall, its label centred, and overhangs the label's
// line above and below by what the target has over it (`overhang`), so the
// head takes the line alone and a folding heading stands where a plain one
// does after the same gap.
const TOGGLE =
	"flex-row items-center grow min-w-0 -ms-gap active:bg-wash-press";
// The act and the more stand a row's act gap apart (`SECTION_ACTS`, as a list row's).
const ACTS = "flex-row items-center shrink-0";

// A Section's head: the heading with its count, its description, its act and
// more, and the line of its read's state. It subscribes to the description,
// the act and the more itself, so one of those reads landing renders the head
// and nothing under the Section's body. Outside the package's exports.
export function SectionHead(props: {
	title: Datum<Run>;
	// The body is a list (`items` that are not facts alone): only a list's head
	// counts, so a head over parts, or over a sheet whose every row has a label
	// (a definition list), draws none whatever its frame's read holds.
	list: boolean;
	// The body's total, when the frame gives none.
	count?: number;
	description?: Datum<string>;
	act?: Datum<IconAct | IconLinkAct>;
	more?: Datum<readonly MenuEntry[]>;
	// The Section folds: the title is the toggle, and `fold` turns it over.
	foldable: boolean;
	open: boolean;
	fold: () => void;
	// The Section's frame, whose count, busy mark and state line the head draws.
	frame: Frame;
}) {
	const {
		title,
		list,
		count,
		description,
		act,
		more,
		foldable,
		open,
		fold,
		frame,
	} = props;
	const words = useWords();
	useDrawsFailure([act, more]);
	const [named, said, shownAct, shownMore] = useSelections([
		title,
		description,
		act,
		more,
	]);
	// A title Datum is a selection of the read the Section holds, never a second
	// read; one whose read ended draws no text, and the frame says why.
	const heading = named.painted ? undefined : (named.value as Run);
	const label = heading === undefined ? "" : partText(heading);
	const waiting = inertProps(paints(named));
	let sentence: ReactNode = null;
	if (paints(said))
		sentence = (
			<PaintText
				fills="phrase"
				painted
				numberOfLines={1}
				{...clipWhen(true)}
				className={text({ role: "meta" })}
			>
				<Painted role="phrase" />
			</PaintText>
		);
	else if (!said.painted && said.value)
		sentence = <Text role="meta">{said.value}</Text>;
	// A count is not drawn until its body has answered: a painted chip would
	// carry an unseen "0" for a number nobody knows yet, and the count arrives at
	// the title's end, where it moves nothing. A read of an array gives its length.
	// A count is a list's: over parts (cards, controls) or facts the head draws none.
	const answered = list && (frame.form === "ready" || frame.form === "empty");
	const total = answered ? (frame.count ?? count) : undefined;
	const tally =
		total !== undefined && total !== 0 ? <Count value={total} /> : null;
	// An act paints, inert, while its own datum waits; the frame's read is not
	// its concern. One whose own read ended stands blocked with its sentence,
	// never a false yes. An act beside a heading is an icon act: its words are
	// its accessible name, never drawn beside the title.
	// Its glyph and name went with the read, so it is the alert glyph named by
	// the sentence, blocked: a press says why.
	const ended = shownAct.painted
		? endedReason(words, shownAct.phase)
		: undefined;
	const given: IconAct | IconLinkAct | undefined =
		ended !== undefined
			? { label: ended, icon: "CircleAlert", blocked: ended, onAct: NOOP }
			: shownAct.painted
				? undefined
				: shownAct.value;
	let actNode: ReactNode = null;
	if (shownAct.painted && ended === undefined)
		actNode = <IconButtonBase icon="Plus" label="" painted />;
	else if (given !== undefined)
		actNode = <Button glyph {...asIconAct(given)} />;
	const menu = moreMenu(words, shownMore);
	const overhang = Math.max(
		0,
		(tokenPx(useCSSVariable("--spacing-target")) -
			tokenPx(useCSSVariable("--leading-heading"))) /
			2,
	);
	const shown = (
		<>
			<View className={cn(SECTION_TITLE, NAME)}>
				<PaintText
					painted={paints(named)}
					fills="title"
					// A loaded title wraps whole, so a short name beside the acts is
					// never cut to its first letters; a painted one is one line.
					numberOfLines={paints(named) ? 1 : undefined}
					{...clipWhen(paints(named))}
					className={cn(text({ role: "heading" }), TITLE_WORD)}
				>
					{heading !== undefined ? (
						<RunText runs={partRuns(heading)} fit="name" />
					) : paints(named) ? (
						<Painted role="title" />
					) : null}
				</PaintText>
				{tally}
			</View>
			<BusyMark frame={frame} />
		</>
	);
	// A title whose read ended (failed or missing) draws no head: the Section's
	// failed or missing form stands alone in its place.
	if (named.painted && !paints(named)) return null;
	return (
		<View className={SECTION_HEAD}>
			<View className={cn(SECTION_BODY, SECTION_HEAD_ROW, HEAD_ROW)}>
				<View className={cn(TITLE_BLOCK, PAGE_TITLE_FLOOR)}>
					{foldable ? (
						<Pressable
							accessibilityRole="button"
							accessibilityState={{ expanded: open }}
							onPress={fold}
							className={cn(SECTION_TOGGLE, TOGGLE)}
							style={{ marginVertical: -overhang }}
							{...waiting}
						>
							{({ pressed }) => (
								<>
									<Ink.Provider value={pressed ? "ink-body" : "ink-meta"}>
										<Turn name="ChevronDown" turned={!open} by="quarter" />
									</Ink.Provider>
									{shown}
								</>
							)}
						</Pressable>
					) : (
						<View
							accessibilityRole="header"
							className={cn(SECTION_TITLE, TITLE_LINE)}
							{...waiting}
						>
							{shown}
						</View>
					)}
					{sentence}
				</View>
				{actNode || menu.painted || menu.items.length ? (
					<View className={cn(SECTION_ACTS, ACTS)}>
						{actNode}
						{menu.painted || menu.items.length ? (
							<MenuBase
								label={`${words.more} ${label}`}
								title={label}
								items={menu.items}
								painted={menu.painted}
							/>
						) : null}
					</View>
				) : null}
			</View>
			<FrameLine frame={frame} />
		</View>
	);
}
