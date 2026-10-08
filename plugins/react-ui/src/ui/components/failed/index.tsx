import type { Act } from "@fcalell/ui-core/descriptors";
import type { Closed } from "../../lib/closed.ts";
import { EmptyStateBase } from "../empty-state/base.tsx";

/** What a page, a Section or a Group says of a read that failed, with the act that tries it again. */
export interface FailedProps extends Closed {
	/** What failed to load, over the act (a sentence; wraps). */
	sentence: string;
	/** The way to try again: an act that runs a function, never a link. */
	act: Act;
}

/** The EmptyState's failed form: the alert mark in the danger ink, the sentence at meta and the act as the hairline one with no plus, never the create act; its frame decided by where it stands, as an EmptyState's. A `QueryBoundary` draws it itself for a failed query; this is for a read that is no query (a mutation that opens a file) and says what to try again. */
export function Failed({ sentence, act }: FailedProps) {
	return <EmptyStateBase tone="failed" sentence={sentence} act={act} />;
}
