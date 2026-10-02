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
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { ReasonHostContext } from "../../lib/reason";
import { useTouched } from "../../lib/touched";
import { Button } from "../button";
import { Spinner } from "../spinner";

const TRACK = "relative flex-row items-center min-w-0 overflow-hidden";
// The elapsed share, its width the runtime fraction.
const FILL = "absolute bottom-0 left-0";
const SENTENCE = "relative min-w-0 flex-1";
const LEFT = "relative shrink-0";

const TICK_MS = 1000;

// The time left, minutes then seconds padded to two.
function clock(ms: number): string {
	const seconds = Math.max(0, Math.ceil(ms / 1000));
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
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
	const [start] = useState(() => Date.now());
	const [now, setNow] = useState(start);
	const { touched } = useTouched();
	const blocked = act?.blocked;
	const [pressed, setPressed] = useState(false);
	useEffect(() => {
		if (blocked === undefined) setPressed(false);
	}, [blocked]);
	const host = useMemo(
		() =>
			blocked === undefined ? undefined : { press: () => setPressed(true) },
		[blocked],
	);
	useEffect(() => {
		if (!until) return;
		const timer = setInterval(() => setNow(Date.now()), TICK_MS);
		return () => clearInterval(timer);
	}, [until]);
	const end = until?.getTime();
	const share =
		end === undefined || end <= start
			? 1
			: Math.min(1, (now - start) / (end - start));
	return (
		<View className={PENDING_BAR}>
			<View className={PENDING_ROW}>
				<View className={cn(PENDING_TRACK, TRACK)}>
					{end === undefined ? (
						<Ink.Provider value="ink-meta">
							<Spinner />
						</Ink.Provider>
					) : (
						<View
							className={cn(PENDING_FILL, FILL)}
							style={{ width: `${share * 100}%` }}
						/>
					)}
					<RNText
						numberOfLines={1}
						accessibilityLiveRegion="polite"
						className={cn(text({ role: "body" }), SENTENCE)}
					>
						{sentence}
					</RNText>
					{end === undefined ? null : (
						<RNText className={cn(PENDING_LEFT, LEFT)}>
							{clock(end - now)}
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
