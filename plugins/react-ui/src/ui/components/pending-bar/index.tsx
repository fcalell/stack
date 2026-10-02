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
import { useEffect, useId, useMemo, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { ReasonHostContext } from "../../lib/reason.ts";
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

const TICK_MS = 1000;

// The time left, minutes then seconds padded to two.
function clock(ms: number): string {
	const seconds = Math.max(0, Math.ceil(ms / 1000));
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Work the page waits on, in an ActionBar's place. */
export interface PendingBarProps extends Closed {
	/** What is happening, announced as it changes. */
	sentence: string;
	/** When the work ends: the track fills toward it and shows the time left; unset, a spinner turns. */
	until?: Date;
	/** The one act, a hairline Button beside the track; a blocked act's reason draws under the bar. */
	act?: Act;
}

/** One line on the group ground: the spinner, or a meta-ink line along the track's foot filling toward `until` with the time left beside the sentence, which alone is the live region; the act beside it on the desktop, under it on touch. */
export function PendingBar({ sentence, until, act }: PendingBarProps) {
	const [start] = useState(() => Date.now());
	const [now, setNow] = useState(start);
	const reasonId = useId();
	const { touched } = useTouched();
	const blocked = act?.blocked;
	const [pressed, setPressed] = useState(false);
	useEffect(() => {
		if (!until) return;
		const timer = setInterval(() => setNow(Date.now()), TICK_MS);
		return () => clearInterval(timer);
	}, [until]);
	useEffect(() => {
		if (blocked === undefined) setPressed(false);
	}, [blocked]);
	const host = useMemo(
		() =>
			blocked === undefined
				? undefined
				: { id: reasonId, press: () => setPressed(true) },
		[blocked, reasonId],
	);
	const end = until?.getTime();
	const share =
		end === undefined || end <= start
			? 1
			: Math.min(1, (now - start) / (end - start));
	return (
		<div className={cn(PENDING_BAR, BAR)}>
			<div className={cn(PENDING_ROW, ROW)}>
				<div className={cn(PENDING_TRACK, TRACK)}>
					{end === undefined ? (
						<span className={SPINNER_SLOT}>
							<Spinner />
						</span>
					) : (
						<span
							aria-hidden
							className={cn(PENDING_FILL, FILL)}
							style={{ width: `${share * 100}%` }}
						/>
					)}
					<span role="status" className={cn(text({ role: "body" }), SENTENCE)}>
						{sentence}
					</span>
					{end === undefined ? null : (
						<span className={cn(PENDING_LEFT, LEFT)}>{clock(end - now)}</span>
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
				<Reason id={reasonId} shown={pressed || touched}>
					{blocked}
				</Reason>
			)}
		</div>
	);
}
