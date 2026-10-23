import { position, release, SLOP } from "@fcalell/ui-core/follow";
import { I18nManager, useWindowDimensions } from "react-native";
import { usePanGesture } from "react-native-gesture-handler";
import {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { timing } from "./motion";

// What lets go of a gesture eases (`motion.md` §3, follow): a thing carried
// and let go settles where it lands on `base` `out`. gorhom's bottom sheet
// carries the sheet's own drag; this is the timing it settles and leaves on
// once released, read when the sheet opens so a tuned rung is the next one's.
export const released = () => timing("base", "out");

/**
 * A swipe toward the inline end: the view moves 1:1 with the finger along its
 * line and never against it, with no easing; let go past the reach or flung it
 * carries on out of the screen on `fast` `in` and hands over to `onAway`, else
 * it settles back on `base` `out`. Spread `style` on the animated view, and wrap
 * it in a `GestureDetector` over `gesture`. The pure
 * decision is `@fcalell/ui-core/follow`'s, the web's as well.
 */
export function useSwipe(onAway: () => void) {
	const x = useSharedValue(0);
	// How far it has to go to be gone: the screen's width.
	const { width } = useWindowDimensions();
	const away = I18nManager.isRTL ? -1 : 1;
	const gesture = usePanGesture({
		// The decision is the pure follow's, which runs on the JS thread.
		runOnJS: true,
		// Along the line first: a vertical pan is the screen's.
		activeOffsetX: [-SLOP, SLOP],
		failOffsetY: [-SLOP, SLOP],
		onUpdate: (event) => {
			x.value = position(event.translationX, away) * away;
		},
		onDeactivate: (event) => {
			const pulled = position(event.translationX, away);
			const speed = (event.velocityX * away) / 1000;
			if (!event.canceled && release(pulled, speed, width) === "away") {
				x.value = withTiming(width * away, timing("fast", "in"));
				onAway();
				return;
			}
			x.value = withTiming(0, timing("base", "out"));
		},
	});
	const style = useAnimatedStyle(() => ({
		transform: [{ translateX: x.value }],
	}));
	return { gesture, style };
}
