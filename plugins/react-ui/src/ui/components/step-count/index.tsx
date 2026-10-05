import { cn } from "@fcalell/ui-core/cn";
import { stepStateOf } from "@fcalell/ui-core/list-state";
import { filled } from "@fcalell/ui-core/tokens";
import {
	STEP_COUNT,
	STEP_COUNT_SEGMENTS,
	stepCountSegment,
	text,
} from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";
import { useWords } from "../../lib/words.tsx";

const STACK = "flex flex-col min-w-0";
const SEGMENTS = "flex";
const SEGMENT = "flex-1";

/** Where an onboarding flow stands in its steps. */
export interface StepCountProps extends Closed {
	/** The current step, counted from one. */
	at: number;
	/** How many steps the flow has, two to four. */
	of: number;
}

/** One segment per step at the meter's height, the steps up to the current one in the meta ink and the later ones a wash, over "Step n of m" at meta, which names it to assistive tech. */
export function StepCount({ at, of }: StepCountProps) {
	const words = useWords();
	const sentence = filled(words.stepOf, { at: String(at), of: String(of) });
	return (
		// The role's children are presentational: the sentence is its name.
		<div role="img" aria-label={sentence} className={cn(STEP_COUNT, STACK)}>
			<div className={cn(STEP_COUNT_SEGMENTS, SEGMENTS)}>
				{Array.from({ length: of }, (_, index) => index + 1).map((step) => (
					<div
						key={step}
						className={cn(
							stepCountSegment({ state: stepStateOf(step, at) }),
							SEGMENT,
						)}
					/>
				))}
			</div>
			<span className={text({ role: "meta" })}>{sentence}</span>
		</div>
	);
}
