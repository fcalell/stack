import { Button as BaseButton } from "@base-ui/react/button";
import { isThenable } from "@fcalell/plugin-api/acts";
import { FIT, kindOf, NO_FAILURE } from "@fcalell/ui-core/action-bar";
import { cn } from "@fcalell/ui-core/cn";
import type { ChosenCount } from "@fcalell/ui-core/descriptors";
import { pressStands } from "@fcalell/ui-core/reason";
import { filled } from "@fcalell/ui-core/tokens";
import {
	ACTION_BAR,
	ACTION_BAR_ACTS,
	ACTION_BAR_ALL,
	ACTION_BAR_CHOSEN,
	ACTION_BAR_SELECTION,
	type ActionBarFit,
	text,
} from "@fcalell/ui-core/variants";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Act } from "../../lib/act.ts";
import { type Acting, useAct } from "../../lib/act.ts";
import { ActInert, SubmitContext } from "../../lib/form.ts";
import { useTouch } from "../../lib/media.ts";
import { REASON_AT_REST, ReasonHostContext } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { PendingBar } from "../banner/pending.tsx";
import { ButtonBase } from "../button/base.tsx";
import { Reason } from "../button/reason.tsx";
import { MenuBase } from "../menu/base.tsx";
import { ActSheet } from "../sheet/act.tsx";
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
	full: "flex *:grow *:basis-0 touch:flex-col touch:*:grow-0 touch:*:basis-auto",
};
// A selection bar's row: the count at the start and the acts at the end, or
// at `full` and on touch the count over the acts. The row spans the bar, so
// the count keeps the start while the reasons under it stay at the end.
const ROW: Record<ActionBarFit, string> = {
	end: "flex items-center justify-between self-stretch touch:flex-col touch:items-stretch",
	full: "flex flex-col self-stretch",
};

// On the desktop an `end` bar is one wrapping row: the acts at the end and the
// last blocked act's reason at its start, beside them, so the row is as tall as
// the acts and no line is held. The acts come first in the tree and the row runs
// in reverse, so a reason too long for the row's room wraps to a line under the
// acts. The reason takes the room the acts leave and reads at its end, next to
// them.
const BESIDE =
	"flex flex-row-reverse flex-wrap items-center min-w-0 max-w-full";
const BESIDE_REASON = "grow min-w-0 max-w-full";

// A pending bar stands over the bar it replaces: the loaded bar holds the
// row's height at every density and wrap, unseen, inert and out of the tree
// readers walk, and the pending bar fills that box.
const HOLD = "relative self-stretch";
const OVER = "absolute inset-0";
const GHOST = "invisible";

// The count and its choose and clear acts stand a pair apart at the row's
// start; an act is words washed at the pointer, the one that does not apply
// (every row chosen, none chosen) in the disabled ink and still focusable, so
// the focus a press leaves is not lost as the other applies.
const COUNT =
	"relative flex flex-wrap items-center min-w-0 shrink-10000000 touch:flex-nowrap";
const ALL = "shrink-0 whitespace-nowrap";
const ALL_LABEL = "whitespace-nowrap";
const ALL_LIVE =
	"inline-flex items-center text-ink-meta hover:bg-wash-hover active:bg-wash-press";
const ALL_INERT = "inline-flex items-center text-ink-disabled";
// On touch the count row is one line: the count keeps its whole sentence and the
// choose and clear acts stand whole beside it or fold, both, into a more menu.
// A folded act stays in the row out of the flow, unseen, so it keeps its width
// and the decision is a function of the row's width alone.
const FOLDED = "absolute w-max opacity-0 pointer-events-none";
const SENTENCE = "shrink-0 whitespace-nowrap";
/** What a docked foot gives the bar it draws; no app sets it, so it is outside `ActionBarProps`. */
export interface ActionBarInternal {
	/** The bar keeps the reason's line before a reason shows, so showing it never moves the act it describes. */
	kept?: boolean;
	/** The holder that hosts this bar's acts' run, when the bar is not the only host (a sheet holds its dismissal while its bar's act pends). Absent, the bar hosts its own. */
	acting?: Acting<number>;
	/** The read the filled act submits waits or stands still: the act paints, inert, in its loaded box. */
	painted?: boolean;
	/** The read the filled act submits has ended: the act stands blocked under this reason, the failed sentence or `words.missing`. The body already says why, so the bar keeps its line unseen and draws the sentence on a press only. */
	ended?: string;
	/** The filled act is its form's submit button, so Enter in a field presses it. */
	submits?: boolean;
}

