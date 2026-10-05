import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type { Act, ChosenCount } from "@fcalell/ui-core/descriptors";
import { pressStands } from "@fcalell/ui-core/reason";
import { filled } from "@fcalell/ui-core/tokens";
import {
	ACTION_BAR_ACTS,
	ACTION_BAR_CHOSEN,
	type ActionBarFit,
	actionBar,
	type ButtonAct,
	type ButtonFit,
	PILL_ACT,
	text,
} from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	use,
	useCallback,
	useId,
	useMemo,
	useState,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { ActInert, FormContext, SubmitContext } from "../../lib/form.ts";
import { useTouch } from "../../lib/media.ts";
import { ReasonHostContext } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { Reason } from "../button/reason.tsx";

// End: the acts at their width at the container's end. Full: the acts share
// the container's width at the field's height. On touch both stack one act
// per row across the container, the filled act first.
const BAR: Record<ActionBarFit, string> = {
	end: "flex flex-col items-end touch:items-stretch",
	full: "flex flex-col",
};
const ACTS: Record<ActionBarFit, string> = {
	end: "flex items-center justify-end touch:flex-col touch:items-stretch",
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

// The count and its all-or-clear act stand a pair apart at the row's start; the
// act is words in a pill, washed at the pointer.
const COUNT = "flex items-center";
const ALL =
	"inline-flex items-center text-ink-meta hover:bg-wash-hover active:bg-wash-press";

// The last act is the one filled act; a destructive act draws `danger`
// filled and the hairline `destructive` otherwise.
function kindOf(act: Act, last: boolean): ButtonAct {
	if (act.destructive) return last ? "danger" : "destructive";
	return last ? "primary" : "secondary";
}

/** The acts that close a form, a sheet or a confirm, or that apply to the rows chosen in a list. */
export interface ActionBarProps extends Closed {
	/** The acts in reading order, the one filled act last. Inside a `Form` the filled act submits it. A promise the filled act's `onAct` returns keeps it pending until it settles. */
	acts: Act[];
	/** Where the bar stands: at its container's end (the default), or across it with each act at the field's height. */
	fit?: ActionBarFit;
	/** A selection bar's count, "N of M chosen" at meta at the bar's start (a `Table`'s `choose` set against its rows), announced as it changes, with `onAll` a select-all or deselect-all act beside it on touch (the desktop `Table`'s head tick is that act); the act's label and its blocked reason stay the act's. Docked as a `Place`'s `foot`. */
	chosen?: ChosenCount;
}

// An act's reason host: the same object while the act stays blocked by one
// reason, so the act under it renders only when its own props change.
function ActHost(props: {
	id: string;
	label: string;
	blocked: string | undefined;
	press: (label: string, reason: string) => void;
	children: ReactNode;
}) {
	const { id, label, blocked, press } = props;
	const host = useMemo(
		() =>
			blocked === undefined
				? undefined
				: { id, press: () => press(label, blocked) },
		[id, label, blocked, press],
	);
	return <ReasonHostContext value={host}>{props.children}</ReasonHostContext>;
}

/** The acts row over a blocked act's reason, beside a selection count when `chosen` is set; while one act is pending the others ignore the press. */
export function ActionBar({ acts, fit, chosen }: ActionBarProps) {
	const where = fit ?? "end";
	const touch = useTouch();
	const words = useWords();
	const pend = use(FormContext);
	const [running, setRunning] = useState(false);
	const { touched } = useTouched();
	const reason = useId();
	// Each blocked act's press, by label, as the reason it came under: it
	// stands while the act is blocked by that reason
	// (`@fcalell/ui-core/reason`).
	const [pressed, setPressed] = useState<ReadonlyMap<string, string>>(
		new Map(),
	);
	const press = useCallback(
		(label: string, reason: string) =>
			setPressed((was) => new Map(was).set(label, reason)),
		[],
	);
	const busy = running || acts.some((act) => act.loading);
	const lastAt = acts.length - 1;
	// The tree holds the acts in drawn order, so Tab follows it: on touch the
	// stack draws the filled act first.
	const ordered = acts.map((act, at) => [act, at] as const);
	const drawn = touch ? ordered.toReversed() : ordered;
	const runFilled = () => {
		const ran = acts[lastAt]?.onAct();
		if (!(ran instanceof Promise)) return;
		setRunning(true);
		pend?.(true);
		// Settled either way, so a failing act leaves no derived promise to
		// reject unhandled: its rejection stays the caller's.
		const done = () => {
			setRunning(false);
			pend?.(false);
		};
		void ran.then(done, done);
	};
	const buttons = (
		<div className={cn(ACTION_BAR_ACTS, ACTS[where])}>
			{drawn.map(([act, at]) => {
				const last = at === lastAt;
				const loading = act.loading === true || (last && running);
				const run = last ? runFilled : act.onAct;
				return (
					<ActHost
						key={act.label}
						id={`${reason}-${at}`}
						label={act.label}
						blocked={act.blocked}
						press={press}
					>
						<SubmitContext value={last && pend !== undefined}>
							<ActInert value={busy && !loading}>
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
					</ActHost>
				);
			})}
		</div>
	);
	// The act chooses every row while some stand unchosen and clears them once
	// all are. On touch only: a desktop table has its head tick for it.
	const every = chosen !== undefined && chosen.count >= chosen.of;
	const all =
		touch && chosen?.onAll !== undefined && chosen.of > 0 ? (
			<BaseButton
				onClick={() => chosen.onAll?.(!every)}
				className={cn(PILL_ACT, ALL)}
			>
				<span className={text({ role: "meta" })}>
					{every ? words.chooseNone : words.chooseAll}
				</span>
			</BaseButton>
		) : null;
	return (
		<div className={cn(actionBar({ fit: where }), BAR[where])}>
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
					{buttons}
				</div>
			) : (
				buttons
			)}
			{acts.map((act, at) =>
				act.blocked === undefined ? null : (
					<Reason
						key={act.label}
						id={`${reason}-${at}`}
						shown={touched || pressStands(act.blocked, pressed.get(act.label))}
					>
						{act.blocked}
					</Reason>
				),
			)}
		</div>
	);
}
