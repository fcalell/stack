import {
	lineBox,
	METER,
	METER_HEAD,
	METER_ITEM,
	skeleton,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { GroundContext } from "../../lib/ground";

const STACK = "min-w-0";
const HEAD = "flex-row items-center";
// A loading line stands in its text's line box: a zero-width line of the
// role beside the bar, so the loading meter keeps the loaded one's height.
const LINE = "flex-row items-center";
const STRUT = "​";
const LABEL_WAIT = "grow";
const SHARE_WAIT = "justify-end shrink-0";
const BAR = "w-full";

// A Meter waiting: the label, share, bar and, when `meta` (a meta line or
// counts), the line under the bar as bars in their line boxes; busy when it
// waits alone (a list of them is busy once). Outside the package's exports.
export function MeterWait(props: { busy: boolean; meta: boolean }) {
	// In a Group the meter is one of its items, at the card's inset.
	const item = useContext(GroundContext) === "group" && METER_ITEM;
	return (
		<View
			accessibilityState={{ busy: props.busy }}
			className={cn(METER, item, STACK)}
		>
			<View className={cn(METER_HEAD, HEAD)}>
				<View className={cn(LINE, LABEL_WAIT)}>
					<RNText className={lineBox({ role: "body" })}>{STRUT}</RNText>
					<View className={cn(skeleton({ kind: "line" }), "w-1/3")} />
				</View>
				<View className={cn(LINE, SHARE_WAIT, "w-1/12")}>
					<RNText className={lineBox({ role: "meta" })}>{STRUT}</RNText>
					<View className={cn(skeleton({ kind: "line" }), BAR)} />
				</View>
			</View>
			<View className={skeleton({ kind: "meter" })} />
			{props.meta ? (
				<View className={LINE}>
					<RNText className={lineBox({ role: "meta" })}>{STRUT}</RNText>
					<View className={cn(skeleton({ kind: "line" }), "w-1/2")} />
				</View>
			) : null}
		</View>
	);
}