function AllAct(props: {
	label: string;
	applies: boolean;
	onAct: () => void;
	folded?: boolean;
}) {
	return (
		<BaseButton
			inert={props.folded}
			disabled={!props.applies}
			focusableWhenDisabled
			onClick={props.onAct}
			className={cn(
				ACTION_BAR_ALL,
				ALL,
				props.applies ? ALL_LIVE : ALL_INERT,
				props.folded && FOLDED,
			)}
		>
			<span className={cn(text({ role: "meta" }), ALL_LABEL)}>
				{props.label}
			</span>
		</BaseButton>
	);
}

/** A selection bar's count and the acts that choose or clear every row. */
function Count({ chosen }: { chosen: ChosenCount }) {
	const words = useWords();
	const touch = useTouch();
	const box = useRef<HTMLDivElement>(null);
	const [folded, setFolded] = useState(false);
	const { onAll } = chosen;
	const acts = onAll !== undefined && chosen.of > 0;
	useLayoutEffect(() => {
		const row = box.current;
		if (!row || !touch || !acts) {
			setFolded(false);
			return;
		}
		const measure = () => {
			const parts = Array.from(row.children).filter(
				(part): part is HTMLElement =>
					part instanceof HTMLElement && part.dataset.menu === undefined,
			);
			const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0;
			const whole =
				parts.reduce((sum, part) => sum + part.offsetWidth, 0) +
				gap * Math.max(0, parts.length - 1);
			setFolded(whole > row.clientWidth);
		};
		const resize = new ResizeObserver(measure);
		resize.observe(row);
		for (const part of row.children) resize.observe(part);
		measure();
		return () => resize.disconnect();
	}, [touch, acts]);
	const said =
		chosen.noun === undefined
			? filled(words.chosenOf, {
					count: String(chosen.count),
					of: String(chosen.of),
				})
			: filled(words.chosenNounOf, {
					count: String(chosen.count),
					of: String(chosen.of),
					noun: chosen.noun,
				});
	const entries: Act[] = [];
	if (onAll && chosen.count < chosen.of)
		entries.push({ label: words.chooseAll, onAct: () => onAll(true) });
	if (onAll && chosen.count > 0)
		entries.push({ label: words.chooseNone, onAct: () => onAll(false) });
	return (
		<div ref={box} className={cn(ACTION_BAR_CHOSEN, COUNT)}>
			<span role="status" className={cn(text({ role: "meta" }), SENTENCE)}>
				{said}
			</span>
			{acts ? (
				<>
					<AllAct
						label={words.chooseAll}
						applies={chosen.count < chosen.of}
						onAct={() => onAll(true)}
						folded={folded}
					/>
					<AllAct
						label={words.chooseNone}
						applies={chosen.count > 0}
						onAct={() => onAll(false)}
						folded={folded}
					/>
					{folded && entries.length > 0 ? (
						<span data-menu className="ms-auto">
							<MenuBase label={words.more} title={words.more} items={entries} />
						</span>
					) : null}
				</>
			) : null}
		</div>
	);
}

