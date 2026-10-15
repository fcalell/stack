import type { Act } from "@fcalell/ui-core/descriptors";
import type { Closed } from "../../lib/closed";
import { EmptyBase } from "../../lib/empty";

export interface FailedProps extends Closed {
	/** What failed to load, over the act (a sentence; wraps). */
	sentence: string;
	// The way to try again: an act that runs a function, never a link.
	act: Act;
}

// The failed form: the alert mark in the danger ink, the sentence at meta and
// the act as the hairline one with no plus, never the create act, in a
// hairline frame. A frame draws it itself for a failed read; this is for a
// read that is no query (a mutation that opens a file) and says what to try
// again.
export function Failed({ sentence, act }: FailedProps) {
	return <EmptyBase fit="frame" tone="failed" sentence={sentence} act={act} />;
}
