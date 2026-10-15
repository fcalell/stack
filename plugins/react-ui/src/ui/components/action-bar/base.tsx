import { Button as BaseButton } from "@base-ui/react/button";
import { isThenable } from "@fcalell/plugin-api/acts";
import type { Selection } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { Act } from "@fcalell/ui-core/descriptors";
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
import { useState } from "react";
import { type Acting, useAct } from "../../lib/act.ts";
import { ActInert, SubmitContext } from "../../lib/form.ts";
import { useTouch } from "../../lib/media.ts";
import { useWaits } from "../../lib/read.tsx";
import { REASON_AT_REST, ReasonHostContext } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { ButtonBase } from "../button/base.tsx";
import { Reason } from "../button/reason.tsx";
import { PendingBar } from "../pending-bar/index.tsx";
import type { ActionBarProps } from "./index.tsx";

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
const COUNT = "flex flex-wrap items-center min-w-0 shrink-10000000";
const ALL = "min-w-0 max-w-full";
const ALL_LABEL = "truncate";
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

/** What a docked foot gives the bar it draws; no app sets it, so it is outside `ActionBarProps`. */
export interface ActionBarInternal {
	/** The bar keeps the reason's line before a reason shows, so showing it never moves the act it describes. */
	kept?: boolean;
	/** The holder that hosts this bar's acts' run, when the bar is not the only host (a sheet holds its dismissal while its bar's act pends). Absent, the bar hosts its own. */
	acting?: Acting<number>;
	/** The reads the filled act's data is: it paints, inert, in its loaded box while any waits (a form's, its groups' and its sheet's). */
	waits?: readonly (Selection<unknown> | undefined)[];
	/** The filled act is its form's submit button, so Enter in a field presses it. */
	submits?: boolean;
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
			<span className={cn(text({ role: "meta" }), ALL_LABEL)}>
				{props.label}
			</span>
		</BaseButton>
	);
}

export function ActionBarBase({
	acts,
	fit,
	chosen,
	pending,
	kept,
	acting: given,
	waits,
	submits = false,
}: ActionBarProps & ActionBarInternal) {
	const where = fit ?? "end";
	const touch = useTouch();
	const words = useWords();
	const own = useAct<number>("line");
	// A failure draws in the bar's kept line, so it never moves the act; the
	// same line says an act waits for a connection.
	const acting = given ?? own;
	const painted = useWaits(waits);
	// The reason this bar last drew: once a line has drawn the bar keeps its box.
	const [held, setHeld] = useState<string>();
	const { leave } = useTouched();
	// The last blocked act's reason stands at rest under the acts, in the line
	// a failure would draw in.
	const reason = acts.findLast((act) => act.blocked !== undefined)?.blocked;
	if (reason !== undefined && held !== reason) setHeld(reason);
	const lastAt = acts.length - 1;
	// The tree holds the acts in drawn order, so Tab follows it: on touch the
	// stack draws the filled act first.
	const ordered = acts.map((act, at) => [act, at] as const);
	const drawn = touch ? ordered.toReversed() : ordered;
	// The press ends the form's edit before the filled act runs, so an act that
	// navigates is not asked; a rejection puts the edit back.
	const ending = (act: Act) => () => {
		leave.press();
		let ran: unknown;
		try {
			ran = act.onAct();
		} catch (error) {
			leave.settle(true);
			throw error;
		}
		if (!isThenable(ran)) {
			leave.settle(false);
			return ran;
		}
		return Promise.resolve(ran).then(
			(done) => {
				leave.settle(false);
				return done;
			},
			(error: unknown) => {
				leave.settle(true);
				throw error;
			},
		);
	};
	const press = (act: Act, at: number) =>
		acting.run(at, {
			onAct: at === lastAt ? ending(act) : act.onAct,
			failed: act.failed,
		});
	// The bar under a `PendingBar` is drawn with no act that submits or presses.
	const buttons = (ghost: boolean) => (
		<ReasonHostContext value={REASON_AT_REST}>
			<div className={cn(ACTION_BAR_ACTS, ACTS[where])}>
				{drawn.map(([act, at]) => {
					const last = at === lastAt;
					const running = acting.pending === at;
					return (
						<SubmitContext key={act.label} value={!ghost && last && submits}>
							<ActInert value={ghost || (acting.holds && !running)}>
								<ButtonBase
									act={kindOf(act, last)}
									fit={FIT[where]}
									label={act.label}
									onAct={() => press(act, at)}
									pending={running}
									blocked={act.blocked}
									painted={last && painted}
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
			!(held !== undefined || kept || acting.line !== undefined) ? null : (
				<Reason
					kept
					failed={acting.pending === undefined}
					shown={acting.line !== undefined}
				>
					{acting.line ?? held ?? NO_FAILURE}
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
