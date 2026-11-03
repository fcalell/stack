import type { ChosenCount } from "@fcalell/ui-core/descriptors";
import type { ActionBarFit } from "@fcalell/ui-core/variants";
import type { Act } from "../../lib/act.ts";
import type { Closed } from "../../lib/closed.ts";
import type { PendingBarProps } from "../banner/pending.tsx";
import { ActionBarBase } from "./base.tsx";

/** The acts that close a form, a sheet or a confirm, or that apply to the rows chosen in a list. */
export interface ActionBarProps extends Closed {
	/** The acts in reading order, the one filled act last. Inside a `Form` the filled act submits it. A promise an act's `onAct` returns keeps it pending until it settles, the others inert meanwhile; a rejection stands in the bar's line under the acts (the server's refusal, else the act's `failed`, else "That didn't go through."), the act ready again. */
	acts: Act[];
	/** Where the bar stands: at its container's end (the default), or across it, one act per row at the field's height and the filled act first, at every density (a `Gate`'s form draws its bar so). */
	fit?: ActionBarFit;
	/** A selection bar: one row at the bar's column, with the count, "N of M chosen" at meta, its numbers formatted, at its start (a `Table`'s `choose` set against its rows), then, with `onAll`, a select-all act while the ticked are fewer than `of` and a clear icon while any are ticked, and at its end the more menu holding every act but the last, then the filled act. It draws nothing while no row is ticked or `of` is 0. The route gives it to the `Pane`'s `foot`, where it stands in the body's column (the reading width, the Pane's width with `wide`) at its start, so it keeps the rows' grid; `of` is the rows that can be ticked, and `onAll` hears the set to choose (every one of them, or none). */
	chosen?: ChosenCount;
	/** The server works on a decision: a pending bar takes the bar's place at the bar's own loaded height, so nothing below it moves when `pending` is set or cleared. The acts stay drawn under it, unseen and out of reach. */
	pending?: PendingBarProps;
}

/** The acts row over a blocked act's reason, beside a selection count when `chosen` is set; while one act is pending the others ignore the press. It holds its acts' run. A blocked act is silent until it is pressed, or until the form or sheet it stands in has taken input; then its reason stands. */
export function ActionBar(bar: ActionBarProps) {
	return <ActionBarBase {...bar} />;
}
