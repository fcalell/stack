import type { CountLink, MeterMark } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
import { levelOf } from "@fcalell/ui-core/list-state";
import { filled } from "@fcalell/ui-core/tokens";
import {
	FIGURES,
	METER,
	METER_HEAD,
	METER_ITEM,
	METER_MARK,
	METER_TRACK,
	meterFill,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { GroundContext } from "../../lib/ground";
import { useWords } from "../../lib/words";
import { CountLinks } from "./count-links";
import { MeterWait } from "./wait";

const STACK = "min-w-0";
const HEAD = "flex-row items-center";
const LABEL = "flex-1 min-w-0";
const SHARE = "shrink-0";
const BAR = "relative";
const TRACK = "overflow-hidden";
const TICK = "absolute";

interface MeterBase extends Closed {
	// What is measured.
	label: string;
	// How much is used; past `max` the meter is over.
	value: number;
	// The limit.
	max: number;
	// What the value counts (`GB`, `requests`), read aloud with it.
	unit?: string;
	// A tick across the track at the mark's value, named to assistive tech:
	// the point the fill turns `warn` at, in place of the near share.
	mark?: MeterMark;
	// The label, share, bar and the line under it as bars in their line boxes.
	loading?: boolean;
}

// The one line under the bar: words, or counts that are links, never both.
type MeterLine =
	| {
			// A line under the bar: the value in words, when it resets.
			meta?: string;
			counts?: never;
	  }
	| {
			// The line under the bar as links: counts that lead to their lists.
			counts: readonly CountLink[];
			meta?: never;
	  };

export type MeterProps = MeterBase & MeterLine;

// The label at body 500 with the share in percent at its end, the bar under
// them filling by the share in the meta ink, `warn` once near full (at its
// `mark` when it has one) and `danger` once over, the line under the bar: the
// meta, or the counts as links. In a `Group` it stands as one of its items at
// the card's inset, the group's hairline between. React Native has no meter
// role: it is a progress bar whose value text is the web's valuetext. An
// accessible view is one element, so the counts stand outside it.
export function Meter({
	label,
	value,
	max,
	unit,
	meta,
	counts,
	mark,
	loading,
}: MeterProps) {
	const words = useWords();
	// In a Group the meter is one of its items, at the card's inset.
	const item = useContext(GroundContext) === "group" && METER_ITEM;
	if (loading) return <MeterWait busy meta />;
	const share = max > 0 ? value / max : 0;
	const markShare = mark && max > 0 ? mark.value / max : undefined;
	const number = formatterFor("number");
	const percent = formatterFor("number", undefined, {
		style: "percent",
		maximumFractionDigits: 0,
	}).format(share);
	// A figure with its unit, when the meter counts one.
	const unitOf = (figure: string) => (unit ? `${figure} ${unit}` : figure);
	const amount = unitOf(
		filled(words.meterValue, {
			value: number.format(value),
			max: number.format(max),
		}),
	);
	const rest =
		share > 1
			? filled(words.meterOver, { amount: unitOf(number.format(value - max)) })
			: percent;
	const marked = mark
		? `, ${filled(words.meterMark, {
				name: mark.label,
				value: unitOf(number.format(mark.value)),
			})}`
		: "";
	return (
		<View className={cn(METER, item, STACK)}>
			<View
				accessible
				accessibilityRole="progressbar"
				accessibilityLabel={label}
				accessibilityValue={{
					min: 0,
					max,
					now: Math.min(value, max),
					text: `${amount}, ${rest}${marked}`,
				}}
				className={cn(METER, STACK)}
			>
				<View className={cn(METER_HEAD, HEAD)}>
					<RNText
						numberOfLines={1}
						className={cn(
							text({ role: "body" }),
							textStrong({ role: "body" }),
							LABEL,
						)}
					>
						{label}
					</RNText>
					<RNText className={cn(text({ role: "meta" }), FIGURES, SHARE)}>
						{percent}
					</RNText>
				</View>
				<View className={BAR}>
					<View className={cn(METER_TRACK, TRACK)}>
						{share > 0 ? (
							<View
								className={meterFill({ level: levelOf(share, markShare) })}
								// The fill's width is the data's, the value's share of the max.
								style={{ width: `${Math.min(share, 1) * 100}%` }}
							/>
						) : null}
					</View>
					{markShare !== undefined ? (
						<View
							className={cn(METER_MARK, TICK)}
							// The tick's place is the data's, the mark's share of the max.
							style={{ left: `${Math.min(Math.max(markShare, 0), 1) * 100}%` }}
						/>
					) : null}
				</View>
			</View>
			{counts ? <CountLinks counts={counts} /> : null}
			{meta ? <RNText className={text({ role: "meta" })}>{meta}</RNText> : null}
		</View>
	);
}
