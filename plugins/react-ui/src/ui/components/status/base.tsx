import { cn } from "@fcalell/ui-core/cn";
import type { Tone } from "@fcalell/ui-core/tokens";
import {
	PILL_COMPACT,
	STATE_CHIP_LABEL,
	STATUS,
	STATUS_LABEL,
	stateChip,
	statusDot,
} from "@fcalell/ui-core/variants";
import { PAINT_BOX, Painted } from "../../lib/paint.tsx";
import { useWords } from "../../lib/words.tsx";
import { StatusDot } from "./dot.tsx";

const BOX = "inline-flex items-center min-w-0 max-w-full";
const WORD = "truncate";
const DOT = "shrink-0";
/** What every status draws: the public `Status`, or `painted` (the dot's box and a word's filler while the status's data is not here, inert). A state chip (a status given its own word) is `compact` where a row holds it: the caption line between its hairlines. It is `round` where it stands in a pill of its own (a head's pick fact), so it nests as a pill inside it, or in a canvas's start or end node. Outside the package's exports. */
export function StatusBase(
	props:
		| {
				tone: Tone;
				label?: string;
				compact?: boolean;
				round?: boolean;
				painted?: never;
		  }
		| { painted: true },
) {
	const words = useWords();
	if (props.painted)
		return (
			<span inert className={cn(STATUS, BOX)}>
				<span
					aria-hidden
					className={cn(statusDot({ tone: "done" }), DOT, PAINT_BOX)}
				/>
				<span className={cn(STATUS_LABEL, WORD)}>
					<Painted role="word" />
				</span>
			</span>
		);
	const label = props.label ?? words[props.tone];
	// A status given its own word is a state chip: the state's dot (the spinner
	// while running) and word on the state's soft fill under its hairline.
	if (props.label !== undefined)
		return (
			<span
				className={cn(
					stateChip({ tone: props.tone }),
					props.compact && PILL_COMPACT,
					props.round && "rounded-full",
					STATUS,
					BOX,
				)}
			>
				<StatusDot tone={props.tone} />
				<span className={cn(STATE_CHIP_LABEL, WORD)}>{label}</span>
			</span>
		);
	return (
		<span className={cn(STATUS, BOX)}>
			<StatusDot tone={props.tone} />
			<span className={cn(STATUS_LABEL, WORD)}>{label}</span>
		</span>
	);
}
