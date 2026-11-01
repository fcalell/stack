import { cn } from "@fcalell/ui-core/cn";
import type { ReactNode } from "react";

// A text line of parts a middle dot apart (a record head's overline, a
// message's provenance): one text that never breaks at a separator. The dot is
// bound to the word before it and the word after it by no-break spaces, so a
// line breaks only between the words of a part. A box beside a no-break space
// still takes a break, so the caller draws a part's code inline (`RunText`
// `whole`). Where the line is cut at its end (an overline, truncating) or set
// to its end, nothing marks a line's start for a dot to be clipped at. Facts
// are no such text: a row's, a head's and a node's status are badges
// (`BadgesLine`), which have no separator.
export type PartsForm = "flow";

// The dot of one text, bound to the words beside it.
const BOUND = " · ";

/** Parts a middle dot apart as one text (`flow`); `led` gives the first part a dot too, for parts that follow other items on their line. The parts are the line's children, so the caller draws the line's box and `className` styles each part (the text role). Outside the package's exports. */
export function PartsLine(props: {
	parts: readonly ReactNode[];
	form: PartsForm;
	led?: boolean;
	className?: string;
}) {
	const { parts, led = false, className } = props;
	return parts.map((part, at) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: the parts are one line, in order; a part is its position
		<span key={at} className={cn(className)}>
			{led || at > 0 ? BOUND : null}
			{part}
		</span>
	));
}
