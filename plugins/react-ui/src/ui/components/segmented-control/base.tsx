import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { useDraft } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import {
	SEGMENTED_CONTROL,
	segment,
	segmentLabel,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import { GroupName } from "../../lib/field.ts";
import { PAINT_CONTROL } from "../../lib/paint.tsx";
import type { SegmentedControlProps } from "./index.tsx";

// The track shrinks to its room and the segments with it, so a label that
// cannot fit truncates; where they fit, the labels stay whole. It hugs its
// segments in a column too (a FormField), never stretching to the field.
const TRACK = "inline-flex min-w-0 max-w-full items-center w-fit";
// A segment rings inset, so the ring clears its neighbours; an idle one
// washes under the pointer and the press, the chosen one a step darker.
const SEGMENT =
	"relative inline-flex min-w-0 items-center justify-center focus-visible:-outline-offset-2";
const IDLE = "hover:bg-wash-hover active:bg-wash-press";
const CHOSEN = "hover:bg-wash-selected-hover";
const LABEL = "truncate";

/** The group every SegmentedControl renders. `painted` is the track while its data is not here: one filled box at its loaded size, the segments not drawn, inert. Outside the package's exports. */
export function SegmentedControlBase({
	label,
	options,
	value,
	onChange,
	painted: given,
}: SegmentedControlProps & { painted?: boolean }) {
	const draft = useDraft(value);
	const painted = given || draft.painted;
	const chosenValue = painted ? "" : draft.value;
	// A FormField around it names it with its visible label.
	const named = use(GroupName);
	return (
		<RadioGroup
			aria-label={named ? undefined : label}
			aria-labelledby={named?.labelledBy}
			value={chosenValue}
			onValueChange={(next) => {
				draft.change(next as string);
				onChange(next as string);
			}}
			inert={painted || undefined}
			className={cn(
				SEGMENTED_CONTROL,
				TRACK,
				painted && cn(PAINT_CONTROL, "*:invisible"),
			)}
		>
			{options.map((option) => {
				const chosen = option.value === chosenValue;
				const state = chosen ? "selected" : "idle";
				return (
					<Radio.Root
						key={option.value}
						value={option.value}
						nativeButton
						render={<button type="button" />}
						className={cn(segment({ state }), SEGMENT, chosen ? CHOSEN : IDLE)}
					>
						<span className={cn(segmentLabel({ state }), LABEL)}>
							{option.label}
						</span>
					</Radio.Root>
				);
			})}
		</RadioGroup>
	);
}
