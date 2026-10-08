import type { Act, IconName } from "@fcalell/ui-core/descriptors";
import {
	DURATION_MS,
	SPACE_BASE,
	SPACING_RATIO,
} from "@fcalell/ui-core/tokens";
import {
	TOAST,
	type ToastState,
	text,
	toastContentTone,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Text as RNText, View } from "react-native";
import Animated, {
	FadeOut,
	Keyframe,
	LinearTransition,
	ReduceMotion,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { curve } from "../../lib/motion";
import { RaisedGround } from "../../lib/raised";
import { dismissToast, ToastEntry } from "../../lib/toast";
import { useWords } from "../../lib/words";
import { Button } from "../button";
import { Icon } from "../icon";
import { IconButtonBase } from "../icon-button/base";

const BOX = "flex-row items-center max-w-full";
const SENTENCE = "min-w-0 flex-1";
const ACT = "shrink-0";

// A toast enters rising a pair as it fades in (the base rung, the out
// curve) and leaves fading (the fast rung, the in curve); the stack closes
// up on the in-out curve. Transform and opacity alone; reduced motion
// follows the system.
const PAIR = SPACE_BASE * SPACING_RATIO.touch.pair;
const ENTER = new Keyframe({
	0: { opacity: 0, transform: [{ translateY: PAIR }] },
	100: { opacity: 1, transform: [{ translateY: 0 }], easing: curve("out") },
})
	.duration(DURATION_MS.base)
	.reduceMotion(ReduceMotion.System);
const LEAVE = FadeOut.duration(DURATION_MS.fast)
	.easing(curve("in"))
	.reduceMotion(ReduceMotion.System);
const CLOSE_UP = LinearTransition.duration(DURATION_MS.base)
	.easing(curve("in-out"))
	.reduceMotion(ReduceMotion.System);

const Raised = withUniwind(Animated.View);

// The glyph of each state a toast reports.
const MARK: Record<ToastState, IconName> = {
	done: "CircleCheck",
	attention: "TriangleAlert",
	failed: "CircleX",
};

export interface ToastProps extends Closed {
	/** What happened (a sentence; wraps). */
	sentence: string;
	// How the act it reports ended: its glyph in the state's ink.
	state?: ToastState;
	// A route or a retry; never an undo.
	act?: Act;
}

// A raised toast: the state's glyph, the sentence, its act and the dismiss
// act. It stands in the toasts' layer the Shell holds, which `toast()`
// queues it to.
export function Toast({ sentence, state, act }: ToastProps) {
	const words = useWords();
	const id = useContext(ToastEntry);
	if (id === undefined)
		throw new Error(
			"a Toast stands in the Shell's toasts layer, queued by toast()",
		);
	return (
		<RaisedGround>
			<Raised
				entering={ENTER}
				exiting={LEAVE}
				layout={CLOSE_UP}
				className={cn(TOAST, BOX)}
			>
				{state ? (
					<Ink.Provider value={toastContentTone(state)}>
						<Icon name={MARK[state]} />
					</Ink.Provider>
				) : null}
				<RNText className={cn(text({ role: "body" }), SENTENCE)}>
					{sentence}
				</RNText>
				{act ? (
					<View className={ACT}>
						<Button
							act="secondary"
							fit="bar"
							label={act.label}
							onAct={() => void act.onAct()}
							loading={act.loading}
							blocked={act.blocked}
						/>
					</View>
				) : null}
				<IconButtonBase
					icon="X"
					fit="bar"
					label={words.dismiss}
					onAct={() => dismissToast(id)}
				/>
			</Raised>
		</RaisedGround>
	);
}
