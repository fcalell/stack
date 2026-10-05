import { formatterFor } from "@fcalell/ui-core/format";
import { STAT, STAT_FIGURE, text } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { StatWait } from "./wait";

const STACK = "min-w-0";
const FIGURE = "flex-row items-baseline";

export interface StatProps extends Closed {
	// What the figure counts, read after it ("need you").
	label: string;
	// The figure; zero is a count, drawn.
	value: number;
	// What the figure counts, muted beside it.
	unit?: string;
	// The figure and its label as bars in their line boxes.
	loading?: boolean;
}

// The figure at the display role in tabular figures with its label in meta
// under it, so it reads "2, need you". One per screen.
export function Stat({ label, value, unit, loading }: StatProps) {
	if (loading) return <StatWait />;
	return (
		<View className={cn(STAT, STACK)}>
			<View className={cn(STAT_FIGURE, FIGURE)}>
				<RNText className={text({ role: "display" })}>
					{formatterFor("number").format(value)}
				</RNText>
				{unit ? (
					<RNText className={text({ role: "meta" })}>{unit}</RNText>
				) : null}
			</View>
			<RNText className={text({ role: "meta" })}>{label}</RNText>
		</View>
	);
}
