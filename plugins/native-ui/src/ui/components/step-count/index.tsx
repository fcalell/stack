import { filled, stepStateOf } from "@fcalell/ui-core/tokens";
import {
	STEP_COUNT,
	STEP_COUNT_SEGMENTS,
	stepCountSegment,
	text,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useWords } from "../../lib/words";

const STACK = "min-w-0";
const SEGMENTS = "flex-row";
const SEGMENT = "flex-1";

export interface StepCountProps extends Closed {
	// The current step, counted from one.
	at: number;
	// How many steps the flow has, two to four.
	of: number;
}

// One segment per step at the meter's height, the steps up to the current one
// in the meta ink and the later ones a wash, over "Step n of m" at meta. An
// accessible view is one element, so its label is the sentence its words draw.
export function StepCount({ at, of }: StepCountProps) {
	const words = useWords();
	const sentence = filled(words.stepOf, { at: String(at), of: String(of) });
	return (
		<View
			accessible
			accessibilityRole="image"
			accessibilityLabel={sentence}
			className={cn(STEP_COUNT, STACK)}
		>
			<View className={cn(STEP_COUNT_SEGMENTS, SEGMENTS)}>
				{Array.from({ length: of }, (_, index) => index + 1).map((step) => (
					<View
						key={step}
						className={cn(
							stepCountSegment({ state: stepStateOf(step, at) }),
							SEGMENT,
						)}
					/>
				))}
			</View>
			<RNText className={text({ role: "meta" })}>{sentence}</RNText>
		</View>
	);
}
