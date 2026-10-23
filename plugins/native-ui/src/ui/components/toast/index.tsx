import { TOAST_GLYPHS } from "@fcalell/ui-core/banner";
import type { LinkAct } from "@fcalell/ui-core/descriptors";
import { tuned } from "@fcalell/ui-core/paint";
import { SPACE_BASE, SPACING_RATIO, type Tone } from "@fcalell/ui-core/tokens";
import { TOAST, text, toastContentTone } from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { Text as RNText, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
	Keyframe,
	LinearTransition,
	ReduceMotion,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";
import type { Act } from "../../lib/act";
import { asAct, wiringOf } from "../../lib/act";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useSwipe } from "../../lib/follow";
import { Ink } from "../../lib/ink";
import { curve } from "../../lib/motion";
import { RaisedGround } from "../../lib/raised";
import { dismissToast, ToastEntry } from "../../lib/toast";
import { useWords } from "../../lib/words";
import { ButtonBase } from "../button/base";
import { IconButtonBase } from "../button/glyph";
import { Icon } from "../icon";

const BOX = "flex-row items-center max-w-full";
const SENTENCE = "min-w-0 flex-1";
const ACT = "shrink-0";

// A toast enters rising a pair as it fades in (the base rung, the out
// curve) and leaves sinking it as it fades out (the base rung, the in curve);
// the stack closes up on the in-out curve. Transform and opacity alone; reduced motion
// follows the system.
const PAIR = SPACE_BASE * SPACING_RATIO.touch.gap;
// The builders run at render, so the tuning page's rungs reach the next toast.
const enter = () =>
	new Keyframe({
		0: { opacity: 0, transform: [{ translateY: PAIR }] },
		100: { opacity: 1, transform: [{ translateY: 0 }], easing: curve("out") },
	})
		.duration(tuned.base)
		.reduceMotion(ReduceMotion.System);
const leave = () =>
	new Keyframe({
		0: { opacity: 1, transform: [{ translateY: 0 }] },
		100: {
			opacity: 0,
			transform: [{ translateY: PAIR }],
			easing: curve("in"),
		},
	})
		.duration(tuned.base)
		.reduceMotion(ReduceMotion.System);
const closeUp = () =>
	LinearTransition.duration(tuned.base)
		.easing(curve("in-out"))
		.reduceMotion(ReduceMotion.System);

const Raised = withUniwind(Animated.View);

export interface ToastProps extends Closed {
	/** What happened (a sentence; wraps). */
	sentence: string;
	// How the act it reports ended (`done`, the default): its glyph in the
	// tone's ink.
	tone?: Tone;
	// A route (`{ label, href }`, a press that navigates) or a retry; never an
	// undo.
	act?: Act | LinkAct;
}

// A raised toast: the tone's glyph, the sentence, its act and the dismiss
// act. It stands in the toasts' layer the Shell holds, which `toast()`
// queues it to.
export function Toast({ sentence, tone = "done", act }: ToastProps) {
	const words = useWords();
	const pressed = act && asAct(act);
	const id = useContext(ToastEntry);
	const swipe = useSwipe(() => id !== undefined && dismissToast(id));
	if (id === undefined)
		throw new Error(
			"a Toast stands in the Shell's toasts layer, queued by toast()",
		);
	return (
		<RaisedGround>
			<GestureDetector gesture={swipe.gesture}>
				<Raised
					entering={enter()}
					exiting={leave()}
					layout={closeUp()}
					style={swipe.style}
					className={cn(TOAST, BOX)}
				>
					<Ink.Provider value={toastContentTone(tone)}>
						<Icon name={TOAST_GLYPHS[tone]} />
					</Ink.Provider>
					<RNText className={cn(text({ role: "body" }), SENTENCE)}>
						{sentence}
					</RNText>
					{pressed ? (
						<View className={ACT}>
							<ButtonBase
								act="secondary"
								label={pressed.label}
								onAct={pressed.onAct}
								blocked={pressed.blocked}
								{...wiringOf(pressed)}
							/>
						</View>
					) : null}
					<IconButtonBase
						icon="X"
						label={words.dismiss}
						onAct={() => dismissToast(id)}
					/>
				</Raised>
			</GestureDetector>
		</RaisedGround>
	);
}
