import { lineBox, STAT, skeleton } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";

const STACK = "min-w-0";
// A loading line stands in its text's line box: a zero-width line of the
// role beside the bar, so the loading stat keeps the loaded one's height.
const LINE = "flex-row items-center";
const STRUT = "​";

// A Stat waiting: the figure and its label as bars in their line boxes.
// Outside the package's exports.
export function StatWait() {
	return (
		<View accessibilityState={{ busy: true }} className={cn(STAT, STACK)}>
			<View className={LINE}>
				<RNText className={lineBox({ role: "display" })}>{STRUT}</RNText>
				<View className={cn(skeleton({ kind: "line" }), "w-1/3")} />
			</View>
			<View className={LINE}>
				<RNText className={lineBox({ role: "meta" })}>{STRUT}</RNText>
				<View className={cn(skeleton({ kind: "line" }), "w-1/2")} />
			</View>
		</View>
	);
}
