import {
	STATS,
	STATS_CELL,
	STATS_EDGE,
	skeleton,
} from "@fcalell/ui-core/variants";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { Strut } from "../../lib/strut";

const CLIP = "overflow-hidden";
const CELLS = "flex-row flex-wrap";
const CELL = "min-w-0 grow basis-1/2";
// A loading line stands in its text's line box: a zero-width line of the
// role beside the bar, so the loading strip keeps the loaded one's height.
const LINE = "flex-row items-center";
// A strip's length is the data's, unknown while it waits.
const WAITING = ["a", "b", "c", "d"] as const;

// A Stats waiting: four cells, each its label and figure as bars in their
// line boxes. Outside the package's exports.
export function StatsWait() {
	return (
		<View accessibilityState={{ busy: true }} className={cn(STATS, CLIP)}>
			<View className={CELLS}>
				{WAITING.map((key) => (
					<View key={key} className={cn(STATS_CELL, CELL)}>
						<View className={LINE}>
							<Strut role="meta" />
							<View className={cn(skeleton({ kind: "line" }), "w-1/2")} />
						</View>
						<View className={LINE}>
							<Strut role="figure" />
							<View className={cn(skeleton({ kind: "line" }), "w-1/3")} />
						</View>
					</View>
				))}
			</View>
			<View pointerEvents="none" className={STATS_EDGE} />
		</View>
	);
}
