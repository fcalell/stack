import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { factReach } from "@fcalell/ui-core/chart";
import type {
	OptionPick,
	Part,
	StatusState,
} from "@fcalell/ui-core/descriptors";
import {
	ITEM_FACT,
	ITEM_FACTS,
	ITEM_HEADER,
	text,
	WORD_ACT,
} from "@fcalell/ui-core/variants";
import { Fragment } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { navigate, useWarm } from "../../lib/navigate";
import { clipWhen, inertProps, Painted } from "../../lib/paint";
import { META_CUT, partText } from "../../lib/parts";
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
const PICK = "flex-row -ms-inside";
// A fact that acts washes at the press; one that opens pulls back at its start
// as a pick does.
const ACT = "flex-row items-center active:bg-wash-press";
const OPEN = cn(ACT, "-ms-inside");
// One fact in the head's facts line: words, a status, words that open a sheet or go to a route, a status that
// moves (a pick whose options carry states), a count beside its word. Each string
// is a short phrase: the facts line wraps between facts, a `Quoted` part is cut
// at 40 characters.
export type Fact =
	| Part
	| { status: StatusState; label?: string }
	| { label: Part; onOpen: () => void }
	| { label: Part; href: Route; onOpen?: never }
	| { pick: OptionPick }
	| { count: number; label: string };

/** A record's place and facts under the Pane's bar, which holds the record's name and acts. */
export interface ItemHeaderProps extends Closed {
	/** The parts that place the record, joined by a middle dot (each a short phrase; one line, truncates). A part that is a selection paints, and the head takes no touch, until its read lands. */
	overline?: readonly Datum<Part>[];
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
					{partText(fact.label, META_CUT)}
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
					{partText(fact.label, META_CUT)}
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
		return <Status state={fact.status} label={fact.label} />;
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
			{partText(fact, META_CUT)}
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
		<RNText className={text({ role: "meta" })}>
			<Painted role="word" at={at} />
		</RNText>
	);
}

// The record's place (the overline) and its facts, a pair apart, under the
// Pane's bar: the bar holds the record's name and acts, so the head holds
// neither. A part or a fact that is a selection paints in its place, and the
// head takes no touch, until its read lands.
export function ItemHeader({ overline = [], facts = [] }: ItemHeaderProps) {
	const drawn = useSelections([...overline, ...facts]);
	// A part or a fact whose read ended draws nothing; the frame that holds the
	// read says why.
	const draws = (each: (typeof drawn)[number]) => !each.painted || paints(each);
	const placed = drawn.slice(0, overline.length).filter(draws);
	const stood = drawn.slice(overline.length).filter(draws);
	const painted = drawn.some(paints);
	return (
		<View {...inertProps(painted)} className={ITEM_HEADER}>
			{placed.length > 0 ? (
				<RNText
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
								partText(part.value as Part, META_CUT)
							)}
						</Fragment>
					))}
				</RNText>
			) : null}
			{stood.length > 0 ? (
				<View className={cn(ITEM_FACTS, FACTS)}>
					{stood.map((fact, at) =>
						fact.painted ? (
							// biome-ignore lint/suspicious/noArrayIndexKey: a painted fact has no text to key by
							<PaintedFact key={at} fact={fact.value} at={at} />
						) : (
							<FactPart
								key={factKey(fact.value as Fact)}
								fact={fact.value as Fact}
							/>
						),
					)}
				</View>
			) : null}
		</View>
	);
}
