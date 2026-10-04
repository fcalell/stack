import { formatterFor } from "@fcalell/ui-core/format";
import {
	SLIDER,
	SLIDER_FILL,
	SLIDER_HEAD,
	SLIDER_LABEL,
	SLIDER_REST,
	SLIDER_THUMB,
	SLIDER_TRACK,
	SLIDER_VALUE,
} from "@fcalell/ui-core/variants";
import { useContext, useRef, useState } from "react";
import {
	type AccessibilityActionEvent,
	PanResponder,
	Text as RNText,
	View,
} from "react-native";
import { useResolveClassNames } from "uniwind";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FieldDisabled } from "../../lib/field";

/** A number picked along a range, its label over the track. */
export interface SliderProps extends Closed {
	/** What it sets, drawn over the track and naming the thumb. */
	label: string;
	/** The value, between `min` and `max`. */
	value: number;
	/** Hears each value the viewer moves it to. */
	onChange: (value: number) => void;
	/** The value at the track's start. */
	min: number;
	/** The value at the track's end. */
	max: number;
	/** The distance between two values it can take; 1 unless set. */
	step?: number;
	/** An Intl unit identifier (`minute`, `percent`), formatted after the value in the device's locale, drawn and read aloud. */
	unit?: string;
}

/** A slider's label and value over its track: the fill up to the thumb, the rest after it. */
export function Slider({
	label,
	value,
	onChange,
	min,
	max,
	step,
	unit,
}: SliderProps) {
	const disabled = useContext(FieldDisabled);
	const [pressed, setPressed] = useState(false);
	const [width, setWidth] = useState(0);
	const thumb = useResolveClassNames(SLIDER_THUMB).width;
	const quantum = step ?? 1;

	function settle(raw: number): number {
		return Math.min(max, Math.max(min, Math.round(raw / quantum) * quantum));
	}

	// The thumb sits in the row between the fill and the rest, so its centre
	// travels the track less its own width; a touch maps through the same span.
	function pick(x: number): void {
		const size = typeof thumb === "number" ? thumb : 0;
		const span = width - size;
		if (span <= 0) return;
		const ratio = Math.min(Math.max((x - size / 2) / span, 0), 1);
		onChange(settle(min + ratio * (max - min)));
	}

	// A drag reads `locationX` once, at the grant on the `box-only` track, and
	// follows the gesture's travel from there, since a moving finger's
	// `locationX` is relative to whatever view is under it.
	const latest = useRef({ pick, disabled });
	latest.current = { pick, disabled };
	const origin = useRef(0);
	const responder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => !latest.current.disabled,
			onMoveShouldSetPanResponder: () => !latest.current.disabled,
			onPanResponderTerminationRequest: () => false,
			onPanResponderGrant: (event) => {
				origin.current = event.nativeEvent.locationX;
				setPressed(true);
				latest.current.pick(origin.current);
			},
			onPanResponderMove: (_, gesture) =>
				latest.current.pick(origin.current + gesture.dx),
			onPanResponderRelease: () => setPressed(false),
			onPanResponderTerminate: () => setPressed(false),
		}),
	).current;

	function adjust(event: AccessibilityActionEvent): void {
		const delta = event.nativeEvent.actionName === "increment" ? 1 : -1;
		onChange(settle(value + delta * quantum));
	}

	const formatted = formatterFor(
		"number",
		undefined,
		unit ? { style: "unit", unit } : {},
	).format(value);
	const active = pressed && !disabled;
	return (
		<View className={cn(SLIDER, "justify-center")}>
			<View
				className={cn(SLIDER_HEAD, "flex-row items-center justify-between")}
			>
				<RNText
					numberOfLines={1}
					className={cn(
						SLIDER_LABEL,
						"shrink",
						disabled && "text-ink-disabled",
					)}
				>
					{label}
				</RNText>
				<RNText className={cn(SLIDER_VALUE, disabled && "text-ink-disabled")}>
					{formatted}
				</RNText>
			</View>
			<View
				accessible
				accessibilityRole="adjustable"
				accessibilityLabel={label}
				accessibilityState={{ disabled }}
				accessibilityValue={{ min, max, now: value, text: formatted }}
				accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
				onAccessibilityAction={disabled ? undefined : adjust}
				pointerEvents="box-only"
				onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
				className={cn(SLIDER_TRACK, "flex-row items-center")}
				{...responder.panHandlers}
			>
				<View
					className={cn(
						SLIDER_FILL,
						"grow",
						active && "bg-toggle-on-hover",
						disabled && "bg-ink-disabled",
					)}
					style={{ flexGrow: value - min }}
				/>
				<View
					className={cn(
						SLIDER_THUMB,
						"relative shrink-0 overflow-hidden",
						disabled && "border-edge bg-fill-disabled",
					)}
				>
					{active ? <View className="absolute inset-0 bg-wash-press" /> : null}
				</View>
				<View
					className={cn(SLIDER_REST, "grow")}
					style={{ flexGrow: max - value }}
				/>
			</View>
		</View>
	);
}
