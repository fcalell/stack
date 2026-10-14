import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import { formatterFor } from "@fcalell/ui-core/format";
import { STAT, STAT_FIGURE, text } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { inertProps, Painted } from "../../lib/paint";

const STACK = "min-w-0";
const FIGURE = "flex-row items-baseline";

export interface StatProps extends Closed {
	/** What the figure counts, read after it ("need you") (a short phrase; wraps). */
	label: string;
	/** The figure; zero is a count, drawn. A selection paints the figure, and the Stat takes no touch, until its read lands. */
	value: Datum<number>;
	/** What the figure counts, muted beside it (a word; wraps). */
	unit?: string;
}

// The figure at the display role in tabular figures with its label in meta
// under it, so it reads "2, need you". One per screen.
export function Stat({ label, value, unit }: StatProps) {
	const [figure] = useSelections([value]);
	return (
		<View {...inertProps(figure.painted)} className={cn(STAT, STACK)}>
			<View className={cn(STAT_FIGURE, FIGURE)}>
				<RNText className={cn(text({ role: "display" }), "shrink-0")}>
					{figure.painted ? (
						<Painted role="figure" />
					) : (
						formatterFor("number").format(figure.value)
					)}
				</RNText>
				{unit ? (
					<RNText className={cn(text({ role: "meta" }), "shrink")}>
						{unit}
					</RNText>
				) : null}
			</View>
			<RNText className={text({ role: "meta" })}>{label}</RNText>
		</View>
	);
}
