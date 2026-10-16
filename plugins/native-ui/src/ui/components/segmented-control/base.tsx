import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import {
	SEGMENTED_CONTROL,
	segment,
	segmentLabel,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { useHeldDraft } from "../../lib/act";
import { cn } from "../../lib/cn";
import { GroupName } from "../../lib/field";
import { inertProps, paintControl, useShown } from "../../lib/paint";
import type { SegmentedControlProps } from "./index";

// The track shrinks to its room and the segments with it, so a label that
// cannot fit truncates; where they fit, the labels stay whole.
const TRACK = "flex-row self-start items-center min-w-0 max-w-full";
const SEGMENT = "relative flex-row min-w-0 items-center justify-center";
// An idle segment takes the press wash; the chosen one stays apart by its
// body ink.
const IDLE = "active:bg-wash-press";
const LABEL = "shrink";

// The group every SegmentedControl renders: segments flush on the group
// ground, the chosen one under the selection wash in body ink, the others in
// meta ink: a radio group. A FormField around it names it with its visible
// label. It draws the `draft` its host holds: a field hosts the draft of its
// segments and draws a rejection in its own line. `painted` is the track while its data is not here: one filled box at
// its loaded size, the segments not drawn, inert. Outside the package's exports.
export function SegmentedControlBase({
	label,
	options,
	draft,
	onChange,
	painted: given,
}: Omit<SegmentedControlProps, "value"> & {
	draft: Draft<string>;
	painted?: boolean;
}) {
	// A read that ended leaves the track with no segment chosen, blocked.
	const ended = draft.ended !== undefined;
	const painted = given || (draft.painted && !ended);
	const named = useContext(GroupName);
	const shown = useShown(painted);
	return (
		<View
			{...inertProps(painted === true)}
			accessibilityRole="radiogroup"
			accessibilityLabel={named?.label ?? label}
			className={cn(SEGMENTED_CONTROL, TRACK, painted && paintControl(shown))}
		>
			{options.map((option) => {
				const chosen = !(painted || ended) && option.value === draft.value;
				const state = chosen ? "selected" : "idle";
				return (
					<Pressable
						key={option.value}
						accessibilityRole="radio"
						accessibilityLabel={option.label}
						accessibilityState={{ checked: chosen, disabled: ended }}
						onPress={() => {
							draft.change(option.value, () => onChange(option.value));
						}}
						className={cn(
							segment({ state }),
							SEGMENT,
							!chosen && IDLE,
							painted && "opacity-0",
						)}
					>
						<RNText
							numberOfLines={1}
							className={cn(segmentLabel({ state }), LABEL)}
						>
							{option.label}
						</RNText>
					</Pressable>
				);
			})}
		</View>
	);
}

// A SegmentedControl that holds its own draft, as a bare one does; a rejection
// toasts. Outside the package's exports.
export function HeldSegmentedControl({
	label,
	options,
	value,
	onChange,
	painted,
}: SegmentedControlProps & { painted?: boolean }) {
	return (
		<SegmentedControlBase
			label={label}
			options={options}
			draft={useHeldDraft(value)}
			onChange={onChange}
			painted={painted}
		/>
	);
}
