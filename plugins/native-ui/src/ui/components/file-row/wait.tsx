import {
	ROW_LEADING,
	skeleton,
	skeletonLane,
	skeletonRow,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { GroundContext } from "../../lib/ground";

const WAIT = "flex-row items-center";
const LEADING = "shrink-0 items-center justify-center";
const WAIT_GLYPH = "shrink-0";
const WAIT_PATH = "flex-1 flex-row min-w-0";
const WAIT_COUNTS = "flex-1 flex-row justify-end min-w-0";
// The path's bar at half the row, the counts' at a third of their lane.
const PATH_BAR = "w-1/2";
const COUNTS_BAR = "w-1/3";

// A FileRow waiting: the glyph, the path's bar and the counts' bar, busy
// when it waits alone (a list of them is busy once). Outside the package's
// exports.
export function FileWait(props: { busy: boolean }) {
	const ground = useContext(GroundContext);
	return (
		<View
			accessibilityState={{ busy: props.busy }}
			className={cn(
				skeletonRow({
					kind: ground === "group" ? "one-line-group" : "one-line",
				}),
				WAIT,
			)}
		>
			<View className={cn(ROW_LEADING, LEADING)}>
				<View className={cn(skeleton({ kind: "icon" }), WAIT_GLYPH)} />
			</View>
			<View className={WAIT_PATH}>
				<View className={cn(skeleton({ kind: "line" }), PATH_BAR)} />
			</View>
			<View className={cn(skeletonLane({ role: "meta" }), WAIT_COUNTS)}>
				<View className={cn(skeleton({ kind: "line" }), COUNTS_BAR)} />
			</View>
		</View>
	);
}
