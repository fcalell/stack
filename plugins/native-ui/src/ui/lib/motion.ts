import {
	type Easing as Curve,
	DURATION_MS,
	type Duration,
	EASING,
} from "@fcalell/ui-core/tokens";
import {
	Easing,
	ReduceMotion,
	type WithTimingConfig,
} from "react-native-reanimated";

// The contract's motion in Reanimated: one of the three curves, and a rung's
// duration on a curve. Reduced motion follows the system, which zeroes it.
export function curve(name: Curve) {
	return Easing.bezier(...EASING[name]);
}

export function timing(rung: Duration, name: Curve): WithTimingConfig {
	return {
		duration: DURATION_MS[rung],
		easing: curve(name),
		reduceMotion: ReduceMotion.System,
	};
}
