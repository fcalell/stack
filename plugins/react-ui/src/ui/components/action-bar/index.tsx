import type { Act, ChosenCount } from "@fcalell/ui-core/descriptors";
import type { ActionBarFit } from "@fcalell/ui-core/variants";
import type { Closed } from "../../lib/closed.ts";
import type { PendingBarProps } from "../pending-bar/index.tsx";
import { ActionBarBase } from "./base.tsx";

/** The acts that close a form, a sheet or a confirm, or that apply to the rows chosen in a list. */
export interface ActionBarProps extends Closed {
	/** The acts in reading order, the one filled act last. Inside a `Form` the filled act submits it. A promise the filled act's `onAct` returns keeps it pending until it settles. */
	acts: Act[];
	/** Where the bar stands: at its container's end (the default), or across it with each act at the field's height (a `Gate`'s form draws its bar so). */
	fit?: ActionBarFit;
	/** A selection bar's count, "N of M chosen" at meta at the bar's start (a `Table`'s `choose` set against its rows), with `onAll` a deselect-all act beside it and, below `tablet` of the page where the `Table` draws no head tick, a select-all act; the act's label and its blocked reason stay the act's. Docked as a `Place`'s `foot`, its count and acts in a column centred in the foot, no wider than a table-wide bar. */
	chosen?: ChosenCount;
	/** The acts wait: a count of act-shaped bars, `true` standing for one (the acts are unknown before the read, so give `acts` as `[]`). A number from 1 is the count of acts the bar will hold, and 0 or `false` is not waiting, so `loading={rows?.length}` reads the loaded bar at 0. Unset, a loading `Group` or `Section` around it makes it wait, as one act: it hands down a boolean, so set the count on the bar itself. */
	loading?: boolean | number;
	/** The server works on a decision: a `PendingBar` takes the bar's place at the bar's own loaded height, so nothing below it moves when `pending` is set or cleared. The acts stay drawn under it, unseen and out of reach. A `PendingBar` alone is for a place that held no bar. */
	pending?: PendingBarProps;
}

/** The acts row over a blocked act's reason, beside a selection count when `chosen` is set; while one act is pending the others ignore the press. */
export function ActionBar(bar: ActionBarProps) {
	return <ActionBarBase {...bar} />;
}
