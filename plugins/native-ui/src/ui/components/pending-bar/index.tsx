import type { Act } from "@fcalell/ui-core/descriptors";
import { PENDING_BAR, PENDING_FILL, text } from "@fcalell/ui-core/variants";
import { useEffect, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Spinner } from "../spinner";

export interface PendingBarProps extends Closed {
	sentence: string;
	until?: Date;
	act?: Act;
}

const TICK_MS = 250;

// One line with a spinner, or a countdown that fills the bar toward `until`,
// and one act.
export function PendingBar({ sentence, until, act }: PendingBarProps) {
	const [now, setNow] = useState(() => Date.now());
	const [width, setWidth] = useState(0);
	const [start] = useState(() => Date.now());
	useEffect(() => {
		if (!until) return;
		const timer = setInterval(() => setNow(Date.now()), TICK_MS);
		return () => clearInterval(timer);
	}, [until]);
	const total = until ? until.getTime() - start : 0;
	const ratio = until && total > 0 ? Math.min(1, (now - start) / total) : 0;
	return (
		<View
			accessibilityRole="progressbar"
			accessibilityValue={until ? { min: 0, max: 1, now: ratio } : undefined}
			onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
			className={cn(PENDING_BAR, "flex-row items-center overflow-hidden")}
		>
			{until ? (
				<View
					className={cn(PENDING_FILL, "absolute inset-y-0 left-0")}
					style={{ width: ratio * width }}
				/>
			) : (
				<Spinner />
			)}
			<RNText className={cn(text({ role: "meta" }), "flex-1 text-ink")}>
				{sentence}
			</RNText>
			{act ? (
				<Pressable
					accessibilityRole="button"
					disabled={act.blocked !== undefined}
					onPress={act.onAct}
					className="min-h-11 justify-center"
				>
					<RNText
						className={cn(text({ role: "body" }), "font-medium text-tint")}
					>
						{act.label}
					</RNText>
				</Pressable>
			) : null}
		</View>
	);
}
