import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { Tone } from "@fcalell/ui-core/tokens";
import type { Closed } from "../../lib/closed.ts";
import { StatusBase } from "./base.tsx";

/** A work state: a dot in the state's colour beside its word, a spinner in the accent ink in the dot's place while `running`. */
export interface StatusProps extends Closed {
	/** The state the mark and the default word name. A selection paints the mark, and the Status is inert, until its read lands. */
	tone: Datum<Tone>;
	/** The word, when the state's own word does not say it (a word; truncates when its line is out of room). A selection paints the mark like a `tone` does. */
	label?: Datum<string | undefined>;
}

/** A dot and a word, a mark: a status that moves is a `Picker` whose options carry states. */
export function Status({ tone, label }: StatusProps) {
	const [mark, word] = useSelections([tone, label]);
	if (paints(mark) || paints(word)) return <StatusBase painted />;
	// An ended read draws no mark; the frame that holds it says why.
	if (mark.painted || word.painted) return null;
	return <StatusBase tone={mark.value} label={word.value} />;
}
