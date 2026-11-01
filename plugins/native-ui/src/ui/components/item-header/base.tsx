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
	ITEM_FACT,
	ITEM_FACTS,
	ITEM_HEADER,
	text,
	WORD_ACT,
} from "@fcalell/ui-core/variants";
import { Fragment } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { useArrivals } from "../../lib/arrive";
import { cn } from "../../lib/cn";
import { RunText } from "../../lib/code";
import { Ink } from "../../lib/ink";
import { blockIn, FadingView } from "../../lib/motion";
import { navigate, useWarm } from "../../lib/navigate";
import { clipWhen, inertProps, Painted, PaintText } from "../../lib/paint";
import {
	filled,
	META_CUT,
	META_TAIL,
	PARTS_LINE,
	PartItems,
	partRuns,
	partText,
	usePartsGap,
} from "../../lib/parts";
import { Strut } from "../../lib/strut";
import { ChipBase } from "../chip/base";
import { Count } from "../count";
import { Icon } from "../icon";
import { HeldPicker } from "../picker/base";
import {
	BooleanMark,
	EndMark,
	says,
	WarningMark,
	wordless,
} from "../row/marks";
import { Status } from "../status";
import { StatusBase } from "../status/base";

const FACTS = "flex-row flex-wrap items-center";
// A quiet fact (a mark with no words) stands at the end of the name's first
// line, as a row's stands in its end group: the name's row is the name and the
// glyphs, each glyph beside a strut of the name's line height so it stays on the
// first line of a wrapped name, and it takes no line of the facts, whatever the
// facts hold.
const NAME_ROW = "flex-row items-start gap-gap";
const ASIDE = "flex-row items-center shrink-0";
// A fact that acts keeps its target-height hit box and reaches past the facts
// line's text line above and below it (`factReach`, in px: the phone has no
// `lh` unit), so the line holds the meta line's height whichever kinds of fact
// it carries.
const REACH = { marginVertical: -factReach("touch") } as const;
const FACT = "flex-row items-center";
// A pick in the facts line pulls back at its start as well as its end, so its
// dot and word sit where a plain fact's would.
const PICK = "flex-row -ms-gap";
// A fact that acts washes at the press; one that opens pulls back at its start
// as a pick does.
const ACT = "flex-row items-center active:bg-wash-press";
const OPEN = cn(ACT, "-ms-gap");
/** What a record's head holds besides its name: the parts that place the record and its facts. */
export interface ItemHeaderParts {
	/** The parts that place the record, joined by a middle dot (each a short phrase; one line, truncates). A part that is a selection paints, and the head takes no touch, until its read lands. */
	overline?: readonly Datum<Run>[];
	/** The facts in a wrapping line under the overline, each one fact (`RecordFact`: words, a status, a chip, what is wrong as `{ warning }`, a boolean mark, words that open a sheet or go to a route, a status that moves as a pick whose options carry states, a count beside its word; a boolean mark with `words: false` is its glyph alone, named by its label, standing at the end of the name's first line) (each string a short phrase: the facts line wraps between facts, a `{ quoted }` part is cut at 40 characters). A fact that is a selection paints in its place (a status or a pick keeps its form, any other is a word), and the head takes no touch, until its read lands. */
	facts?: readonly Datum<RecordFact>[];
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

function FactPart({ fact }: { fact: RecordFact }) {
	const warm = useWarm();
	if (typeof fact === "object" && "href" in fact) {
		const { href } = fact;
		return (
			<Pressable
				accessibilityRole="link"
				onPressIn={() => warm(href)}
				onPress={() => navigate(href)}
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
		);
	}
	if (typeof fact === "object" && "onOpen" in fact)
		return (
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
		);
	if (typeof fact === "object" && "pick" in fact)
		return (
			<View style={REACH} className={PICK}>
				<HeldPicker {...fact.pick} fit="row" />
			</View>
		);
	if (isStatusFact(fact)) return <Status tone={fact.tone} label={fact.label} />;
	// What is wrong, a warn glyph and its sentence.
	if (isWarningFact(fact)) return <WarningMark label={fact.warning} />;
	// A data value's tag, in its family.
	if (isChipFact(fact))
		return <ChipBase family={fact.family} label={fact.label} />;
	if (typeof fact === "object" && "count" in fact)
		return (
			<View className={cn(ITEM_FACT, FACT)}>
				<RNText className={cn(text({ role: "meta" }), "shrink")}>
					{fact.label}
				</RNText>
				<Count value={fact.count} />
			</View>
		);
	if (isMarkFact(fact))
		return fact.words === false ? (
			<EndMark mark={fact} />
		) : (
			<BooleanMark mark={fact} />
		);
	return (
		<RNText className={text({ role: "meta" })}>
			<RunText runs={partRuns(fact, META_CUT)} fit="name" />
		</RNText>
	);
}

// A fact that is not here, in the form its selection's shape says: the
// placeholder is no object, so a selection that gives the fact whole paints as
// a word.
function PaintedFact({ fact, at }: { fact: unknown; at: number }) {
	if (isStatusFact(fact)) return <StatusBase painted />;
	if (typeof fact === "object" && fact !== null && "pick" in fact)
		return (
			<View style={REACH} className={PICK}>
				<HeldPicker {...(fact.pick as OptionPick)} fit="row" painted />
			</View>
		);
	return (
		<PaintText fills="word" painted className={text({ role: "meta" })}>
			<Painted role="word" at={at} />
		</PaintText>
	);
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
	const partsGap = usePartsGap();
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
	return (
		<View {...inertProps(painted)} className={ITEM_HEADER}>
			{placed.length > 0 ? (
				placed.some((part) => part.painted) ? (
					<PaintText
						fills="word"
						painted
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
				) : (
					// Loaded, the overline wraps between its parts, never inside one:
					// each part is a box that stands whole, and a part that starts a
					// line leaves its dot clipped away at the line's start.
					<View
						pointerEvents="none"
						style={{ columnGap: partsGap }}
						className={PARTS_LINE}
					>
						<PartItems
							parts={placed.map((part) =>
								partRuns(part.value as Run, META_CUT),
							)}
							gap={partsGap}
							className={text({ role: "meta" })}
						/>
					</View>
				)
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
				<View className={cn(ITEM_FACTS, FACTS)}>
					{line.map((fact, at) =>
						fact.painted ? (
							// biome-ignore lint/suspicious/noArrayIndexKey: a painted fact has no text to key by
							<PaintedFact key={at} fact={fact.value} at={at} />
						) : (
							<FadingView
								key={factKey(fact.value as RecordFact)}
								entering={
									arrived.has(factKey(fact.value as RecordFact))
										? blockIn()
										: undefined
								}
							>
								<FactPart fact={fact.value as RecordFact} />
							</FadingView>
						),
					)}
				</View>
			) : null}
		</View>
	);
}
