import { Button as BaseButton } from "@base-ui/react/button";
import { isThenable } from "@fcalell/plugin-api/acts";
import { FIT, kindOf, NO_FAILURE } from "@fcalell/ui-core/action-bar";
import { cn } from "@fcalell/ui-core/cn";
import type { ChosenCount } from "@fcalell/ui-core/descriptors";
import { formatterFor } from "@fcalell/ui-core/format";
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
import { useState } from "react";
import type { Act } from "../../lib/act.ts";
import { type Acting, useAct } from "../../lib/act.ts";
import { ActInert, SubmitContext } from "../../lib/form.ts";
import { useTouch } from "../../lib/media.ts";
import { ReasonHostContext } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { PendingBar } from "../banner/pending.tsx";
import { ButtonBase } from "../button/base.tsx";
import { IconButtonBase } from "../button/glyph.tsx";
import { Reason } from "../button/reason.tsx";
import { MenuBase } from "../menu/base.tsx";
import { ActSheet } from "../sheet/act.tsx";
import type { ActionBarProps } from "./index.tsx";

// End: the acts at their width at the container's end, wrapped to a further
// row (the filled act last) when they need more than the container; on touch
// one act per row across the container, the filled act first. Full: one act per
// row across the container at the field's height at every density, the filled
// act first, so a column's ways in each read whole at its width.
const BAR: Record<ActionBarFit, string> = {
	end: "flex flex-col items-end touch:items-stretch",
	full: "flex flex-col",
};
const ACTS: Record<ActionBarFit, string> = {
	end: "flex flex-wrap items-center justify-end min-w-0 max-w-full touch:flex-col touch:items-stretch",
	full: "flex flex-col",
};

// On the desktop an `end` bar is one wrapping row: the acts at the end and the
// blocked act's reason, once it stands, at its start, beside them, so the row is
// as tall as the acts and no line is held. The acts come first in the tree and the row runs
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

// A selection bar is one row that wraps only when it must: the count, then the
// act that chooses every row while some stand unchosen and the icon that
// clears the choice, at its start, and the acts at its end (the more menu, then
// the filled act). The count sets tabular digits, so it moves only when its
// digits do.
const SELECTION = "flex flex-wrap items-center justify-between self-stretch";
const CHOSEN_ACTS = "flex items-center";
const COUNT = "flex items-center shrink-0";
const ALL =
	"inline-flex shrink-0 items-center whitespace-nowrap text-ink-meta hover:bg-wash-hover active:bg-wash-press";
const ALL_LABEL = "whitespace-nowrap";
const SENTENCE = "shrink-0 whitespace-nowrap tabular-nums";
const NUMBER = formatterFor("number");
/** What a docked foot gives the bar it draws; no app sets it, so it is outside `ActionBarProps`. */
export interface ActionBarInternal {
	/** The bar keeps the reason's line before a reason shows, so showing it never moves the act it describes. */
	kept?: boolean;
	/** The holder that hosts this bar's acts' run, when the bar is not the only host (a sheet holds its dismissal while its bar's act pends). Absent, the bar hosts its own. */
	acting?: Acting<number>;
	/** The read the filled act submits waits or stands still: the act paints, inert, in its loaded box. */
	painted?: boolean;
	/** The read the filled act submits has ended: the act stands blocked under this reason, the failed sentence or `words.missing`. The body already says why, so the bar draws the sentence on a press only, in a line it keeps from then on. */
	ended?: string;
	/** The filled act is its form's submit button, so Enter in a field presses it. */
	submits?: boolean;
}

function AllAct(props: { label: string; onAct: () => void }) {
	return (
		<BaseButton onClick={props.onAct} className={cn(ACTION_BAR_ALL, ALL)}>
			<span className={cn(text({ role: "meta" }), ALL_LABEL)}>
				{props.label}
			</span>
		</BaseButton>
	);
}

