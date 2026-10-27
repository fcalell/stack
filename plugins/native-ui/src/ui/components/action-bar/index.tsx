import type { ChosenCount } from "@fcalell/ui-core/descriptors";
import type { ActionBarFit } from "@fcalell/ui-core/variants";
import type { Act } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import type { PendingBarProps } from "../banner/pending";
import { ActionBarBase } from "./base";

export interface ActionBarProps extends Closed {
	acts: Act[];
	// Where the bar stands: at its container's end (the default), or across it
	// (a `Gate`'s form draws its bar so).
	fit?: ActionBarFit;
	// A selection bar's count, "N of M chosen" at meta over the acts (a
	// `Table`'s `choose` set against its rows), with
	// `onAll` a select-all and a deselect-all act beside it. Docked as a
	// `Pane`'s `foot`, its column centred in it.
	chosen?: ChosenCount;
	// The server works on a decision: a pending bar takes the bar's place at
	// the bar's own loaded height, the acts kept under it unseen and out of
	// reach. A pending
	// form taller than the bar (its own `act` on a one-act bar) overlays what
	// stands below it.
	pending?: PendingBarProps;
}

// The acts that close a form, a sheet or a confirm, stacked across the
// container with the filled act on top. A Pane's `foot` docks it; a Form
// or a Sheet keeps it in flow. A promise an act's `onAct`
// returns keeps it pending until it settles, and the others ignore the press
// meanwhile; a rejection stands in the bar's line under the acts, the act ready
// again. A blocked act is silent until it is pressed or its form or sheet
// has taken input; then its reason stands under the acts, in a line the bar
// draws then and keeps, so the act keeps its row and stretches as a live one does. With `chosen` the count
// stands over the acts at the bar's start.
export function ActionBar(bar: ActionBarProps) {
	return <ActionBarBase {...bar} />;
}
