import type { StatusState } from "@fcalell/ui-core/tokens";
import type { Closed } from "../../lib/closed.ts";
import { StatusBase } from "./base.tsx";

/** A work state: a dot in the state's colour beside its word. */
export interface StatusProps extends Closed {
	/** The state the dot's colour and the default word name. */
	state: StatusState;
	/** The word, when the state's own word does not say it. */
	label?: string;
}

/** A dot and a word, a mark: a status that moves is a `Picker` whose options carry states. */
export function Status({ state, label }: StatusProps) {
	return <StatusBase state={state} label={label} />;
}
