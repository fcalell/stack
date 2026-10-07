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
// The change mark's lane, one icon wide.
const MARK = "shrink-0 items-center justify-center";
const WAIT_GLYPH = "shrink-0";
const WAIT_PATH = "flex-1 flex-row min-w-0";
// The chip's lane and the counts' lane share the room the path leaves, each
// capped at the short measure, its bar at its end.
const WAIT_LANE = "flex-1 flex-row justify-end min-w-0";
// The path's bar at half the row, the chip's at half its lane, the counts' at
// a third of theirs.
const PATH_BAR = "w-1/2";
const CHIP_BAR = "w-1/2";
const COUNTS_BAR = "w-1/3";

// A FileRow waiting: the change mark's skeleton in its lane when `change` is
// declared, the glyph, the path's bar, a chip's bar when `chip` is declared, and
// the counts' bar. Outside the package's exports.
export function FileWait(props: { change: boolean; chip: boolean }) {
	const ground = useContext(GroundContext);
	return (
		<View
			className={cn(
				skeletonRow({
					kind: ground === "group" ? "one-line-group" : "one-line",
				}),
				WAIT,
			)}
		>
			{props.change ? (
				<View className={MARK}>
					<View className={skeleton({ kind: "icon" })} />
				</View>
			) : null}
			<View className={cn(ROW_LEADING, LEADING)}>
				<View className={cn(skeleton({ kind: "icon" }), WAIT_GLYPH)} />
			</View>
			<View className={WAIT_PATH}>
				<View className={cn(skeleton({ kind: "line" }), PATH_BAR)} />
			</View>
			{props.chip ? (
				<View className={cn(skeletonLane({ role: "meta" }), WAIT_LANE)}>
					<View className={cn(skeleton({ kind: "line" }), CHIP_BAR)} />
				</View>
			) : null}
			<View className={cn(skeletonLane({ role: "meta" }), WAIT_LANE)}>
				<View className={cn(skeleton({ kind: "line" }), COUNTS_BAR)} />
			</View>
		</View>
	);
}
