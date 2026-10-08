import type {
	OptionPick,
	Part,
	StatusState,
} from "@fcalell/ui-core/descriptors";
import {
	ITEM_FACT,
	ITEM_FACTS,
	ITEM_HEADER,
	PILL_ACT,
	SKELETON_LINES,
	skeleton,
	skeletonRow,
	text,
} from "@fcalell/ui-core/variants";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";

import { joinParts, META_CUT, partText } from "../../lib/parts";
import { Strut } from "../../lib/strut";
import { useWords } from "../../lib/words";
import { Count } from "../count";
import { Icon } from "../icon";
import { Picker } from "../picker";
import { Status } from "../status";

const FACTS = "flex-row flex-wrap items-center";
const FACT = "flex-row items-center";
// A pick in the facts line pulls back at its start as well as its end, so its
// dot and word sit where a plain fact's would.
const PICK = "flex-row -ms-inside";
// A fact that acts washes at the press; one that opens pulls back at its start
// as a pick does.
const ACT = "flex-row items-center active:bg-wash-press";
const OPEN = cn(ACT, "-ms-inside");
// A loading line stands in its text's line box (a zero-width line of the
// role beside the bar), so the loading head keeps the loaded head's height;
// the facts wrap to a second line on the phone, which the loading head
// reserves.
const LINE_WAIT = "flex-row items-center";
const FACTS_LINE_WAIT = "flex-row items-center";
// The waiting count is a bar one figure wide, set by an unseen figure.
const COUNT_WAIT = "shrink-0 flex-row items-center";
const FIGURE_WAIT = "opacity-0 tabular-nums";

// One fact under the title: words, a status, words that open a sheet, a status that
// moves (a pick whose options carry states), a count beside its word, or the state of a save
// that runs as the record is typed, a failed one with its retry.
export type Fact =
	| Part
	| { status: StatusState; label?: string }
	| { label: Part; onOpen: () => void }
	| { pick: OptionPick }
	| { count: number; label: string }
	| { save: "saving" | "saved" | "failed"; onRetry: () => void };

export interface ItemHeaderProps extends Closed {
	// The parts that place the record, joined by a middle dot over the title.
	overline?: readonly Part[];
	// The record's name, wrapping in full.
	title: Part;
	// The facts in a wrapping line under the title.
	facts?: readonly Fact[];
	// Bars in each line's box stand in for the head, at its height.
	loading?: boolean;
}

function factKey(fact: Fact): string {
	if (typeof fact === "object" && "pick" in fact) return fact.pick.label;
	if (typeof fact === "object" && "onOpen" in fact) return partText(fact.label);
	if (typeof fact === "object" && "status" in fact)
		return `${fact.status} ${fact.label ?? ""}`;
	if (typeof fact === "object" && "count" in fact)
		return `${fact.count} ${fact.label}`;
	if (typeof fact === "object" && "save" in fact) return "save";
	return partText(fact);
}

// The save fact holds its widest form's room (the failed form, a status and a
// retry, drawn unseen in the flow) under the live form, so the facts line wraps
// the same as the save moves between its states. Like the pick it pulls back
// at both ends by a pill's padding.
const SAVE = "flex-row -mx-inside";
const SAVE_FORM = "absolute inset-0 flex-row items-center";
const SAVE_ROOM = "flex-row items-center opacity-0";
const SAVE_PILL = cn(PILL_ACT, ITEM_FACT, FACT);

function Retry() {
	const words = useWords();
	return (
		<>
			<Ink.Provider value="ink-meta">
				<Icon name="RotateCcw" fit="meta" />
			</Ink.Provider>
			<RNText className={text({ role: "meta" })}>{words.retry}</RNText>
		</>
	);
}

