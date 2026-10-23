import { subscribeMotion, tuned } from "@fcalell/ui-core/paint";
import {
	type Easing as Curve,
	type Duration,
	EASING,
	type MotionKnobName,
	PULSE_LOW,
	SPACE_BASE,
	SPACING_RATIO,
} from "@fcalell/ui-core/tokens";
import { useEffect, useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	FadeIn,
	Keyframe,
	makeMutable,
	ReduceMotion,
	useAnimatedStyle,
	useSharedValue,
	type WithTimingConfig,
	withDelay,
	withRepeat,
	withTiming,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";

// The contract's motion in Reanimated: one of the three curves, and a rung's
// duration on a curve, read from the live `tuned` record at the call so the
// tuning page's change reaches the next animation played. Reduced motion
// follows the system, which zeroes it.
export function curve(name: Curve) {
	return Easing.bezier(...EASING[name]);
}

export function timing(rung: Duration, name: Curve): WithTimingConfig {
	return {
		duration: tuned[rung],
		easing: curve(name),
		reduceMotion: ReduceMotion.System,
	};
}

// A knob followed live: a component whose look depends on a number the page
// can tune (the pulse, the tick) re-renders when it moves.
export function useTuned(name: MotionKnobName): number {
	return useSyncExternalStore(subscribeMotion, () => tuned[name]);
}

// The system's reduced motion, held for what is not in a render (the pulse's
// clock, the move coordinator) and followed live.
let reduced = false;
const onReduced = new Set<() => void>();
const setReduced = (on: boolean) => {
	reduced = on;
	for (const listener of onReduced) listener();
};
AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);

export function reducedNow(): boolean {
	return reduced;
}

// The page's one breath: a share of the fill, 1 at its full and 0 at its low,
// turning over `tuned.pulse` on `in-out`. Every painted part reads this one
// value, so a page breathes as one surface and never as a ripple of parts out
// of step. It starts with the first painted part and restarts when the
// tuning page moves the knob or the system's reduced motion changes; it
// stands at full under reduced motion.
const breath = makeMutable(1);
let breathing = false;

function breathe(): void {
	cancelAnimation(breath);
	breath.value = 1;
	if (reduced) return;
	breath.value = withRepeat(
		withTiming(0, {
			duration: tuned.pulse / 2,
			easing: curve("in-out"),
			reduceMotion: ReduceMotion.Never,
		}),
		-1,
		true,
		undefined,
		ReduceMotion.Never,
	);
}

function startBreath(): void {
	if (breathing) return;
	breathing = true;
	subscribeMotion(breathe);
	onReduced.add(breathe);
	breathe();
}

/**
 * The style of a painted part: its opacity is the fade-in after `delay` (the
 * read's by default; an act's is `tuned.actDelay`) times the page's breath.
 * The part's content is not drawn while it is painted, so the box's opacity is
 * its fill's alpha. The delay holds under reduced motion and the fade snaps. A
 * part that does not `breathes` (a scrambled text, whose glyphs would dim) only
 * fades in.
 */
export function usePaintStyle(delay = tuned.waitDelay, breathes = true) {
	const appear = useSharedValue(0);
	useEffect(() => {
		startBreath();
		appear.value = withDelay(
			delay,
			withTiming(1, timing("base", "out")),
			ReduceMotion.Never,
		);
		return () => cancelAnimation(appear);
	}, [appear, delay]);
	return useAnimatedStyle(() => ({
		opacity:
			appear.value *
			(breathes ? PULSE_LOW + (1 - PULSE_LOW) * breath.value : 1),
	}));
}
// Answering a press (`motion.md` §3): the pressed wash lands at once and lets
// go over `fast`, and a filled control gives, scaling to `tuned.press` on the
// same two steps. The phone has no hover; this is its whole answer. `wash` is
// the opacity of an overlay in the wash's colour, `give` the scale of the
// control, `onPressIn` and `onPressOut` the Pressable's. The press scale is
// read when the press lands, so a tuned value is the next press's.
export function usePress() {
	const down = useSharedValue(0);
	const to = useSharedValue(1);
	const wash = useAnimatedStyle(() => ({ opacity: down.value }));
	const give = useAnimatedStyle(() => ({
		transform: [{ scale: 1 + (to.value - 1) * down.value }],
	}));
	return {
		wash,
		give,
		onPressIn: () => {
			to.value = tuned.press;
			down.value = withTiming(1, timing("instant", "out"));
		},
		onPressOut: () => {
			down.value = withTiming(0, timing("fast", "out"));
		},
	};
}

