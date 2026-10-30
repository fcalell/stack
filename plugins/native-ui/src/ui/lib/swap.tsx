import { tuned } from "@fcalell/ui-core/paint";
import { rollOf, rollShift } from "@fcalell/ui-core/roll";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Text as RNText, type TextProps, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { timing } from "./motion";

// The mark's size the new one grows from and the old one leaves toward.
const MARK_FROM = 0.6;

const FILL = {
	position: "absolute",
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
} as const;

interface Leaving {
	id: string;
	node: ReactNode;
	shift: number;
}

/** A value that changes while shown (a mark, a figure): when `id` changes the new one enters and the old one, held for the rung, leaves over `fast` on `out`. With `of`, its number, the old leaves and the new rises by the sign of the change (a figure rolls, in a clipped box); with `scale`, a mark swaps: the old one leaves over `fast` and the new one then grows from 0.6, so the two are never drawn together; with neither it is a cross-fade. It mounts at rest: a value that arrives (a waiting form's switch to its loaded one) is the settle's, never a swap. */
export function Swap(props: {
	id: string;
	of?: number;
	scale?: boolean;
	children: ReactNode;
}) {
	const { id, of, scale, children } = props;
	const [at, setAt] = useState({ id, of });
	const [leaving, setLeaving] = useState<Leaving>();
	// What the last commit drew, which is what leaves.
	const drawn = useRef<ReactNode>(children);
	useLayoutEffect(() => {
		drawn.current = children;
	});
	if (at.id !== id) {
		setAt({ id, of });
		setLeaving({
			id: at.id,
			node: drawn.current,
			shift:
				at.of !== undefined && of !== undefined
					? rollShift(rollOf(at.of, of))
					: 0,
		});
	}
	// 0 as the old one starts to leave, 1 once it is gone, and the same for the
	// new one entering (a mark's waits for the old one to be gone); a roll
	// travels the figure's own height, as a share of it.
	const leaves = useSharedValue(1);
	const enters = useSharedValue(1);
	const shift = useSharedValue(0);
	useLayoutEffect(() => {
		if (!leaving) return undefined;
		shift.value = leaving.shift;
		leaves.value = 0;
		enters.value = 0;
		leaves.value = withTiming(1, timing("fast", "out"));
		enters.value = withDelay(
			scale ? tuned.fast : 0,
			withTiming(1, timing("fast", "out")),
		);
		const timer = setTimeout(
			() => setLeaving(undefined),
			scale ? 2 * tuned.fast : tuned.fast,
		);
		return () => clearTimeout(timer);
	}, [leaving, leaves, enters, shift, scale]);
	const entering = useAnimatedStyle(() => ({
		opacity: enters.value,
		transform: [
			{ translateY: `${(1 - enters.value) * shift.value * 100}%` },
			{ scale: scale ? MARK_FROM + (1 - MARK_FROM) * enters.value : 1 },
		],
	}));
	const going = useAnimatedStyle(() => ({
		opacity: 1 - leaves.value,
		transform: [
			{ translateY: `${-leaves.value * shift.value * 100}%` },
			{ scale: scale ? 1 - (1 - MARK_FROM) * leaves.value : 1 },
		],
	}));
	return (
		<View style={of === undefined ? undefined : { overflow: "hidden" }}>
			{leaving ? (
				<Animated.View
					key={`out-${leaving.id}`}
					pointerEvents="none"
					importantForAccessibility="no-hide-descendants"
					style={[FILL, going]}
				>
					{leaving.node}
				</Animated.View>
			) : null}
			<Animated.View key={id} style={leaving ? entering : undefined}>
				{children}
			</Animated.View>
		</View>
	);
}

/** A figure that rolls when its number changes while shown (`rollOf`): `text` is what it reads, `of` the number it is, `className` its text's role. A clock's tick is no `Roll`: it switches at once. */
export function Roll(props: {
	text: string;
	of: number;
	className?: string;
	style?: TextProps["style"];
}) {
	return (
		<Swap id={props.text} of={props.of}>
			<RNText className={props.className} style={props.style}>
				{props.text}
			</RNText>
		</Swap>
	);
}