function SaveFact({
	save,
	onRetry,
}: {
	save: "saving" | "saved" | "failed";
	onRetry: () => void;
}) {
	const words = useWords();
	const said = save === "failed" ? words.notSaved : words[save];
	return (
		<View className={SAVE}>
			<View className={SAVE_ROOM}>
				<View className={SAVE_PILL}>
					<Status state="failed" label={words.notSaved} />
				</View>
				<View className={cn(PILL_ACT, ITEM_FACT, ACT)}>
					<Retry />
				</View>
			</View>
			<View className={SAVE_FORM}>
				<View className={SAVE_PILL}>
					{save === "failed" ? (
						<Status state="failed" label={said} />
					) : (
						<RNText className={text({ role: "meta" })}>{said}</RNText>
					)}
				</View>
				{save === "failed" ? (
					<Pressable
						accessibilityRole="button"
						onPress={onRetry}
						className={cn(PILL_ACT, ITEM_FACT, ACT)}
					>
						<Retry />
					</Pressable>
				) : null}
			</View>
		</View>
	);
}

function FactPart({ fact }: { fact: Fact }) {
	if (typeof fact === "object" && "onOpen" in fact)
		return (
			<Pressable
				accessibilityRole="button"
				onPress={fact.onOpen}
				className={cn(PILL_ACT, ITEM_FACT, OPEN)}
			>
				<RNText className={text({ role: "meta" })}>
					{partText(fact.label, META_CUT)}
				</RNText>
				<Ink.Provider value="ink-meta">
					<Icon name="ChevronRight" fit="meta" />
				</Ink.Provider>
			</Pressable>
		);
	if (typeof fact === "object" && "pick" in fact)
		return (
			<View className={PICK}>
				<Picker {...fact.pick} fit="row" />
			</View>
		);
	if (typeof fact === "object" && "status" in fact)
		return <Status state={fact.status} label={fact.label} />;
	if (typeof fact === "object" && "count" in fact)
		return (
			<View className={cn(ITEM_FACT, FACT)}>
				<RNText className={text({ role: "meta" })}>{fact.label}</RNText>
				<Count value={fact.count} />
			</View>
		);
	if (typeof fact === "object" && "save" in fact)
		return <SaveFact save={fact.save} onRetry={fact.onRetry} />;
	return (
		<RNText className={text({ role: "meta" })}>
			{partText(fact, META_CUT)}
		</RNText>
	);
}

function LineWait({ role, bar }: { role: "meta" | "title"; bar: string }) {
	return (
		<View className={LINE_WAIT}>
			<Strut role={role} />
			<View className={cn(skeleton({ kind: "line" }), bar)} />
		</View>
	);
}

// The overline, the title at the title role and the facts, a pair apart
// whether the title wraps or not. React Native exposes no heading level, so
// the title is a header at any depth.
export function ItemHeader({
	overline,
	title,
	facts,
	loading,
}: ItemHeaderProps) {
	if (loading)
		return (
			<View accessibilityState={{ busy: true }} className={ITEM_HEADER}>
				<LineWait role="meta" bar="w-1/4" />
				<LineWait role="title" bar="w-1/2" />
				<View className={SKELETON_LINES}>
					<View className={cn(skeletonRow({ kind: "facts" }), FACTS_LINE_WAIT)}>
						<View className={cn(skeleton({ kind: "line" }), "w-1/3")} />
						<View className={cn(skeleton({ kind: "count" }), COUNT_WAIT)}>
							<RNText className={cn(text({ role: "caption" }), FIGURE_WAIT)}>
								0
							</RNText>
						</View>
					</View>
					<LineWait role="meta" bar="w-1/2" />
				</View>
			</View>
		);
	return (
		<View className={ITEM_HEADER}>
			{overline && overline.length > 0 ? (
				<RNText numberOfLines={1} className={text({ role: "meta" })}>
					{joinParts(overline, META_CUT)}
				</RNText>
			) : null}
			<RNText accessibilityRole="header" className={text({ role: "title" })}>
				{partText(title)}
			</RNText>
			{facts && facts.length > 0 ? (
				<View className={cn(ITEM_FACTS, FACTS)}>
					{facts.map((fact) => (
						<FactPart key={factKey(fact)} fact={fact} />
					))}
				</View>
			) : null}
		</View>
	);
}