// A control's own value moving: 0 to 1 as `on` turns, over a rung on a curve
// (the thumb's travel, a chevron's turn). It starts where `on` stands, so a
// control that mounts on draws its end without moving to it.
export function useToggle(
	on: boolean,
	rung: Duration = "fast",
	name: Curve = "in-out",
) {
	const value = useSharedValue(on ? 1 : 0);
	useEffect(() => {
		value.value = withTiming(on ? 1 : 0, timing(rung, name));
	}, [on, rung, name, value]);
	return value;
}

// A line that appears in flow (a reason, a field's error, a checking line, a
// notice, a stage's moment) fades in on `fast` `out` and pushes what follows
// at once; it leaves at once. A block that arrives on its own fades in on
// `base` `out` the same way. Built where they mount, so a tuned rung is the
// next one's; the entering prop of an Animated view.
export const lineIn = () =>
	FadeIn.duration(tuned.fast)
		.easing(curve("out"))
		.reduceMotion(ReduceMotion.System);
export const blockIn = () =>
	FadeIn.duration(tuned.base)
		.easing(curve("out"))
		.reduceMotion(ReduceMotion.System);
// The views that take `lineIn` and `blockIn` as their `entering`, with a
// `className` as any view has.
export const FadingText = withUniwind(Animated.Text);
export const FadingView = withUniwind(Animated.View);

// A measured value moving (`motion.md` §3, value): a fill's share, over `slow`
// on `in-out`. It starts at `from` and follows `to`; a fill that mounts starts
// at 0 and grows from its start, and one that stands where it was does not
// move until its data does.
export function useValue(
	to: number,
	from = to,
	rung: Duration = "slow",
	name: Curve = "in-out",
) {
	const value = useSharedValue(from);
	useEffect(() => {
		value.value = withTiming(to, timing(rung, name));
	}, [to, rung, name, value]);
	return value;
}

// A checkbox's mark grows from 0.6 with its opacity over `fast` and leaves
// over `instant`; a radio's dot grows from nothing the same way. Built where
// they mount, so a tuned rung is the next one's.
export const markIn = () =>
	new Keyframe({
		0: { opacity: 0, transform: [{ scale: 0.6 }] },
		100: {
			opacity: 1,
			transform: [{ scale: 1 }],
			easing: curve("out"),
		},
	})
		.duration(tuned.fast)
		.reduceMotion(ReduceMotion.System);
export const markOut = () =>
	new Keyframe({
		0: { opacity: 1, transform: [{ scale: 1 }] },
		100: {
			opacity: 0,
			transform: [{ scale: 0.6 }],
			easing: curve("out"),
		},
	})
		.duration(tuned.instant)
		.reduceMotion(ReduceMotion.System);
export const dotIn = () =>
	new Keyframe({
		0: { transform: [{ scale: 0 }] },
		100: { transform: [{ scale: 1 }], easing: curve("out") },
	})
		.duration(tuned.fast)
		.reduceMotion(ReduceMotion.System);
export const dotOut = () =>
	new Keyframe({
		0: { transform: [{ scale: 1 }] },
		100: { transform: [{ scale: 0 }], easing: curve("out") },
	})
		.duration(tuned.instant)
		.reduceMotion(ReduceMotion.System);

// A change of place fades the place's root in on `fast` (`motion.md` §3,
// navigate): places are peers, so nothing slides. A pushed screen is the
// stack's own animation. Built where it mounts, so a tuned rung is the next one's.
export const placeIn = () =>
	FadeIn.duration(tuned.fast)
		.easing(curve("out"))
		.reduceMotion(ReduceMotion.System);

// A message that arrives at the end of a log rises a pair as it fades in on
// `base` `out` (`motion.md` §3, stream). The log and each message in it are
// drawn upside down, so the rise starts below by a negative offset in the
// message's own space.
const PAIR = SPACE_BASE * SPACING_RATIO.touch.gap;
export const streamIn = () =>
	new Keyframe({
		0: { opacity: 0, transform: [{ translateY: -PAIR }] },
		100: { opacity: 1, transform: [{ translateY: 0 }], easing: curve("out") },
	})
		.duration(tuned.base)
		.reduceMotion(ReduceMotion.System);

// The act back to the newest message rises in on `fast` `out` and leaves
// falling back on `fast` `in`.
export const latestIn = () =>
	new Keyframe({
		0: { opacity: 0, transform: [{ translateY: PAIR }] },
		100: { opacity: 1, transform: [{ translateY: 0 }], easing: curve("out") },
	})
		.duration(tuned.fast)
		.reduceMotion(ReduceMotion.System);
export const latestOut = () =>
	new Keyframe({
		0: { opacity: 1, transform: [{ translateY: 0 }] },
		100: { opacity: 0, transform: [{ translateY: PAIR }], easing: curve("in") },
	})
		.duration(tuned.fast)
		.reduceMotion(ReduceMotion.System);
