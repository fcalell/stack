import { filled, METER_NEAR } from "@fcalell/ui-core/tokens";
import {
	FIGURES,
	METER,
	METER_HEAD,
	METER_ITEM,
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
import { MeterWait } from "./wait";

const STACK = "min-w-0";
const HEAD = "flex-row items-center";
const LABEL = "flex-1 min-w-0";
const SHARE = "shrink-0";
const TRACK = "overflow-hidden";

// The level a share stands at: past the max over, from `METER_NEAR` near.
function levelOf(share: number) {
	if (share > 1) return "over";
	if (share >= METER_NEAR) return "near";
	return "under";
}

export interface MeterProps extends Closed {
	// What is measured.
	label: string;
	// How much is used; past `max` the meter is over.
	value: number;
	// The limit.
	max: number;
	// What the value counts (`GB`, `requests`), read aloud with it.
	unit?: string;
	// A line under the bar: the value in words, when it resets.
	meta?: string;
	// The label, share, bar and meta as bars in their line boxes.
	loading?: boolean;
}

// The label at body 500 with the share in percent at its end, the bar under
// them filling by the share in the meta ink, `warn` once near full and
// `danger` once over, the meta line under the bar. In a `Group` it stands as
// one of its items at the card's inset, the group's hairline between. React
// Native has no meter role: it is a progress bar whose value text is the
// web's valuetext.
export function Meter({ label, value, max, unit, meta, loading }: MeterProps) {
	const words = useWords();
	// In a Group the meter is one of its items, at the card's inset.
	const item = useContext(GroundContext) === "group" && METER_ITEM;
	if (loading) return <MeterWait busy meta />;
	const share = max > 0 ? value / max : 0;
	const number = new Intl.NumberFormat();
	const percent = new Intl.NumberFormat(undefined, {
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
	return (
		<View
			accessible
			accessibilityRole="progressbar"
			accessibilityLabel={label}
			accessibilityValue={{
				min: 0,
				max,
				now: Math.min(value, max),
				text: `${amount}, ${rest}`,
			}}
			className={cn(METER, item, STACK)}
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
			<View className={cn(METER_TRACK, TRACK)}>
				{share > 0 ? (
					<View
						className={meterFill({ level: levelOf(share) })}
						// The fill's width is the data's, the value's share of the max.
						style={{ width: `${Math.min(share, 1) * 100}%` }}
					/>
				) : null}
			</View>
			{meta ? <RNText className={text({ role: "meta" })}>{meta}</RNText> : null}
		</View>
	);
}
