import type { BarSeries } from "@fcalell/ui-core/descriptors";
import { text } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { Text as RNText, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingRows } from "../../lib/loading";
import { useTokenColor } from "../../lib/theme";

export interface BarChartProps extends Closed {
	series: readonly BarSeries[];
	unit?: string;
	loading?: boolean;
}

const BAR = 12;

// One labelled bar per series item, stacked by its parts, the value beside
// it, the time under it.
export function BarChart({ series, unit, loading }: BarChartProps) {
	const [width, setWidth] = useState(0);
	const fills = [
		useTokenColor("--color-tint"),
		useTokenColor("--color-accent-soft"),
		useTokenColor("--color-ink-faint"),
		useTokenColor("--color-edge"),
	];
	if (loading) return <LoadingRows />;
	const peak = Math.max(1, ...series.map((item) => item.value));
	return (
		<View
			accessibilityLabel={unit}
			onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
			className="gap-stack"
		>
			{series.map((item) => {
				const parts =
					item.parts && item.parts.length > 0
						? item.parts
						: [{ label: item.label, value: item.value }];
				let x = 0;
				return (
					<View key={`${item.label}:${item.at ?? ""}`} className="gap-pair">
						<View className="flex-row items-center justify-between gap-row">
							<RNText className={text({ role: "body" })}>{item.label}</RNText>
							<RNText className={text({ role: "meta" })}>
								{item.value}
								{unit ? ` ${unit}` : ""}
							</RNText>
						</View>
						<Svg width={width} height={BAR}>
							{parts.map((part, index) => {
								const w = (part.value / peak) * width;
								const rect = (
									<Rect
										key={part.label}
										x={x}
										y={0}
										width={w}
										height={BAR}
										rx={BAR / 2}
										fill={fills[index % fills.length]}
									/>
								);
								x += w;
								return rect;
							})}
						</Svg>
						{item.at ? (
							<RNText className={cn(text({ role: "meta" }))}>{item.at}</RNText>
						) : null}
					</View>
				);
			})}
		</View>
	);
}
