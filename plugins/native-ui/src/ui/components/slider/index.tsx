import {
	METER_FILL,
	METER_TRACK,
	SWITCH_THUMB,
	text,
} from "@fcalell/ui-core/variants";
import { useRef, useState } from "react";
import {
	type LayoutChangeEvent,
	PanResponder,
	Text as RNText,
	View,
} from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

export interface SliderProps extends Closed {
	label: string;
	value: number;
	onChange: (value: number) => void;
	min: number;
	max: number;
	step?: number;
	unit?: string;
}

const THUMB = 28;

// A 44 px track with the value drawn beside it in its `unit`, an Intl unit
// identifier such as "percent", formatted for the device's locale.
export function Slider({
	label,
	value,
	onChange,
	min,
	max,
	step,
	unit,
}: SliderProps) {
	const [width, setWidth] = useState(0);
	const latest = useRef({ width, min, max, step, onChange });
	latest.current = { width, min, max, step, onChange };
	const responder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: () => true,
			onPanResponderGrant: (event) => pick(event.nativeEvent.locationX),
			onPanResponderMove: (event) => pick(event.nativeEvent.locationX),
		}),
	).current;

	function pick(x: number): void {
		const { width, min, max, step, onChange } = latest.current;
		if (width <= 0) return;
		const raw = min + (Math.min(Math.max(x, 0), width) / width) * (max - min);
		const quantum = step ?? 1;
		const next = Math.min(
			max,
			Math.max(min, Math.round(raw / quantum) * quantum),
		);
		onChange(next);
	}

	const ratio = max > min ? (value - min) / (max - min) : 0;
	return (
		<View className="gap-pair">
			<View className="flex-row items-center justify-between gap-row">
				<RNText className={text({ role: "body" })}>{label}</RNText>
				<RNText className={text({ role: "meta" })}>
					{new Intl.NumberFormat(
						undefined,
						unit ? { style: "unit", unit } : {},
					).format(value)}
				</RNText>
			</View>
			<View
				accessibilityRole="adjustable"
				accessibilityLabel={label}
				accessibilityValue={{ min, max, now: value }}
				onLayout={(event: LayoutChangeEvent) =>
					setWidth(event.nativeEvent.layout.width)
				}
				className="min-h-11 justify-center"
				{...responder.panHandlers}
			>
				<View className={cn(METER_TRACK, "h-1")} />
				<View
					className={cn(METER_FILL, "absolute left-0 h-1")}
					style={{ width: ratio * width }}
				/>
				<View
					className={cn(SWITCH_THUMB, "absolute shadow-float")}
					style={{
						width: THUMB,
						height: THUMB,
						left: Math.max(0, ratio * width - THUMB / 2),
					}}
				/>
			</View>
		</View>
	);
}
