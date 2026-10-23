import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import type { LinkSegment } from "@fcalell/ui-core/descriptors";
import { tuned } from "@fcalell/ui-core/paint";
import { linkAt } from "@fcalell/ui-core/pick";
import {
	SEGMENT_GROUND,
	SEGMENTED_CONTROL,
	segment,
	segmentLabel,
} from "@fcalell/ui-core/variants";
import { useContext, useEffect, useRef, useState } from "react";
import {
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	Text as RNText,
	ScrollView,
} from "react-native";
import { LinearTransition, ReduceMotion } from "react-native-reanimated";
import { useHeldDraft } from "../../lib/act";
import { cn } from "../../lib/cn";
import { GroupName } from "../../lib/field";
import { curve, FadingView } from "../../lib/motion";
import { open, usePathname } from "../../lib/navigate";
import { inertProps, PAINT_CONTROL, PaintView } from "../../lib/paint";
import { Press } from "../../lib/press";
import type { PickerSegmentsProps } from "./index";

// The segments keep their natural width and a label is never cut for room (a
// single label stops at the short measure, as any word does): where they do
// not fit the track's room the row scrolls sideways with no indicator, as a
// phone's tab row does, and the chosen segment is scrolled into view. The
// track hugs its segments and clips the row to its rounded ground.
const TRACK = "self-start min-w-0 max-w-full overflow-hidden";
const ROW = "relative flex-row items-center";
const SEGMENT = "relative flex-row shrink-0 items-center justify-center";
// An idle segment takes the press wash; the chosen one stays apart by its
// body ink.
const WASH = "rounded-control bg-wash-press";
const LABEL = "shrink max-w-measure-short";
// The ground stands under the chosen segment, in the track.
const GROUND = "absolute inset-y-0";

interface Box {
	x: number;
	width: number;
}

// The group every Picker in `fit: segments` over choices renders: segments flush on the group
// ground, the chosen one under the selection wash in body ink, the others in
// meta ink: a radio group. The wash is one ground that slides to the segment
// chosen, by a layout transition, as its place and width change. A FormField
// around it names it with its visible label. It draws the `draft` its host
// holds: a field hosts the draft of its segments and draws a rejection in its
// own line. `painted` is the track while its data is not here: one filled box
// at its loaded size, the segments not drawn, inert. Outside the package's
// exports.
export function SegmentsBase<V extends string = string>({
	label,
	options,
	draft,
	onChange,
	painted: given,
}: Pick<PickerSegmentsProps<V>, "label" | "options" | "onChange"> & {
	draft: Draft<V>;
	painted?: boolean;
}) {
	// A read that ended leaves the track with no segment chosen, blocked.
	const ended = draft.ended !== undefined;
	const painted = given || (draft.painted && !ended);
	const named = useContext(GroupName);
	// Each segment's place in the track, which the ground stands at.
	const [boxes, setBoxes] = useState<Record<string, Box>>({});
	const under = painted || ended ? undefined : boxes[draft.value];
	// The row's scroll and the track's width, which the chosen segment is
	// brought into: whole in view, by the row's own scroll, never an ancestor's.
	const row = useRef<ScrollView>(null);
	const scrolled = useRef(0);
	const [room, setRoom] = useState(0);
	const shown = useRef(false);
	useEffect(() => {
		if (!under || room === 0) return;
		const at = scrolled.current;
		const target =
			under.x < at
				? under.x
				: under.x + under.width > at + room
					? under.x + under.width - room
					: undefined;
		// The first place it stands is where the row opens; a later choice
		// scrolls to it.
		if (target !== undefined)
			row.current?.scrollTo({ x: target, animated: shown.current });
		shown.current = true;
	}, [under, room]);
	return (
		<PaintView
			painted={painted}
			{...inertProps(painted === true)}
			accessibilityRole="radiogroup"
			accessibilityLabel={named?.label ?? label}
			className={cn(SEGMENTED_CONTROL, TRACK, painted && PAINT_CONTROL)}
		>
			<ScrollView
				ref={row}
				horizontal
				showsHorizontalScrollIndicator={false}
				scrollEnabled={!painted}
				scrollEventThrottle={16}
				onLayout={({ nativeEvent: { layout } }) => setRoom(layout.width)}
				onScroll={({
					nativeEvent,
				}: NativeSyntheticEvent<NativeScrollEvent>) => {
					scrolled.current = nativeEvent.contentOffset.x;
				}}
				contentContainerClassName={ROW}
			>
				{under ? (
					<FadingView
						pointerEvents="none"
						layout={LinearTransition.duration(tuned.base)
							.easing(curve("in-out"))
							.reduceMotion(ReduceMotion.System)}
						style={{ left: under.x, width: under.width }}
						className={cn(SEGMENT_GROUND, GROUND)}
					/>
				) : null}
				{options.map((option) => {
					const chosen = !(painted || ended) && option.value === draft.value;
					const state = chosen ? "selected" : "idle";
					return (
						<Press
							key={String(option.value)}
							accessibilityRole="radio"
							accessibilityLabel={option.label}
							accessibilityState={{ checked: chosen, disabled: ended }}
							onLayout={({ nativeEvent: { layout } }) =>
								setBoxes((now) => {
									const was = now[option.value];
									if (was?.x === layout.x && was.width === layout.width)
										return now;
									return {
										...now,
										[option.value]: { x: layout.x, width: layout.width },
									};
								})
							}
							onPress={() => {
								draft.change(option.value, () => onChange(option.value));
							}}
							wash={chosen || painted ? undefined : WASH}
							give={!painted}
							className={cn(
								segment({ state }),
								SEGMENT,
								painted && "opacity-0",
							)}
						>
							<RNText
								numberOfLines={1}
								className={cn(segmentLabel({ state }), LABEL)}
							>
								{option.label}
							</RNText>
						</Press>
					);
				})}
			</ScrollView>
		</PaintView>
	);
}

// Segments over choices that hold their own draft, as a bare one does; a
// rejection toasts. `painted` forces the painted track. Outside the package's
// exports.
export function HeldSegments<V extends string = string>({
	label,
	options,
	value,
	onChange,
	painted,
}: Omit<PickerSegmentsProps<V>, "fit"> & {
	fit?: "segments";
	painted?: boolean;
}) {
	return (
		<SegmentsBase<V>
			label={label}
			options={options}
			draft={useHeldDraft<V>(value)}
			onChange={onChange}
			painted={painted}
		/>
	);
}

// Segments over links, the tabs of a place: the same row, its value the
// route's path (expo-router's pathname), the segment whose href is that path
// or its nearest parent chosen, a press opening the href. Outside the
// package's exports.
export function LinkSegments({ options }: { options: readonly LinkSegment[] }) {
	const chosen = linkAt(options, usePathname());
	return (
		<HeldSegments
			label=""
			options={options.map(({ href, label }) => ({ value: href, label }))}
			value={chosen?.href ?? ""}
			onChange={open}
		/>
	);
}
