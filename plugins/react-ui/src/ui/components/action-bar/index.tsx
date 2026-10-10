import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type { Act, ChosenCount } from "@fcalell/ui-core/descriptors";
import { waitCount } from "@fcalell/ui-core/list-state";
import { filled } from "@fcalell/ui-core/tokens";
import {
	ACTION_BAR_ACTS,
	ACTION_BAR_ALL,
	ACTION_BAR_CHOSEN,
	ACTION_BAR_SELECTION,
	type ActionBarFit,
	actionBar,
	type ButtonAct,
	type ButtonFit,
	text,
} from "@fcalell/ui-core/variants";
import { use, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import {
	ActInert,
	FormContext,
	FormStands,
	SubmitContext,
} from "../../lib/form.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { useTouch } from "../../lib/media.ts";
import {
	ActFailed,
	REASON_AT_REST,
	ReasonHostContext,
	ReasonKept,
} from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { Reason } from "../button/reason.tsx";
import { PendingBar, type PendingBarProps } from "../pending-bar/index.tsx";
import { ActionBarWait } from "./wait.tsx";

// End: the acts at their width at the container's end, wrapped to a further
// row (the filled act last) when they need more than the container. Full: the
// acts share the container's width at the field's height. On touch both stack
// one act per row across the container, the filled act first.
const BAR: Record<ActionBarFit, string> = {
	end: "flex flex-col items-end touch:items-stretch",
	full: "flex flex-col",
};
const ACTS: Record<ActionBarFit, string> = {
	end: "flex flex-wrap items-center justify-end min-w-0 max-w-full touch:flex-col touch:items-stretch",
	full: "grid grid-flow-col auto-cols-fr touch:flex touch:flex-col",
};
const FIT: Record<ActionBarFit, ButtonFit> = { end: "body", full: "field" };
// A selection bar's row: the count at the start and the acts at the end, or
// at `full` and on touch the count over the acts. The row spans the bar, so
// the count keeps the start while the reasons under it stay at the end.
const ROW: Record<ActionBarFit, string> = {
	end: "flex items-center justify-between self-stretch touch:flex-col touch:items-stretch",
	full: "flex flex-col self-stretch",
};

// A pending bar and the bar it stands over share one cell, so the cell is the
// loaded bar's height at every density and wrap; the loaded bar stays under it
// unseen, inert and out of the tree readers walk.
const HOLD = "grid grid-cols-1";
const CELL = "col-start-1 row-start-1";
const GHOST = "invisible";

// The count and its choose and clear acts stand a pair apart at the row's
// start; an act is words washed at the pointer, the one that does not apply
// (every row chosen, none chosen) in the disabled ink and still focusable, so
// the focus a press leaves is not lost as the other applies.
const COUNT = "flex flex-wrap items-center";
const ALL = "shrink-0 whitespace-nowrap";
const ALL_LIVE =
	"inline-flex items-center text-ink-meta hover:bg-wash-hover active:bg-wash-press";
const ALL_INERT = "inline-flex items-center text-ink-disabled";
// The choose-all act stands where the table has no head tick: below `tablet`
// of the page, the width the table collapses to its list form at.
const CHOOSE_ALL = "page-tablet:hidden";

// A kept failure line's text while nothing failed: a no-break space holds the
// line's height.
const NO_FAILURE = " ";

// The last act is the one filled act; a destructive act draws `danger`
// filled and the hairline `destructive` otherwise.
function kindOf(act: Act, last: boolean): ButtonAct {
	if (act.destructive) return last ? "danger" : "destructive";
	if (act.quiet && !last) return "quiet";
	return last ? "primary" : "secondary";
}

/** The acts that close a form, a sheet or a confirm, or that apply to the rows chosen in a list. */
export interface ActionBarProps extends Closed {
	/** The acts in reading order, the one filled act last. Inside a `Form` the filled act submits it. A promise the filled act's `onAct` returns keeps it pending until it settles. */
	acts: Act[];
	/** Where the bar stands: at its container's end (the default), or across it with each act at the field's height (the default inside a `Gate`). */
	fit?: ActionBarFit;
	/** A selection bar's count, "N of M chosen" at meta at the bar's start (a `Table`'s `choose` set against its rows), with `onAll` a deselect-all act beside it and, below `tablet` of the page where the `Table` draws no head tick, a select-all act; the act's label and its blocked reason stay the act's. Docked as a `Place`'s `foot`, its count and acts in a column centred in the foot, no wider than a table-wide bar. */
	chosen?: ChosenCount;
	/** The acts wait: a count of act-shaped bars, `true` standing for one (the acts are unknown before the read, so give `acts` as `[]`). A number from 1 is the count of acts the bar will hold, and 0 or `false` is not waiting, so `loading={rows?.length}` reads the loaded bar at 0. Unset, a loading `Group` or `Section` around it makes it wait, as one act: it hands down a boolean, so set the count on the bar itself. */
	loading?: boolean | number;
	/** The server works on a decision: a `PendingBar` takes the bar's place at the bar's own loaded height, so nothing below it moves when `pending` is set or cleared. The acts stay drawn under it, unseen and out of reach. A `PendingBar` alone is for a place that held no bar. */
	pending?: PendingBarProps;
}

function AllAct(props: {
	label: string;
	applies: boolean;
	onAct: () => void;
	/** The act stands only where the table draws no head tick. */
	noHeadTick?: boolean;
}) {
	return (
		<BaseButton
			disabled={!props.applies}
			focusableWhenDisabled
			onClick={props.onAct}
			className={cn(
				ACTION_BAR_ALL,
				ALL,
				props.applies ? ALL_LIVE : ALL_INERT,
				props.noHeadTick && CHOOSE_ALL,
			)}
		>
			<span className={text({ role: "meta" })}>{props.label}</span>
		</BaseButton>
	);
}

/** The acts row over a blocked act's reason, beside a selection count when `chosen` is set; while one act is pending the others ignore the press. */
export function ActionBar({
	acts,
	fit,
	chosen,
	loading,
	pending,
}: ActionBarProps) {
	// Inside a `Gate` a bar with no `fit` stands across the column.
	const where = fit ?? (use(FormStands) === "auth" ? "full" : "end");
	const touch = useTouch();
	const words = useWords();
	const pend = use(FormContext);
	const [running, setRunning] = useState(false);
	// The reason this bar last drew: once a line has drawn the bar keeps its box.
	const [held, setHeld] = useState<string>();
	const { leave } = useTouched();
	const kept = use(ReasonKept);
	const failed = use(ActFailed);
	// The last blocked act's reason stands at rest under the acts, in the line
	// a failure would draw in.
	const reason = acts.findLast((act) => act.blocked !== undefined)?.blocked;
	if (reason !== undefined && held !== reason) setHeld(reason);
	const busy = running || acts.some((act) => act.loading);
	const lastAt = acts.length - 1;
	const waits = waitCount(loading, use(LoadingContext), 1);
	if (waits !== undefined) return <ActionBarWait fit={where} count={waits} />;
	// The tree holds the acts in drawn order, so Tab follows it: on touch the
	// stack draws the filled act first.
	const ordered = acts.map((act, at) => [act, at] as const);
	const drawn = touch ? ordered.toReversed() : ordered;
	const runFilled = () => {
		// The press ends the form's edit before the act runs, so an act that
		// navigates is not asked; a rejection puts the edit back.
		leave.press();
		let ran: unknown;
		try {
			ran = acts[lastAt]?.onAct();
		} catch (error) {
			leave.settle(true);
			throw error;
		}
		if (!(ran instanceof Promise)) {
			leave.settle(false);
			return;
		}
		setRunning(true);
		pend?.(true);
		// Settled either way, so a failing act leaves no derived promise to
		// reject unhandled: its rejection stays the caller's.
		const done = (rejected: boolean) => () => {
			leave.settle(rejected);
			setRunning(false);
			pend?.(false);
		};
		void ran.then(done(false), done(true));
	};
	// The bar under a `PendingBar` is drawn with no act that submits or presses.
	const buttons = (ghost: boolean) => (
		<ReasonHostContext value={REASON_AT_REST}>
			<div className={cn(ACTION_BAR_ACTS, ACTS[where])}>
				{drawn.map(([act, at]) => {
					const last = at === lastAt;
					const loading = act.loading === true || (last && running);
					const run = last ? runFilled : act.onAct;
					return (
						<SubmitContext
							key={act.label}
							value={!ghost && last && pend !== undefined}
						>
							<ActInert value={ghost || (busy && !loading)}>
								<Button
									act={kindOf(act, last)}
									fit={FIT[where]}
									label={act.label}
									onAct={run}
									loading={loading}
									blocked={act.blocked}
								/>
							</ActInert>
						</SubmitContext>
					);
				})}
			</div>
		</ReasonHostContext>
	);
	// One act clears the rows while any are chosen, one chooses every row while
	// some stand unchosen; the table's head tick is the second where it stands.
	const onAll = chosen?.onAll;
	const all =
		chosen !== undefined && onAll !== undefined && chosen.of > 0 ? (
			<>
				<AllAct
					label={words.chooseAll}
					applies={chosen.count < chosen.of}
					onAct={() => onAll(true)}
					noHeadTick
				/>
				<AllAct
					label={words.chooseNone}
					applies={chosen.count > 0}
					onAct={() => onAll(false)}
				/>
			</>
		) : null;
	const bar = (ghost: boolean) => (
		<div
			className={cn(
				actionBar({ fit: where }),
				BAR[where],
				chosen && ACTION_BAR_SELECTION,
			)}
		>
			{chosen ? (
				<div className={cn(ACTION_BAR_CHOSEN, ROW[where])}>
					<div className={cn(ACTION_BAR_CHOSEN, COUNT)}>
						<span role="status" className={text({ role: "meta" })}>
							{filled(words.chosenOf, {
								count: String(chosen.count),
								of: String(chosen.of),
							})}
						</span>
						{all}
					</div>
					{buttons(ghost)}
				</div>
			) : (
				buttons(ghost)
			)}
			{reason === undefined ? null : <Reason shown>{reason}</Reason>}
			{reason !== undefined ||
			!(held !== undefined || kept || failed !== undefined) ? null : (
				<Reason kept failed shown={failed !== undefined}>
					{failed ?? held ?? NO_FAILURE}
				</Reason>
			)}
		</div>
	);
	if (pending === undefined) return bar(false);
	return (
		<div className={HOLD}>
			<div inert aria-hidden className={cn(CELL, GHOST)}>
				{bar(true)}
			</div>
			<div className={CELL}>
				<PendingBar {...pending} />
			</div>
		</div>
	);
}
