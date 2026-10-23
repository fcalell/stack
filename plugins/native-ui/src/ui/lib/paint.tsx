import { type PaintRole, paintText, timings } from "@fcalell/ui-core/paint";
import { paint } from "@fcalell/ui-core/variants";
import { type ComponentProps, useEffect, useState } from "react";
import { Pressable, Text as RNText, View } from "react-native";
import Animated from "react-native-reanimated";
import { withUniwind } from "uniwind";
import { usePaintStyle } from "./motion";
import { ScrambledText, scramblesNow } from "./scramble";

/**
 * Whether a paint shows yet: false for `delay` (`timings.waitDelay`; an act's
 * is `timings.actDelay`) after `on` turns true (one timer, only while painted), so a read
 * the server answers at once paints nothing. A text or a box that paints
 * fades itself in (`PaintView`, `PaintText`); this is for what is not painted
 * but follows the same delay (a busy mark).
 */
export function useShown(on = true, delay = timings.waitDelay): boolean {
	const [shown, setShown] = useState(false);
	useEffect(() => {
		if (!on) {
			setShown(false);
			return undefined;
		}
		const timer = setTimeout(() => setShown(true), delay);
		return () => clearTimeout(timer);
	}, [on, delay]);
	return on && shown;
}

// A painted part is its host with the fill and the breath on its opacity: the
// part draws nothing but the fill while painted, so the box's opacity is the
// fill's alpha, after the read's delay and in the page's one phase
// (`usePaintStyle`). The host that is not painted is the plain one, so a loaded
// list pays for no animated view.
const BreathingView = withUniwind(Animated.View);
const BreathingPressable = withUniwind(
	Animated.createAnimatedComponent(Pressable),
);
const BreathingText = withUniwind(Animated.Text);

type Painting = { painted?: boolean };

/** A `View` that, while `painted`, fades in after the read's delay and breathes. */
export function PaintView({
	painted,
	style,
	...props
}: ComponentProps<typeof View> & Painting) {
	return painted ? (
		<Breathing {...props} style={style} />
	) : (
		<View {...props} style={style} />
	);
}

function Breathing({ style, ...props }: ComponentProps<typeof View>) {
	const breath = usePaintStyle();
	return <BreathingView {...props} style={[style, breath]} />;
}

/** A `Pressable` that, while `painted`, fades in after the read's delay and breathes. */
export function PaintPressable({
	painted,
	style,
	...props
}: ComponentProps<typeof Pressable> & Painting) {
	return painted ? (
		<PressableBreathing {...props} style={style} />
	) : (
		<Pressable {...props} style={style} />
	);
}

function PressableBreathing({
	style,
	...props
}: ComponentProps<typeof Pressable>) {
	const breath = usePaintStyle();
	return <BreathingPressable {...props} style={[style, breath]} />;
}

/**
 * The root `Text` of a slot that holds `Painted` fillers: while `painted` it
 * fades in after the read's delay and breathes, so the fillers inside (nested
 * text takes no opacity of its own) breathe with it. A root whose filler
 * `fills` a role the theme scrambles fades in and does not breathe.
 */
export function PaintText({
	painted,
	fills,
	...props
}: ComponentProps<typeof RNText> & Painting & { fills?: PaintRole }) {
	return painted ? (
		<TextBreathing breathes={!(fills && scramblesNow(fills))} {...props} />
	) : (
		<RNText {...props} />
	);
}

function TextBreathing({
	style,
	breathes,
	...props
}: ComponentProps<typeof RNText> & { breathes: boolean }) {
	const breath = usePaintStyle(undefined, breathes);
	return <BreathingText {...props} style={[style, breath]} />;
}

/** A text slot's paint, set inside the slot's own `PaintText`: each line a bar, or, where the theme scrambles the slot's kind (`theme.loading`) and the slot is one line, the scramble in the text's own ink. */
export function Painted({ role, at = 0 }: { role: PaintRole; at?: number }) {
	if (scramblesNow(role)) return <ScrambledText role={role} at={at} />;
	return (
		<RNText className={paint({ kind: "glyphs" })}>{paintText(role, at)}</RNText>
	);
}

/**
 * The props of a text that may hold `Painted` inside a `numberOfLines` limit:
 * the filler is longer than the box it stands in, so a painted text clips
 * rather than ending in an ellipsis.
 */
export const clipWhen = (painted: boolean | undefined) =>
	painted ? ({ ellipsizeMode: "clip" } as const) : {};

/** The paint of a part's own box (a mark, a block): its fill, on a `PaintView` or `PaintPressable`. */
export const PAINT_BOX = paint({ kind: "box" });

/** The paint of a control's own box: its fill, its border not drawn, on a `PaintView` or `PaintPressable`. */
export const PAINT_CONTROL = paint({ kind: "control" });

/** The props of a painted part that takes no touch and hides its filler from a screen reader. */
export const inertProps = (on: boolean) =>
	on
		? ({
				pointerEvents: "none",
				importantForAccessibility: "no-hide-descendants",
				accessibilityElementsHidden: true,
			} as const)
		: {};
