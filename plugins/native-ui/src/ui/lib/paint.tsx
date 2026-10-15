import { cn } from "@fcalell/ui-core/cn";
import { type PaintRole, paintText, timings } from "@fcalell/ui-core/paint";
import { paint } from "@fcalell/ui-core/variants";
import { useEffect, useState } from "react";
import { Text as RNText } from "react-native";

/**
 * Whether a paint shows yet: false for `delay` (`timings.waitDelay`; an act's
 * is `timings.actDelay`) after `on` turns true (one timer, only while painted), so a read
 * the server answers at once paints nothing. The phone's fill snaps in; the
 * web fades.
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

/** A text slot's paint, set inside the slot's own text element: each line a bar. */
export function Painted({ role, at = 0 }: { role: PaintRole; at?: number }) {
	const shown = useShown();
	return (
		<RNText
			className={cn(paint({ kind: "glyphs" }), !shown && "bg-transparent")}
		>
			{paintText(role, at)}
		</RNText>
	);
}

/**
 * The props of a text that may hold `Painted` inside a `numberOfLines` limit:
 * the filler is longer than the box it stands in, so a painted text clips
 * rather than ending in an ellipsis.
 */
export const clipWhen = (painted: boolean | undefined) =>
	painted ? ({ ellipsizeMode: "clip" } as const) : {};

/** The paint of a part's own box (a mark, a block): its fill, shown after the delay. */
export const paintBox = (shown: boolean) =>
	cn(paint({ kind: "box" }), !shown && "bg-transparent");

/** The paint of a control's own box: its fill shown after the delay, its border not drawn. */
export const paintControl = (shown: boolean) =>
	cn(paint({ kind: "control" }), !shown && "bg-transparent");

/** The props of a painted part that takes no touch and hides its filler from a screen reader. */
export const inertProps = (on: boolean) =>
	on
		? ({
				pointerEvents: "none",
				importantForAccessibility: "no-hide-descendants",
				accessibilityElementsHidden: true,
			} as const)
		: {};
