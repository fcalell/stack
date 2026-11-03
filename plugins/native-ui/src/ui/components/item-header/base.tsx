import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { factReach } from "@fcalell/ui-core/chart";
import type {
	OptionPick,
	RecordFact,
	RowMark,
	Run,
} from "@fcalell/ui-core/descriptors";
import {
	isChipFact,
	isMarkFact,
	isStatusFact,
	isWarningFact,
} from "@fcalell/ui-core/list-state";
import {
	BADGE_LINE,
	ITEM_FACT,
	ITEM_HEADER,
	ITEM_HEADER_PICTURE,
	text,
	WORD_ACT,
} from "@fcalell/ui-core/variants";
import { Fragment } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { useArrivals } from "../../lib/arrive";
import { cn } from "../../lib/cn";
import { RunText } from "../../lib/code";
import {
	badgesOf,
	filled,
	META_CUT,
	META_TAIL,
	partRuns,
	partText,
	says,
	wordless,
} from "../../lib/facts";
import { useTokenPx } from "../../lib/frame";
import { Ink } from "../../lib/ink";
import { blockIn, FadingView } from "../../lib/motion";
import { navigate, useWarm } from "../../lib/navigate";
import { clipWhen, inertProps, Painted, PaintText } from "../../lib/paint";
import { Strut } from "../../lib/strut";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";
import { PictureTile } from "../image/base";
import { HeldPicker } from "../picker/base";
import { Badge, BadgeWords, FactBadge } from "../row/badges";
import { EndMark } from "../row/marks";

// A quiet fact (a mark with no words) stands at the end of the name's first
// line, as a row's stands in its end group: the name's row is the name and the
// glyphs, each glyph beside a strut of the name's line height so it stays on the
// first line of a wrapped name, and it takes no line of the facts, whatever the
// facts hold.
const NAME_ROW = "flex-row items-start gap-gap";
const ASIDE = "flex-row items-center shrink-0";
// The facts line: badges (`BADGE_LINE`) and a pick, whole, wrapping to the next
// line a badge's gap apart. A pick, which acts, keeps its target-height hit box
// and reaches past the line's text line above and below it (`factReach`, in px:
// the phone has no `lh` unit), so the line holds the meta line's height whichever
// kinds of fact it carries; a fact that opens a sheet is a control of the same
// kind, and a linked badge takes the same reach as a hit slop (`Badge`).
const FACTS = "flex-row items-center";
function useReach() {
	return {
		marginVertical: -factReach(
			useTokenPx("--spacing-target"),
			useTokenPx("--leading-meta"),
		),
	};
}
// A pick in the facts line pulls back at its start as well as its end, so its
// dot and word sit where a plain fact's would.
const PICK = "flex-row -ms-gap";
// A fact that opens a sheet acts: it washes at the press and pulls back at its
// start as a pick does.
const OPEN = "flex-row items-center active:bg-wash-press -ms-gap";
// A head with a picture is a row of the tile and the text column, which takes the rest.
const PICTURED = "flex-row items-start";
const COLUMN = "min-w-0 shrink grow";
/** What a record's head holds besides its name: the parts that place the record and its facts. */
export interface ItemHeaderParts {
	/** The parts that place the record: one line of text, a middle dot between the parts, cut with an ellipsis at its end (each a short phrase). A part that is a selection paints, and the head takes no touch, until its read lands. */
	overline?: readonly Datum<Run>[];
	/** The facts in a wrapping line under the overline, each one fact a badge (`RecordFact`: words, a status, a chip, what is wrong as `{ warning }`, a boolean mark, words that go to a route as a linked badge (underlined, no chevron), a count beside its word; words that open a sheet are a control of their own with a chevron, and a status that moves is a pick whose options carry states, a control too, not a badge; a boolean mark with `words: false` is its glyph alone, named by its label, standing at the end of the name's first line) (each string a short phrase: the line wraps between badges, never inside one, a badge wider than the line is cut inside itself, a `{ quoted }` part is cut at 40 characters). A fact that is a selection paints in its place (a status or a pick keeps its form, any other is a word), and the head takes no touch, until its read lands. */
	facts?: readonly Datum<RecordFact>[];
	// A picture of the record (a person's photo, a product shot), a square tile
	// beside the head's text, at its top: painted while its `src` is a selection
	// still to land, a skeleton while the bytes come, an `ImageOff` glyph in the
	// meta ink where it failed or the address is empty. `alt` says what it shows.
	image?: { src: Datum<string>; alt: string };
}

