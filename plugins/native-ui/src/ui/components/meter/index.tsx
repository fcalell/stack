import { METER_FILL, METER_TRACK, text } from "@fcalell/ui-core/variants";
import { useState } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { LoadingRows } from "../../lib/loading";

export interface MeterProps extends Closed {
	label: string;
	value: number;
	max: number;
	meta?: string;
	loading?: boolean;
}

// A labelled fill in tint with the value beside it.
export function Meter({ label, value, max, meta, loading }: MeterProps) {
	const [width, setWidth] = useState(0);
	if (loading) return <LoadingRows />;
	const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
	return (
		<View
			accessibilityRole="progressbar"
			accessibilityLabel={label}
			accessibilityValue={{ min: 0, max, now: value }}
			className="gap-pair"
		>
			<View className="flex-row items-center justify-between gap-row">
				<RNText className={text({ role: "body" })}>{label}</RNText>
				<RNText className={text({ role: "meta" })}>
					{Math.round(ratio * 100)}%
				</RNText>
			</View>
			<View
				onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
				className={cn(METER_TRACK, "h-2 overflow-hidden")}
			>
				<View
					className={cn(METER_FILL, "h-2")}
					style={{ width: ratio * width }}
				/>
			</View>
			{meta ? <RNText className={text({ role: "meta" })}>{meta}</RNText> : null}
		</View>
	);
}
