import type { LinkAct } from "@fcalell/ui-core/descriptors";
import type { Closed } from "../../lib/closed.ts";
import { MissingBase } from "./base.tsx";

/** What a body says of what is not there, with a way back. */
export interface MissingProps extends Closed {
	/** What is not there; the `missing` word ("This no longer exists.") unless given (a sentence; wraps). */
	sentence?: string;
	/** The way back, an act to a route; Back to the enclosing Pane's `back`, else the Place's route unless given, none with neither. */
	act?: LinkAct;
}

/** The missing form: its rest ink with no mark, the sentence at meta in a hairline frame and the way back as the hairline act with no plus, never the create act and never Retry. A read that answers not found draws it itself; this is for a missing state decided from data or an address nothing serves. */
export function Missing({ sentence, act }: MissingProps) {
	return <MissingBase fit="frame" sentence={sentence} act={act} />;
}