export function ActionBarBase({
	acts: offered,
	fit,
	chosen,
	pending,
	kept,
	acting: given,
	painted = false,
	ended,
	submits = false,
}: ActionBarProps & ActionBarInternal) {
	const where = fit ?? "end";
	const touch = useTouch();
	// A docked foot's bar keeps its own line (`kept`), so it stands in a column.
	const beside = !(touch || kept) && where === "end";
	const own = useAct<number>("line");
	// A failure draws in the bar's kept line, so it never moves the act; the
	// same line says the connection refused an act.
	const acting = given ?? own;
	// The filled act is the one a read's end blocks. Its sentence is the body's
	// already, so it draws on a press, not at rest.
	const acts =
		ended === undefined
			? offered
			: offered.map((act, at) =>
					at === offered.length - 1 ? { ...act, blocked: ended } : act,
				);
	// The reason this bar last drew: once a line has drawn the bar keeps its box.
	const [held, setHeld] = useState<string>();
	const { leave } = useTouched();
	const [pressedUnder, setPressedUnder] = useState<string>();
	const pressed = pressStands(ended, pressedUnder);
	const endedHost = useMemo(
		() => ({ press: () => setPressedUnder(ended) }),
		[ended],
	);
	// The last blocked act's reason stands at rest under the acts, in the line
	// a failure would draw in; the filled act's, once its read ended, does not.
	const reason = (ended === undefined ? acts : acts.slice(0, -1)).findLast(
		(act) => act.blocked !== undefined,
	)?.blocked;
	// Beside the acts the reason holds no line; only the ended read's sentence,
	// drawn on a press, is kept.
	const said = beside ? ended : (reason ?? ended);
	if (said !== undefined && held !== said) setHeld(said);
	const lastAt = acts.length - 1;
	// The tree holds the acts in drawn order, so Tab follows it: on touch the
	// stack draws the filled act first.
	const ordered = acts.map((act, at) => [act, at] as const);
	const drawn = touch ? ordered.toReversed() : ordered;
	// The press ends the form's edit before the filled act runs, so an act that
	// navigates is not asked; a rejection puts the edit back.
	const ending = (run: () => unknown) => () => {
		leave.press();
		let ran: unknown;
		try {
			ran = run();
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
			...act,
			onAct: at === lastAt && act.onAct ? ending(act.onAct) : act.onAct,
		});
	// The bar under a `PendingBar` is drawn with no act that submits or presses.
	const acted = (ghost: boolean) => (
		<div className={cn(ACTION_BAR_ACTS, ACTS[where])}>
			{drawn.map(([act, at]) => {
				const last = at === lastAt;
				const running = acting.pending === at;
				return (
					<ReasonHostContext
						key={act.label}
						value={last && ended !== undefined ? endedHost : REASON_AT_REST}
					>
						<SubmitContext value={!ghost && last && submits}>
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
					</ReasonHostContext>
				);
			})}
			{ghost ? null : <ActSheet acting={acting} of={(at) => acts[at]?.sheet} />}
		</div>
	);
	const buttons = (ghost: boolean) =>
		beside ? (
			<div className={cn(ACTION_BAR, BESIDE)}>
				{acted(ghost)}
				{reason === undefined ? null : (
					<div className={BESIDE_REASON}>
						<Reason shown end>
							{reason}
						</Reason>
					</div>
				)}
			</div>
		) : (
			acted(ghost)
		);
	// One act clears the rows while any are chosen, one chooses every row while
	// some stand unchosen; the table's head tick is the second where it stands, and the
	// bar cannot tell which form the table drew in its own column, so both stand.
	const bar = (ghost: boolean) => (
		<div className={cn(ACTION_BAR, BAR[where], chosen && ACTION_BAR_SELECTION)}>
			{beside || reason === undefined ? null : <Reason shown>{reason}</Reason>}
			{chosen ? (
				<div className={cn(ACTION_BAR_CHOSEN, ROW[where])}>
					<Count chosen={chosen} />
					{buttons(ghost)}
				</div>
			) : (
				buttons(ghost)
			)}
			{reason !== undefined ||
			!(held !== undefined || kept || acting.line !== undefined) ? null : (
				<Reason
					kept
					failed={acting.pending === undefined && !pressed}
					shown={acting.line !== undefined || pressed}
				>
					{acting.line ?? held ?? NO_FAILURE}
				</Reason>
			)}
		</div>
	);
	if (pending === undefined) return bar(false);
	return (
		<div className={HOLD}>
			<div inert aria-hidden className={GHOST}>
				{bar(true)}
			</div>
			<div className={OVER}>
				<PendingBar {...pending} />
			</div>
		</div>
	);
}
