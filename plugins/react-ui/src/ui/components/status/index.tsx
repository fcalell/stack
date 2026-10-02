import { cn } from "@fcalell/ui-core/cn";
import type { StatusState } from "@fcalell/ui-core/tokens";
import { STATUS, STATUS_LABEL } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";
import { useWords } from "../../lib/words.tsx";
import { StatusDot } from "./dot.tsx";

const BOX = "inline-flex items-center min-w-0";
const WORD = "truncate";

/** A work state: a dot in the state's colour beside its word. */
export interface StatusProps extends Closed {
	/** The state the dot's colour and the default word name. */
	state: StatusState;
	/** The word, when the state's own word does not say it. */
	label?: string;
}

/** A dot and a word, a mark: a status that moves is a `Picker` whose options carry states. */
export function Status({ state, label }: StatusProps) {
	const words = useWords();
	return (
		<span className={cn(STATUS, BOX)}>
			<StatusDot state={state} />
			<span className={cn(STATUS_LABEL, WORD)}>{label ?? words[state]}</span>
		</span>
	);
}
