import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { factReach } from "@fcalell/ui-core/chart";
import type { OptionPick, Run, Tone } from "@fcalell/ui-core/descriptors";
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
import { filled, META_CUT, partRuns, partText } from "../../lib/parts";
import type { Route } from "../../lib/route";
import { Count } from "../count";
import { Icon } from "../icon";
import { HeldPicker } from "../picker/base";
import { Status } from "../status";
import { StatusBase } from "../status/base";

const FACTS = "flex-row flex-wrap items-center";
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
// One fact in the head's facts line: words, a status, words that open a sheet or go to a route, a status that
// moves (a pick whose options carry states), a count beside its word. Each string
// is a short phrase: the facts line wraps between facts, a `{ quoted }` part is cut
// at 40 characters.
export type Fact =
	| Run
	| { status: Tone; label?: string }
	| { label: Run; onOpen: () => void }
	| { label: Run; href: Route; onOpen?: never }
	| { pick: OptionPick }
	| { count: number; label: string };

/** What a record's head holds besides its name: the parts that place the record and its facts. */
export interface ItemHeaderParts {
	/** The parts that place the record, joined by a middle dot (each a short phrase; one line, truncates). A part that is a selection paints, and the head takes no touch, until its read lands. */
	overline?: readonly Datum<Run>[];
	/** The facts in a wrapping line under the overline. A fact that is a selection paints in its place (a status or a pick keeps its form, any other is a word), and the head takes no touch, until its read lands. */
	facts?: readonly Datum<Fact>[];
}

function factKey(fact: Fact): string {
	if (typeof fact === "object" && "pick" in fact) return fact.pick.label;
	if (typeof fact === "object" && ("onOpen" in fact || "href" in fact))
		return partText(fact.label);
	if (typeof fact === "object" && "status" in fact)
		return `${fact.status} ${fact.label ?? ""}`;
	if (typeof fact === "object" && "count" in fact)
		return `${fact.count} ${fact.label}`;
	return partText(fact);
}

function FactPart({ fact }: { fact: Fact }) {
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
	if (typeof fact === "object" && "status" in fact)
		return <Status tone={fact.status} label={fact.label} />;
	if (typeof fact === "object" && "count" in fact)
		return (
			<View className={cn(ITEM_FACT, FACT)}>
				<RNText className={cn(text({ role: "meta" }), "shrink")}>
					{fact.label}
				</RNText>
				<Count value={fact.count} />
			</View>
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
	if (typeof fact === "object" && fact !== null && "status" in fact)
		return <StatusBase painted />;
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
	const stood = drawn.slice(overline.length).filter(draws);
	const painted = drawn.some(paints) || paints(name);
	// A fact that came on its own once the header was drawn is a block that fades
	// in as it mounts.
	const arrived = useArrivals(
		stood.flatMap((fact) =>
			fact.painted ? [] : [factKey(fact.value as Fact)],
		),
		!painted,
	);
	return (
		<View {...inertProps(painted)} className={ITEM_HEADER}>
			{placed.length > 0 ? (
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
							{at === 0 ? null : " · "}
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
			{title !== undefined && (!name.painted || paints(name)) ? (
				<PaintText
					fills="title"
					painted={name.painted}
					accessibilityRole="header"
					{...clipWhen(painted)}
					className={text({ role: "heading" })}
				>
					{name.painted ? (
						<Painted role="title" />
					) : (
						<RunText runs={partRuns(name.value as Run)} fit="name" />
					)}
				</PaintText>
			) : null}
			{stood.length > 0 ? (
				<View className={cn(ITEM_FACTS, FACTS)}>
					{stood.map((fact, at) =>
						fact.painted ? (
							// biome-ignore lint/suspicious/noArrayIndexKey: a painted fact has no text to key by
							<PaintedFact key={at} fact={fact.value} at={at} />
						) : (
							<FadingView
								key={factKey(fact.value as Fact)}
								entering={
									arrived.has(factKey(fact.value as Fact))
										? blockIn()
										: undefined
								}
							>
								<FactPart fact={fact.value as Fact} />
							</FadingView>
						),
					)}
				</View>
			) : null}
		</View>
	);
}
