import type {
	OptionPick,
	Part,
	StatusState,
} from "@fcalell/ui-core/descriptors";
import {
	ITEM_FACT,
	ITEM_FACTS,
	ITEM_HEADER,
	lineBox,
	SKELETON_LINES,
	skeleton,
	skeletonRow,
	text,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { joinParts, META_CUT, partText } from "../../lib/parts";
import { Count } from "../count";
import { Picker } from "../picker";
import { Status } from "../status";

const FACTS = "flex-row flex-wrap items-center";
const FACT = "flex-row items-center";
// A pick in the facts line pulls back at its start as well as its end, so its
// dot and word sit where a plain fact's would.
const PICK = "flex-row -ms-inside";
// A loading line stands in its text's line box (a zero-width line of the
// role beside the bar), so the loading head keeps the loaded head's height;
// the facts wrap to a second line on the phone, which the loading head
// reserves.
const LINE_WAIT = "flex-row items-center";
const FACTS_LINE_WAIT = "flex-row items-center";
const COUNT_WAIT = "shrink-0";
const STRUT = "​";

// One fact under the title: words, a status, a status that moves (a pick
// whose options carry states), or a count beside its word.
export type Fact =
	| Part
	| { status: StatusState; label?: string }
	| { pick: OptionPick }
	| { count: number; label: string };

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
	if (typeof fact === "object" && "status" in fact)
		return `${fact.status} ${fact.label ?? ""}`;
	if (typeof fact === "object" && "count" in fact)
		return `${fact.count} ${fact.label}`;
	return partText(fact);
}

function FactPart({ fact }: { fact: Fact }) {
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
	return (
		<RNText className={text({ role: "meta" })}>
			{partText(fact, META_CUT)}
		</RNText>
	);
}

function LineWait({ role, bar }: { role: "meta" | "heading"; bar: string }) {
	return (
		<View className={LINE_WAIT}>
			<RNText className={lineBox({ role })}>{STRUT}</RNText>
			<View className={cn(skeleton({ kind: "line" }), bar)} />
		</View>
	);
}

// The overline, the title at the heading role and the facts, a pair apart
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
				<LineWait role="heading" bar="w-1/2" />
				<View className={SKELETON_LINES}>
					<View className={cn(skeletonRow({ kind: "facts" }), FACTS_LINE_WAIT)}>
						<View className={cn(skeleton({ kind: "line" }), "w-1/3")} />
						<View className={cn(skeleton({ kind: "count" }), COUNT_WAIT)} />
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
			<RNText accessibilityRole="header" className={text({ role: "heading" })}>
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
