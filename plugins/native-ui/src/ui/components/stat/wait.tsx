import { STAT, skeleton } from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { Strut } from "../../lib/strut";

const STACK = "min-w-0";
// A loading line stands in its text's line box: a zero-width line of the
// role beside the bar, so the loading stat keeps the loaded one's height.
const LINE = "flex-row items-center";

// A Stat waiting: the figure and its label as bars in their line boxes.
// Outside the package's exports.
export function StatWait() {
	return (
		<View accessibilityState={{ busy: true }} className={cn(STAT, STACK)}>
			<View className={LINE}>
				<Strut role="display" />
				<View className={cn(skeleton({ kind: "line" }), "w-1/3")} />
			</View>
			<View className={LINE}>
				<Strut role="meta" />
				<View className={cn(skeleton({ kind: "line" }), "w-1/2")} />
			</View>
		</View>
	);
}
