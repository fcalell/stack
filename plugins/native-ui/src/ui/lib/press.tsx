import type { ReactNode } from "react";
import {
	Pressable,
	type PressableProps,
	type PressableStateCallbackType,
} from "react-native";
import type { AnimatedStyle } from "react-native-reanimated";
import Animated from "react-native-reanimated";
import { withUniwind } from "uniwind";
import { cn } from "./cn";
import { usePress } from "./motion";
import { PaintPressable } from "./paint";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const Overlay = withUniwind(Animated.View);

// The overlay is the pressed look: it fills what it stands in and carries
// that box's radius.
const FILL = "absolute inset-0";

/** The pressed look of a control: `className` is its fill and radius, `style` the opacity `usePress` gives it. For a control whose pressed look is a box inside the Pressable (a switch's track), not the Pressable itself. */
export function Wash(props: {
	className: string;
	style: AnimatedStyle<object>;
}) {
	return (
		<Overlay
			pointerEvents="none"
			className={cn(FILL, props.className)}
			style={props.style}
		/>
	);
}

/** A Pressable that answers its press: `wash` is the classes of the pressed look (the fill and the radius it fills), drawn as an overlay that lands at once and fades out on release; `give` scales the control under the press. A control with no look of its own to press (blocked, pending) passes neither; a `painted` one answers nothing. */
export function Press({
	wash,
	give,
	painted,
	children,
	onPressIn,
	onPressOut,
	...rest
}: Omit<PressableProps, "style"> & {
	wash?: string;
	give?: boolean;
	// The control while its data is not here: it fades in and breathes (`PaintPressable`) and answers nothing.
	painted?: boolean;
}) {
	const press = usePress();
	if (painted)
		return (
			<PaintPressable {...rest} painted>
				{children}
			</PaintPressable>
		);
	return (
		<AnimatedPressable
			{...rest}
			onPressIn={(event) => {
				press.onPressIn();
				onPressIn?.(event);
			}}
			onPressOut={(event) => {
				press.onPressOut();
				onPressOut?.(event);
			}}
			style={give ? press.give : undefined}
		>
			{(state: PressableStateCallbackType): ReactNode => (
				<>
					{wash ? <Wash className={wash} style={press.wash} /> : null}
					{typeof children === "function" ? children(state) : children}
				</>
			)}
		</AnimatedPressable>
	);
}
