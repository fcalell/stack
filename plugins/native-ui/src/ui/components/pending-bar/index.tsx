import {
	type PendingRun,
	pendingRun,
	pendingShare,
	timeLeft,
} from "@fcalell/ui-core/clock";
import type { Act } from "@fcalell/ui-core/descriptors";
import {
	PENDING_BAR,
	PENDING_FILL,
	PENDING_LEFT,
	PENDING_ROW,
	PENDING_TRACK,
	text,
} from "@fcalell/ui-core/variants";
import { useEffect, useMemo, useState } from "react";
import { Text as RNText, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	ReduceMotion,
	useAnimatedStyle,
	useReducedMotion,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";
import { useClock } from "../../lib/clock";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { useLive } from "../../lib/live";
import { ReasonHostContext, usePressed } from "../../lib/reason";
import { useTouched } from "../../lib/touched";
import { Button } from "../button";
import { Spinner } from "../spinner";

const TRACK = "relative flex-row items-center min-w-0 overflow-hidden";
// The elapsed share, its width the runtime fraction.
const FILL = "absolute bottom-0 left-0";
const SENTENCE = "relative min-w-0 flex-1";
const LEFT = "relative shrink-0";

const Filled = withUniwind(Animated.View);

// The elapsed share, moving on its own from where the run stands to full at
// its end; the clock's tick redraws only the time left. With the system's
// reduced motion on (as Reanimated read it at launch) it steps with the
// clock instead, the share set once a tick.
function Fill(props: { run: PendingRun; now: number }) {
	const { run, now } = props;
	const reduced = useReducedMotion();
	const share = useSharedValue(pendingShare(run, Date.now()));
	useEffect(() => {
		if (reduced) return;
		const at = Date.now();
		share.value = pendingShare(run, at);
		if (at < run.end)
			share.value = withTiming(1, {
				duration: run.end - at,
				easing: Easing.linear,
				reduceMotion: ReduceMotion.Never,
			});
		return () => cancelAnimation(share);
	}, [run, share, reduced]);
	useEffect(() => {
		if (reduced) share.value = pendingShare(run, now);
	}, [reduced, run, now, share]);
	const width = useAnimatedStyle(() => ({ width: `${share.value * 100}%` }));
	return <Filled className={cn(PENDING_FILL, FILL)} style={width} />;
}

export interface PendingBarProps extends Closed {
	// What is happening, announced as it changes.
	sentence: string;
	// When the work ends: the track fills toward it and shows the time left;
	// unset, a spinner turns.
	until?: Date;
	// The one act, a hairline Button under the track; a blocked act's reason
	// under the bar.
	act?: Act;
}

// One line on the group ground: the spinner, or a meta-ink line along the
// track's foot filling toward `until` with the time left beside the
// sentence, which alone is the live region; the act under it.
export function PendingBar({ sentence, until, act }: PendingBarProps) {
	const end = until?.getTime();
	// The shared clock ticks the bar until its end, never past it.
	const now = useClock((at) => at, end ?? 0);
	const [run, setRun] = useState(() =>
		end === undefined ? undefined : pendingRun(end, now),
	);
	if (end !== undefined && run?.end !== end) setRun(pendingRun(end, now, run));
	const { touched } = useTouched();
	const live = useLive(sentence);
	const blocked = act?.blocked;
	const [pressed, press] = usePressed(blocked);
	const host = useMemo(
		() => (blocked === undefined ? undefined : { press }),
		[blocked, press],
	);
	return (
		<View className={PENDING_BAR}>
			<View className={PENDING_ROW}>
				<View className={cn(PENDING_TRACK, TRACK)}>
					{end === undefined || run === undefined ? (
						<Ink.Provider value="ink-meta">
							<Spinner />
						</Ink.Provider>
					) : (
						<Fill run={run} now={now} />
					)}
					<RNText
						numberOfLines={1}
						{...live}
						className={cn(text({ role: "body" }), SENTENCE)}
					>
						{sentence}
					</RNText>
					{end === undefined ? null : (
						<RNText className={cn(PENDING_LEFT, LEFT)}>
							{timeLeft(end, now)}
						</RNText>
					)}
				</View>
				{act ? (
					<ReasonHostContext.Provider value={host}>
						<Button
							act="secondary"
							label={act.label}
							onAct={act.onAct}
							loading={act.loading}
							blocked={blocked}
						/>
					</ReasonHostContext.Provider>
				) : null}
			</View>
			{blocked !== undefined && (pressed || touched) ? (
				<RNText className={text({ role: "meta" })}>{blocked}</RNText>
			) : null}
		</View>
	);
}
