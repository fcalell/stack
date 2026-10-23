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
import type { Ref } from "react";
import { PAINT_BOX, Painted } from "../../lib/paint.tsx";
import { useWords } from "../../lib/words.tsx";
import { StatusDot } from "./dot.tsx";

const BOX = "inline-flex items-center min-w-0 max-w-full";
const WORD = "truncate";
const DOT = "shrink-0";
// A word that does not fit stands out of the flow and unseen, whole as it is, so
// it keeps its width to be measured and stays in the row's content for a screen
// reader: the dot alone is what is drawn (a list row's first mark, `bare`).
const BARE = "relative";
const WORD_BARE = "absolute end-0 w-max opacity-0 pointer-events-none";

/** What every status draws: the public `Status`, or `painted` (the dot's box and, unless `bare`, a word's filler while the status's data is not here, inert). A list row's status is `bare` where its word does not fit beside the text group's floor: the dot alone, the word kept for a screen reader and for the row to measure through `word`. A state chip (a status given its own word) is `compact` where a row holds it: the caption line between its hairlines. It is `round` where it stands in a pill of its own (a head's pick fact), so it nests as a pill inside it, or in a canvas's start or end node. Outside the package's exports. */
export function StatusBase(
	props:
		| {
				tone: Tone;
				label?: string;
				bare?: boolean;
				word?: Ref<HTMLSpanElement>;
				compact?: boolean;
				round?: boolean;
				painted?: never;
		  }
		| { painted: true; bare?: boolean },
) {
	const words = useWords();
	if (props.painted)
		return (
			<span inert className={cn(STATUS, BOX)}>
				<span
					aria-hidden
					className={cn(statusDot({ tone: "done" }), DOT, PAINT_BOX)}
				/>
				{props.bare ? null : (
					<span className={cn(STATUS_LABEL, WORD)}>
						<Painted role="word" />
					</span>
				)}
			</span>
		);
	const label = props.label ?? words[props.tone];
	// A status given its own word is a state chip: the state's soft fill under
	// the state's ink, no edge; its dot is the fill itself (a spinner stays).
	if (props.label !== undefined && !props.bare)
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
				{props.tone === "running" ? <StatusDot tone="running" /> : null}
				<span ref={props.word} className={cn(STATE_CHIP_LABEL, WORD)}>
					{label}
				</span>
			</span>
		);
	return (
		<span className={cn(STATUS, BOX, props.bare && BARE)}>
			<StatusDot tone={props.tone} />
			<span
				ref={props.word}
				className={cn(STATUS_LABEL, props.bare ? WORD_BARE : WORD)}
			>
				{label}
			</span>
		</span>
	);
}
