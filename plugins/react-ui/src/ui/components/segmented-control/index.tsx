import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { cn } from "@fcalell/ui-core/cn";
import {
	SEGMENTED_CONTROL,
	segment,
	segmentLabel,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { GroupName } from "../../lib/field.ts";

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

/** One of a segmented control's options. */
export interface Segment {
	value: string;
	label: string;
}

/** A view switch over two to four options, one chosen. */
export interface SegmentedControlProps extends Closed {
	/** What the options switch, names the group. */
	label: string;
	/** The options in order. */
	options: readonly Segment[];
	/** The chosen option's value. */
	value: string;
	/** Hears the chosen option's value. */
	onChange: (value: string) => void;
}

/** Segments flush on the group ground, the chosen one under the selection wash in body ink, the others in meta ink. A radio group: the arrow keys move the choice. */
export function SegmentedControl({
	label,
	options,
	value,
	onChange,
}: SegmentedControlProps) {
	// A FormField around it names it with its visible label.
	const named = use(GroupName);
	return (
		<RadioGroup
			aria-label={named ? undefined : label}
			aria-labelledby={named?.labelledBy}
			value={value}
			onValueChange={(next) => onChange(next as string)}
			className={cn(SEGMENTED_CONTROL, TRACK)}
		>
			{options.map((option) => {
				const chosen = option.value === value;
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
