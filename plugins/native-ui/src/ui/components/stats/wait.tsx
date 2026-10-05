import type { StatSpec } from "@fcalell/ui-core/descriptors";
import { type WaitLine, waitLine } from "@fcalell/ui-core/list-state";
import {
	LINK_TARGET,
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
const COUNTS_LINE = "justify-center";
// A strip given no cells stands four of label and figure in, its length being
// the data's.
const STAND_IN: ReadonlyArray<{ key: string; line: WaitLine }> = [
	{ key: "a", line: "none" },
	{ key: "b", line: "none" },
	{ key: "c", line: "none" },
	{ key: "d", line: "none" },
];

// A Stats waiting: a cell per item given (four when none), each its label and
// figure as bars in their line boxes and the line its item declares (a meta
// line, or one count link's target box) under them. Outside the package's
// exports.
export function StatsWait({ items }: { items: readonly StatSpec[] }) {
	const cells =
		items.length > 0
			? items.map((item) => ({ key: item.label, line: waitLine(item) }))
			: STAND_IN;
	return (
		<View accessibilityState={{ busy: true }} className={cn(STATS, CLIP)}>
			<View className={CELLS}>
				{cells.map((cell) => (
					<View key={cell.key} className={cn(STATS_CELL, CELL)}>
						<View className={LINE}>
							<Strut role="meta" />
							<View className={cn(skeleton({ kind: "line" }), "w-1/2")} />
						</View>
						<View className={LINE}>
							<Strut role="figure" />
							<View className={cn(skeleton({ kind: "line" }), "w-1/3")} />
						</View>
						{cell.line === "meta" ? (
							<View className={LINE}>
								<Strut role="meta" />
								<View className={cn(skeleton({ kind: "line" }), "w-1/2")} />
							</View>
						) : null}
						{cell.line === "counts" ? (
							<View className={cn(LINK_TARGET, COUNTS_LINE)}>
								<View className={cn(skeleton({ kind: "line" }), "w-1/2")} />
							</View>
						) : null}
					</View>
				))}
			</View>
			<View pointerEvents="none" className={STATS_EDGE} />
		</View>
	);
}
