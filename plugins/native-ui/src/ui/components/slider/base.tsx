import type { Draft } from "@fcalell/plugin-api/tanstack-query";
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
import { PanResponder, Text as RNText, View } from "react-native";
import { useResolveClassNames } from "uniwind";
import { cn } from "../../lib/cn";
import { FieldDisabled } from "../../lib/field";
import { tokenPx } from "../../lib/frame";
import { inertProps, PAINT_CONTROL, PaintView } from "../../lib/paint";
import { useCSSVariable } from "../../lib/theme";
import type { SliderProps } from "./index";

/** The label, value and track every Slider renders, on the `draft` its host holds: a field hosts the draft of its slider and draws a rejection in its own line. Painted, the label stands and the value and the track are filled, at the same height. Outside the package's exports. */
export function SliderBase({
	label,
	draft,
	onChange,
	onCommit,
	min,
	max,
	step,
	unit,
}: Omit<SliderProps, "value"> & { draft: Draft<number> }) {
	const disabled = useContext(FieldDisabled);
	// A read that ended leaves the track with no value, blocked.
	const ended = draft.ended !== undefined;
	const painted = draft.painted && !ended;
	// Painted or ended, the thumb rests at the start: the value is the
	// placeholder.
	const at = draft.painted ? min : draft.value;
	const [pressed, setPressed] = useState(false);
	// The track's width, which only a touch reads, so its layout renders nothing.
	const width = useRef(0);
	const thumb = useResolveClassNames(SLIDER_THUMB).width;
	// The track stands on a body line (`SLIDER_TRACK`) and its hit box is the
	// target, centred on it: a slop of half the target's excess over the line
	// above and below, reaching over the gap and the inset and taking no room.
	const slop = Math.max(
		0,
		(tokenPx(useCSSVariable("--spacing-target")) -
			tokenPx(useCSSVariable("--spacing-line-body"))) /
			2,
	);
	const quantum = step ?? 1;
	const reached = useRef<number>(undefined);

	function settle(raw: number): number {
		return Math.min(max, Math.max(min, Math.round(raw / quantum) * quantum));
	}

	// The thumb sits in the row between the fill and the rest, so its centre
	// travels the track less its own width; a touch maps through the same span.
	function pick(x: number): void {
		const size = typeof thumb === "number" ? thumb : 0;
		const span = width.current - size;
		if (span <= 0) return;
		const ratio = Math.min(Math.max((x - size / 2) / span, 0), 1);
		const next = settle(min + ratio * (max - min));
		reached.current = next;
		draft.change(next);
		if (!ended) onChange(next);
	}

	// The thumb let go: the last value it reached is the one committed.
	function finish(): void {
		setPressed(false);
		const next = reached.current;
		reached.current = undefined;
		if (onCommit && next !== undefined) {
			draft.change(next, () => onCommit(next));
		}
	}

	// A drag reads `locationX` once, at the grant on the `box-only` track, and
	// follows the gesture's travel from there, since a moving finger's
	// `locationX` is relative to whatever view is under it.
	const latest = useRef({ pick, finish, disabled });
	latest.current = { pick, finish, disabled };
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
			onPanResponderRelease: () => latest.current.finish(),
			onPanResponderTerminate: () => latest.current.finish(),
		}),
	).current;

	const formatted = formatterFor(
		"number",
		undefined,
		unit ? { style: "unit", unit } : {},
	).format(at);
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
				<RNText
					numberOfLines={1}
					className={cn(
						SLIDER_VALUE,
						"shrink-0",
						disabled && "text-ink-disabled",
						draft.painted && "opacity-0",
					)}
				>
					{formatted}
				</RNText>
			</View>
			<PaintView
				painted={painted}
				{...inertProps(painted)}
				accessible
				accessibilityRole="adjustable"
				accessibilityLabel={label}
				accessibilityState={{ disabled: disabled || ended }}
				accessibilityValue={{ min, max, now: at }}
				pointerEvents="box-only"
				hitSlop={{ top: slop, bottom: slop }}
				onLayout={(event) => {
					width.current = event.nativeEvent.layout.width;
				}}
				className={cn(
					SLIDER_TRACK,
					"flex-row items-center",
					painted && PAINT_CONTROL,
				)}
				{...responder.panHandlers}
			>
				{painted ? null : (
					<>
						<View
							className={cn(
								SLIDER_FILL,
								"grow",
								active && "bg-toggle-on-hover",
								disabled && "bg-ink-disabled",
							)}
							style={{ flexGrow: at - min }}
						/>
						<View
							className={cn(
								SLIDER_THUMB,
								"relative shrink-0 overflow-hidden",
								disabled && "border-edge bg-fill-disabled",
								ended && "opacity-0",
							)}
						>
							{active ? (
								<View className="absolute inset-0 bg-wash-press" />
							) : null}
						</View>
						<View
							className={cn(SLIDER_REST, "grow", disabled && "bg-edge")}
							style={{ flexGrow: max - at }}
						/>
					</>
				)}
			</PaintView>
		</View>
	);
}
