import type { WaitLine } from "@fcalell/ui-core/list-state";
import {
	GROUP_ITEM,
	LINK_TARGET,
	METER,
	METER_HEAD,
	skeleton,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { GroundContext } from "../../lib/ground";
import { Strut } from "../../lib/strut";

const STACK = "min-w-0";
const HEAD = "flex-row items-center";
// A loading line stands in its text's line box: a zero-width line of the
// role beside the bar, so the loading meter keeps the loaded one's height.
const LINE = "flex-row items-center";
const COUNTS_LINE = "justify-center";
const LABEL_WAIT = "grow";
const SHARE_WAIT = "justify-end shrink-0";
const BAR = "w-full";

// A Meter waiting: the label, share, bar and, when `line` is not `none`, the
// line under the bar as bars in their boxes (a meta line's, or one count
// link's target box); busy when it waits alone (a list of them is busy once).
// Outside the package's exports.
export function MeterWait(props: { busy: boolean; line: WaitLine }) {
	// In a Group the meter is one of its items, at the card's inset.
	const item = useContext(GroundContext) === "group" && GROUP_ITEM;
	return (
		<View
			accessibilityState={{ busy: props.busy }}
			className={cn(METER, item, STACK)}
		>
			<View className={cn(METER_HEAD, HEAD)}>
				<View className={cn(LINE, LABEL_WAIT)}>
					<Strut role="body" />
					<View className={cn(skeleton({ kind: "line" }), "w-1/3")} />
				</View>
				<View className={cn(LINE, SHARE_WAIT, "w-1/12")}>
					<Strut role="meta" />
					<View className={cn(skeleton({ kind: "line" }), BAR)} />
				</View>
			</View>
			<View className={skeleton({ kind: "meter" })} />
			{props.line === "meta" ? (
				<View className={LINE}>
					<Strut role="meta" />
					<View className={cn(skeleton({ kind: "line" }), "w-1/2")} />
				</View>
			) : null}
			{props.line === "counts" ? (
				<View className={cn(LINK_TARGET, COUNTS_LINE)}>
					<View className={cn(skeleton({ kind: "line" }), "w-1/2")} />
				</View>
			) : null}
		</View>
	);
}
