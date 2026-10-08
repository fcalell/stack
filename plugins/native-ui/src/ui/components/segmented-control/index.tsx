import {
	SEGMENTED_CONTROL,
	segment,
	segmentLabel,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { GroupName } from "../../lib/field";

// The track shrinks to its room and the segments with it, so a label that
// cannot fit truncates; where they fit, the labels stay whole.
const TRACK = "flex-row self-start items-center min-w-0 max-w-full";
const SEGMENT = "relative flex-row min-w-0 items-center justify-center";
// An idle segment takes the press wash; the chosen one stays apart by its
// body ink.
const IDLE = "active:bg-wash-press";
const LABEL = "shrink";

export interface Segment {
	value: string;
	/** The option's text (a word; truncates). */
	label: string;
}

export interface SegmentedControlProps extends Closed {
	/** What the options switch, the group's name (a short phrase; read aloud, never drawn). */
	label: string;
	options: readonly Segment[];
	value: string;
	onChange: (value: string) => void;
}

// Segments flush on the group ground, the chosen one under the selection
// wash in body ink, the others in meta ink: a radio group. A FormField
// around it names it with its visible label.
export function SegmentedControl({
	label,
	options,
	value,
	onChange,
}: SegmentedControlProps) {
	const named = useContext(GroupName);
	return (
		<View
			accessibilityRole="radiogroup"
			accessibilityLabel={named?.label ?? label}
			className={cn(SEGMENTED_CONTROL, TRACK)}
		>
			{options.map((option) => {
				const chosen = option.value === value;
				const state = chosen ? "selected" : "idle";
				return (
					<Pressable
						key={option.value}
						accessibilityRole="radio"
						accessibilityLabel={option.label}
						accessibilityState={{ checked: chosen }}
						onPress={() => onChange(option.value)}
						className={cn(segment({ state }), SEGMENT, !chosen && IDLE)}
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
