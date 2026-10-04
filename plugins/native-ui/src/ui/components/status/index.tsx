import type { StatusState } from "@fcalell/ui-core/descriptors";
import type { Closed } from "../../lib/closed";
import { StatusBase } from "./base";

export interface StatusProps extends Closed {
	state: StatusState;
	label?: string;
}

// A dot in the state's colour beside its word in meta ink (a spinner in the
// accent ink in the dot's place while `running`), a mark: a status that
// moves is a `Picker` whose options carry states.
export function Status({ state, label }: StatusProps) {
	return <StatusBase state={state} label={label} />;
}
