import type { IconName } from "@fcalell/ui-core/descriptors";
import type { IconFit } from "@fcalell/ui-core/variants";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { Icon } from "../components/icon";
import { useToggle } from "./motion";

// A quarter turn takes a chevron down to right (a fold closing); a half turn
// takes an arrow or a chevron over to its opposite.
const DEGREES = { quarter: -90, half: 180 } as const;

/** A glyph that turns instead of being swapped for its opposite: a disclosure chevron, a sort arrow. It stands as `name` and, `turned`, a quarter or a half turn from it, over `fast` on the in-out curve. */
export function Turn(props: {
	name: IconName;
	fit?: IconFit;
	turned: boolean;
	by: keyof typeof DEGREES;
}) {
	const turn = useToggle(props.turned);
	const spin = useAnimatedStyle(() => ({
		transform: [{ rotate: `${turn.value * DEGREES[props.by]}deg` }],
	}));
	return (
		<Animated.View style={spin}>
			<Icon name={props.name} fit={props.fit} />
		</Animated.View>
	);
}
