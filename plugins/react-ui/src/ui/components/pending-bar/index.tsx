import {
	type PendingRun,
	pendingRun,
	pendingShare,
	timeLeft,
} from "@fcalell/ui-core/clock";
import { cn } from "@fcalell/ui-core/cn";
import type { Act } from "@fcalell/ui-core/descriptors";
import {
	PENDING_BAR,
	PENDING_FILL,
	PENDING_LEFT,
	PENDING_ROW,
	PENDING_TRACK,
	text,
} from "@fcalell/ui-core/variants";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useClock } from "../../lib/clock.ts";
import type { Closed } from "../../lib/closed.ts";
import { useReducedMotion } from "../../lib/media.ts";
import { ReasonHostContext, usePressed } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { Button } from "../button/index.tsx";
import { Reason } from "../button/reason.tsx";
import { Spinner } from "../spinner/index.tsx";

// The bar over a blocked act's reason, at the end on the desktop; on touch
// the track stacks over the act as an ActionBar's acts do.
const BAR = "flex flex-col items-end touch:items-stretch";
const ROW = "flex items-center self-stretch touch:flex-col touch:items-stretch";
const TRACK = "relative flex items-center grow min-w-0 overflow-hidden";
// The elapsed share, its width the runtime fraction.
const FILL = "absolute bottom-0 left-0";
// The track's parts stand over the fill.
const SPINNER_SLOT = "relative flex shrink-0 text-ink-meta";
const SENTENCE = "relative min-w-0 grow truncate";
const LEFT = "relative shrink-0";

// The elapsed share, moving on its own from where the run stands to full at
// its end; the clock's tick redraws only the time left. Under reduced motion
// it steps with the clock instead, the share set once a tick.
function Fill(props: { run: PendingRun; now: number }) {
	const fill = useRef<HTMLSpanElement>(null);
	const { run } = props;
	const reduced = useReducedMotion();
	useLayoutEffect(() => {
		const at = Date.now();
		if (reduced || !fill.current || at >= run.end) return;
		const motion = fill.current.animate(
			[{ width: `${pendingShare(run, at) * 100}%` }, { width: "100%" }],
			{ duration: run.end - at, easing: "linear", fill: "forwards" },
		);
		return () => motion.cancel();
	}, [run, reduced]);
	const share = reduced ? pendingShare(run, props.now) : 1;
	return (
		<span
			ref={fill}
			aria-hidden
			className={cn(PENDING_FILL, FILL)}
			style={{ width: `${share * 100}%` }}
		/>
	);
}

/** Work the page waits on, in an ActionBar's place. To keep the bar's height while the server works, give the `ActionBar` a `pending`; a `PendingBar` alone is for a place that held no bar. */
export interface PendingBarProps extends Closed {
	/** What is happening, announced as it changes (a short phrase; truncates). */
	sentence: string;
	/** When the work ends: the track fills toward it and shows the time left; unset, a spinner turns. */
	until?: Date;
	/** The one act, a hairline Button beside the track; a blocked act's reason draws under the bar. */
	act?: Act;
}

/** One line on the group ground: the spinner, or a meta-ink line along the track's foot filling toward `until` with the time left beside the sentence, which alone is the live region; the act beside it on the desktop, under it on touch. */
export function PendingBar({ sentence, until, act }: PendingBarProps) {
	const end = until?.getTime();
	// The shared clock ticks the bar until its end, never past it.
	const now = useClock((at) => at, end ?? 0);
	const [run, setRun] = useState(() =>
		end === undefined ? undefined : pendingRun(end, now),
	);
	if (end !== undefined && run?.end !== end) setRun(pendingRun(end, now, run));
	const { touched } = useTouched();
	const blocked = act?.blocked;
	const [pressed, press] = usePressed(blocked);
	const host = useMemo(
		() => (blocked === undefined ? undefined : { press }),
		[blocked, press],
	);
	return (
		<div className={cn(PENDING_BAR, BAR)}>
			<div className={cn(PENDING_ROW, ROW)}>
				<div className={cn(PENDING_TRACK, TRACK)}>
					{end === undefined || run === undefined ? (
						<span className={SPINNER_SLOT}>
							<Spinner />
						</span>
					) : (
						<Fill run={run} now={now} />
					)}
					<span role="status" className={cn(text({ role: "body" }), SENTENCE)}>
						{sentence}
					</span>
					{end === undefined ? null : (
						<span className={cn(PENDING_LEFT, LEFT)}>{timeLeft(end, now)}</span>
					)}
				</div>
				{act ? (
					<ReasonHostContext value={host}>
						<Button
							act="secondary"
							label={act.label}
							onAct={act.onAct}
							loading={act.loading}
							blocked={blocked}
						/>
					</ReasonHostContext>
				) : null}
			</div>
			{blocked === undefined ? null : (
				<Reason shown={pressed || touched}>{blocked}</Reason>
			)}
		</div>
	);
}
