import type { Act, ChosenCount } from "@fcalell/ui-core/descriptors";
import type { ActionBarFit } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed";
import type { PendingBarProps } from "../pending-bar";
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
	// The acts wait: a count of act-shaped bars, `true` standing for one (the
	// acts are unknown before the read, so give `acts` as `[]`). A number from 1
	// is the count of acts the bar will hold, and 0 or `false` is not waiting,
	// so `loading={rows?.length}` reads the loaded bar at 0. Unset, a loading
	// `Group` or `Section` around it makes it wait, as one act: it hands down a
	// boolean, so set the count on the bar itself.
	loading?: boolean | number;
	// The server works on a decision: a `PendingBar` takes the bar's place at
	// the bar's own loaded height, the acts kept under it unseen and out of
	// reach. A `PendingBar` alone is for a place that held no bar. A pending
	// form taller than the bar (its own `act` on a one-act bar) overlays what
	// stands below it.
	pending?: PendingBarProps;
}

// The acts that close a form, a sheet or a confirm, stacked across the
// container with the filled act on top. A Pane's `foot` docks it; a Form
// or a Sheet keeps it in flow. A promise the filled act's
// `onAct` returns keeps it pending until it settles, and the others ignore
// the press meanwhile. The last blocked act's reason stands at rest under the
// acts, so the act keeps its row and stretches as a live one does. With `chosen` the count
// stands over the acts at the bar's start.
export function ActionBar(bar: ActionBarProps) {
	return <ActionBarBase {...bar} />;
}
