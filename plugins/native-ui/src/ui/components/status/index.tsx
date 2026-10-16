import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { StatusState } from "@fcalell/ui-core/descriptors";
import type { Closed } from "../../lib/closed";
import { StatusBase } from "./base";

export interface StatusProps extends Closed {
	/** The state the mark and the default word name. A selection paints the mark, which takes no touch, until its read lands. */
	state: Datum<StatusState>;
	/** The word, when the state's own word does not say it (a word; truncates when its line is out of room). A selection paints the mark like a `state` does. */
	label?: Datum<string | undefined>;
}

// A dot in the state's colour beside its word in meta ink (a spinner in the
// accent ink in the dot's place while `running`), a mark: a status that
// moves is a `Picker` whose options carry states.
export function Status({ state, label }: StatusProps) {
	const [mark, word] = useSelections([state, label]);
	if (paints(mark) || paints(word)) return <StatusBase painted />;
	// An ended read draws no mark; the frame that holds it says why.
	if (mark.painted || word.painted) return null;
	return <StatusBase state={mark.value} label={word.value} />;
}
