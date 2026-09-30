import { LOOP_MS } from "@fcalell/ui-core/tokens";
import { SPINNER, SPINNER_ARC, SPINNER_TRACK } from "@fcalell/ui-core/variants";
import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import { withUniwind } from "uniwind";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useInk } from "../../lib/ink";
import { useTokenColor } from "../../lib/theme";

const LAYER = "absolute inset-0";

// `Animated` passes through uniwind unwrapped: its view takes a className
// only once wrapped.
const Turning = withUniwind(Animated.View);

export interface SpinnerProps extends Closed {}

// A turning ring in the ink of its place, the size of the glyph it replaces;
// hidden from assistive tech, since its owner announces the wait. A view
// takes no currentColor, so the place's ink is resolved and set as the
// border colour: the arc's `border-t-transparent` is the top edge's own key
// and survives it. uniwind's free build has no `animate-*`, so the turn is
// React Native's own loop over the contract's loop duration.
export function Spinner(_props: SpinnerProps) {
	const borderColor = useTokenColor(`--color-${useInk() ?? "ink-meta"}`);
	const turn = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		const loop = Animated.loop(
			Animated.timing(turn, {
				toValue: 1,
				duration: LOOP_MS,
				easing: Easing.linear,
				useNativeDriver: true,
			}),
		);
		loop.start();
		return () => loop.stop();
	}, [turn]);
	const rotate = turn.interpolate({
		inputRange: [0, 1],
		outputRange: ["0deg", "360deg"],
	});
	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			className={SPINNER}
		>
			<View className={cn(SPINNER_TRACK, LAYER)} style={{ borderColor }} />
			<Turning
				className={cn(SPINNER_ARC, LAYER)}
				style={{ borderColor, transform: [{ rotate }] }}
			/>
		</View>
	);
}