// A mark that does not hold (a ring that is false) says no fact.
const isMark = isMarkFact;

function factKey(fact: RecordFact): string {
	if (typeof fact === "object" && "pick" in fact) return fact.pick.label;
	if (typeof fact === "object" && ("onOpen" in fact || "href" in fact))
		return partText(fact.label);
	if (isStatusFact(fact)) return `${fact.tone} ${fact.label ?? ""}`;
	if (isWarningFact(fact)) return `warning ${fact.warning}`;
	if (isChipFact(fact)) return `${fact.family} ${fact.label}`;
	if (isMarkFact(fact)) return `mark ${fact.label}`;
	if (typeof fact === "object" && "count" in fact)
		return `${fact.count} ${fact.label}`;
	return partText(fact);
}

function FactPart({
	fact,
	entering,
}: {
	fact: RecordFact;
	entering?: ReturnType<typeof blockIn>;
}) {
	const warm = useWarm();
	const words = useWords();
	const REACH = useReach();
	// Words that go to a route: a linked badge, its words underlined and no
	// chevron, its hit reaching the touch target.
	if (typeof fact === "object" && "href" in fact && "label" in fact) {
		const { label, href } = fact;
		return (
			<Badge
				name={partText(label)}
				entering={entering}
				press={{
					role: "link",
					onPressIn: () => warm(href),
					onPress: () => navigate(href),
				}}
			>
				<BadgeWords underline>
					<RunText runs={partRuns(label, META_CUT)} fit="name" />
				</BadgeWords>
			</Badge>
		);
	}
	// Words that open a sheet act, as a pick does: their own control pill with
	// a chevron, not a badge.
	if (typeof fact === "object" && "onOpen" in fact && "label" in fact)
		return (
			<FadingView entering={entering}>
				<Pressable
					accessibilityRole="button"
					onPress={fact.onOpen}
					style={REACH}
					className={cn(WORD_ACT, ITEM_FACT, OPEN)}
				>
					<RNText className={cn(text({ role: "meta" }), "shrink")}>
						<RunText runs={partRuns(fact.label, META_CUT)} fit="name" />
					</RNText>
					<Ink.Provider value="ink-meta">
						<Icon name="ChevronRight" fit="meta" />
					</Ink.Provider>
				</Pressable>
			</FadingView>
		);
	// A status that moves: a control of its own, not a badge.
	if (typeof fact === "object" && "pick" in fact)
		return (
			<FadingView entering={entering}>
				<View style={REACH} className={PICK}>
					<HeldPicker {...fact.pick} fit="row" />
				</View>
			</FadingView>
		);
	// A count beside its word: one badge, read as both.
	if (typeof fact === "object" && "count" in fact)
		return (
			<Badge name={`${fact.label} ${fact.count}`} entering={entering}>
				<BadgeWords>{`${fact.label} ${fact.count}`}</BadgeWords>
			</Badge>
		);
	// A mark with no words, in a head with no name to stand beside.
	if (isMarkFact(fact) && wordless(fact))
		return (
			<FadingView entering={entering}>
				<EndMark mark={fact} />
			</FadingView>
		);
	// Every other fact is a badge of the row's own reading.
	const [spec] = badgesOf({
		facts: [fact],
		word: (tone) => words[tone],
	}).badges;
	return spec ? <FactBadge spec={spec} entering={entering} /> : null;
}

// A fact that is not here, in the form its selection's shape says: the
// placeholder is no object, so a selection that gives the fact whole paints as
// a word. A status keeps its form, its box and a word's filler, and a pick its
// control.
function PaintedFact({ fact, at }: { fact: unknown; at: number }) {
	const REACH = useReach();
	if (typeof fact === "object" && fact !== null && "pick" in fact)
		return (
			<View style={REACH} className={PICK}>
				<HeldPicker {...(fact.pick as OptionPick)} fit="row" painted />
			</View>
		);
	const [spec] = badgesOf({
		facts: [fact],
		word: () => "",
		fillers: true,
		painted: isStatusFact(fact),
	}).badges;
	return spec ? <FactBadge spec={spec} at={at} /> : null;
}