/** A selection bar's count, then the act that chooses every row while some stand unchosen and the one that clears the choice. */
function Count({ chosen }: { chosen: ChosenCount }) {
	const words = useWords();
	const { onAll } = chosen;
	const counts = {
		count: NUMBER.format(chosen.count),
		of: NUMBER.format(chosen.of),
	};
	const said =
		chosen.noun === undefined
			? filled(words.chosenOf, counts)
			: filled(words.chosenNounOf, { ...counts, noun: chosen.noun });
	return (
		<div className={cn(ACTION_BAR_CHOSEN, COUNT)}>
			<span role="status" className={cn(text({ role: "meta" }), SENTENCE)}>
				{said}
			</span>
			{onAll && chosen.count < chosen.of ? (
				<AllAct label={words.chooseAll} onAct={() => onAll(true)} />
			) : null}
			{onAll && chosen.count > 0 ? (
				<IconButtonBase
					icon="X"
					label={words.chooseNone}
					onClick={() => onAll(false)}
				/>
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
	const words = useWords();
	const touch = useTouch();
	// A docked foot's bar keeps its own line (`kept`), so it stands in a column;
	// so does a selection bar's, under its one row.
	const beside = !(touch || kept || chosen) && where === "end";
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
	const { touched, leave } = useTouched();
	// The reason a blocked act was pressed under: the press stands while that act
	// is blocked by it (`pressStands`).
	const [pressedUnder, setPressedUnder] = useState<string>();
	const pressed = pressStands(ended, pressedUnder);
	// A blocked act waits for a touch: inert and silent until it is pressed, or
	// until its form or sheet has taken input; then its reason stands, in the line
	// a failure would draw in (the pressed act's, else the last blocked act's).
	// The filled act's, once its read ended, is the body's and draws on a press
	// alone.
	const reasoned = ended === undefined ? acts : acts.slice(0, -1);
	const reason = reasoned.findLast((act) => act.blocked !== undefined)?.blocked;
	const pressedReason = reasoned.some((act) =>
		pressStands(act.blocked, pressedUnder),
	)
		? pressedUnder
		: undefined;
	const standing = pressedReason ?? (touched ? reason : undefined);
	// The line is drawn only once a reason stands, in answer to the viewer's
	// press or input, so a blocked act takes no room before then; once drawn
	// the bar keeps it. Beside the acts the reason holds no line; only the
	// ended read's sentence, drawn on a press, is kept.
	const said = (beside ? undefined : standing) ?? (pressed ? ended : undefined);
	if (said !== undefined && held !== said) setHeld(said);
	const lastAt = acts.length - 1;
	// The tree holds the acts in drawn order, so Tab follows it: a stack (on
	// touch, or `full`) draws the filled act first.
	const ordered = acts.map((act, at) => [act, at] as const);
	const drawn = touch || where === "full" ? ordered.toReversed() : ordered;
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
	const button = ([act, at]: readonly [Act, number], ghost: boolean) => {
		const last = at === lastAt;
		const running = acting.pending === at;
		return (
			<ReasonHostContext
				key={act.label}
				value={{ press: () => setPressedUnder(act.blocked) }}
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
	};
	const acted = (ghost: boolean) => (
		<div className={cn(ACTION_BAR_ACTS, ACTS[where])}>
			{drawn.map((entry) => button(entry, ghost))}
			{ghost ? null : <ActSheet acting={acting} of={(at) => acts[at]?.sheet} />}
		</div>
	);
	// A selection bar's acts: the filled act stands and the others fold into the
	// more menu, by rule and not by room, so the row is the same at every width.
	const primary = ordered.at(-1);
	const folded = ordered.slice(0, -1).map(([act]) => act);
	const chose = (ghost: boolean) => (
		<div className={cn(ACTION_BAR_ACTS, CHOSEN_ACTS)}>
			{folded.length > 0 ? (
				<MenuBase label={words.more} title={words.more} items={folded} />
			) : null}
			{primary ? button(primary, ghost) : null}
			{ghost ? null : <ActSheet acting={acting} of={(at) => acts[at]?.sheet} />}
		</div>
	);
	const buttons = (ghost: boolean) =>
		beside ? (
			<div className={cn(ACTION_BAR, BESIDE)}>
				{acted(ghost)}
				{standing === undefined ? null : (
					<div className={BESIDE_REASON}>
						<Reason shown end>
							{standing}
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
			{chosen ? (
				<div className={cn(ACTION_BAR_CHOSEN, SELECTION)}>
					<Count chosen={chosen} />
					{chose(ghost)}
				</div>
			) : (
				buttons(ghost)
			)}
			{!(held !== undefined || kept || acting.line !== undefined) ? null : (
				<Reason
					kept
					failed={
						acting.line === undefined
							? standing === undefined && !pressed
							: acting.pending === undefined && !pressed
					}
					shown={
						acting.line !== undefined ||
						(!beside && standing !== undefined) ||
						pressed
					}
				>
					{acting.line ??
						(beside ? undefined : standing) ??
						(pressed ? ended : undefined) ??
						held ??
						NO_FAILURE}
				</Reason>
			)}
		</div>
	);
	// Nothing chosen, or nothing to choose: no bar.
	if (chosen && (chosen.count === 0 || chosen.of === 0)) return null;
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