// A record's head: its place (the overline), its name and its facts, a pair
// apart; the bar holds the acts, so the head holds none. The name is the Pane's
// title, drawn whole and wrapping as the screen's header; given none, the head
// is the overline and the facts. A name, a part or a fact that is a selection
// paints in its place, and the head takes no touch, until its read lands.
// Outside the package's exports: a Pane draws it for its `record`, and
// `ItemHeaderBase` is the head with no name.
export function ItemHeaderBase({
	name: title,
	overline = [],
	facts = [],
	image,
}: ItemHeaderParts & {
	// The record's name: the Pane's title.
	name?: Datum<Run>;
}) {
	const [name] = useSelections([title]);
	const drawn = useSelections([...overline, ...facts]);
	// A part or a fact whose read ended draws nothing; the frame that holds the
	// read says why.
	const draws = (each: (typeof drawn)[number]) => !each.painted || paints(each);
	// A loaded part with no text draws nothing, so no separator dangles after
	// the part before it.
	const placed = drawn
		.slice(0, overline.length)
		.filter(
			(each) => draws(each) && (each.painted || filled(each.value as Run)),
		);
	const stood = drawn
		.slice(overline.length)
		.filter(
			(each) =>
				draws(each) &&
				(each.painted || !isMark(each.value) || says(each.value)),
		);
	const painted = drawn.some(paints) || paints(name);
	// A quiet fact stands beside the name where the head draws one; a head with
	// no name keeps it in the facts line.
	const named = title !== undefined && (!name.painted || paints(name));
	const aside = (each: (typeof stood)[number]) =>
		named &&
		!each.painted &&
		isMark(each.value) &&
		wordless(each.value as RowMark);
	const quiet = stood.filter(aside);
	const line = stood.filter((each) => !aside(each));
	// A fact that came on its own once the header was drawn is a block that fades
	// in as it mounts.
	const arrived = useArrivals(
		stood.flatMap((fact) =>
			fact.painted ? [] : [factKey(fact.value as RecordFact)],
		),
		!painted,
	);
	const heading = named ? (
		<PaintText
			fills="title"
			painted={name.painted}
			accessibilityRole="header"
			{...clipWhen(painted)}
			className={cn(
				text({ role: "heading" }),
				quiet.length > 0 && "min-w-0 flex-1",
			)}
		>
			{name.painted ? (
				<Painted role="title" />
			) : (
				<RunText runs={partRuns(name.value as Run)} fit="name" />
			)}
		</PaintText>
	) : null;
	const column = (
		<View {...inertProps(painted)} className={cn(ITEM_HEADER, image && COLUMN)}>
			{placed.length > 0 ? (
				// The overline is one text, a middle dot between its parts, cut with an
				// ellipsis at its end: on touch as on the desktop. A part that waits
				// is its filler, so the waiting form is the loaded one painted.
				<PaintText
					fills="word"
					painted={placed.some((part) => part.painted)}
					numberOfLines={1}
					{...clipWhen(painted)}
					className={text({ role: "meta" })}
				>
					{placed.map((part, at) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: the parts are a fixed list, in order
						<Fragment key={at}>
							{at === 0 ? null : META_TAIL}
							{part.painted ? (
								<Painted role="word" at={at} />
							) : (
								<RunText
									runs={partRuns(part.value as Run, META_CUT)}
									fit="name"
								/>
							)}
						</Fragment>
					))}
				</PaintText>
			) : null}
			{quiet.length > 0 ? (
				<View className={NAME_ROW}>
					{heading}
					<View className={ASIDE}>
						<Strut role="heading" />
						{quiet.map((fact) => (
							<FadingView
								key={factKey(fact.value as RecordFact)}
								entering={
									arrived.has(factKey(fact.value as RecordFact))
										? blockIn()
										: undefined
								}
							>
								<EndMark mark={fact.value as RowMark} />
							</FadingView>
						))}
					</View>
				</View>
			) : (
				heading
			)}
			{line.length > 0 ? (
				<View className={cn(BADGE_LINE, FACTS)}>
					{line.map((fact, at) =>
						fact.painted ? (
							// biome-ignore lint/suspicious/noArrayIndexKey: a painted fact has no text to key by
							<PaintedFact key={at} fact={fact.value} at={at} />
						) : (
							<FactPart
								key={factKey(fact.value as RecordFact)}
								fact={fact.value as RecordFact}
								entering={
									arrived.has(factKey(fact.value as RecordFact))
										? blockIn()
										: undefined
								}
							/>
						),
					)}
				</View>
			) : null}
		</View>
	);
	return image === undefined ? (
		column
	) : (
		<View className={cn(ITEM_HEADER_PICTURE, PICTURED)}>
			<PictureTile
				src={image.src}
				alt={image.alt}
				fit="thumb"
				box={undefined}
			/>
			{column}
		</View>
	);
}
