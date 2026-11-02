import { paintText } from "@fcalell/ui-core/paint";
import type { ChipFamily } from "@fcalell/ui-core/tokens";
import {
	CHIP_LABEL,
	chip,
	chipDot,
	REMOVE_HIT,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { useTokenPx } from "../../lib/frame";
import { Ink } from "../../lib/ink";
import { blockIn, FadingView } from "../../lib/motion";
import { inertProps, PAINT_BOX, PaintView } from "../../lib/paint";
import { Press } from "../../lib/press";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";

// A data value's tag, an outlined pill with a dot in its family's hue (the
// neutral family, which has no hue, the label alone on its soft ground with
// no edge, so a dotless box never reads as a control), hugging its content:
// its caption line between its hairlines, no height of its own. Its one act
// removes the value, a round disc the chip's height closing its right end,
// which a hit slop widens to the target (44) without growing the chip. A lucide glyph takes a number and a colour, so the remove mark's
// size is resolved and its ink is the body's, which the web inherits.
// `painted` is the pill while its value is not here: its box filled at a
// word's length. Outside the package's exports.
export function ChipBase({
	label,
	family,
	onRemove,
	painted,
}: {
	label: string;
	family: ChipFamily;
	onRemove?: () => void;
	painted?: boolean;
}) {
	const words = useWords();
	const ground = family === "neutral" ? "soft" : "edge";
	// The chip is its caption line between its hairlines; the slop is what the
	// target has over it, on each side.
	const slop = Math.max(
		0,
		(useTokenPx("--spacing-target") -
			useTokenPx("--leading-caption") -
			2 * useTokenPx("--spacing-hairline")) /
			2,
	);
	if (painted)
		return (
			<PaintView
				painted
				{...inertProps(true)}
				className={cn(
					chip({ trailing: "none", ground }),
					"flex-row items-center min-w-0 self-start",
					PAINT_BOX,
				)}
			>
				{family === "neutral" ? null : (
					<View className={cn(chipDot({ family }), "opacity-0")} />
				)}
				<RNText
					numberOfLines={1}
					className={cn(CHIP_LABEL, "shrink opacity-0")}
				>
					{paintText("word")}
				</RNText>
			</PaintView>
		);
	// A removable pill is a block: it fades in as it mounts, and the viewer's
	// remove runs in the screen's block move, so it fades out on `fast` and its
	// row closes up.
	return (
		<FadingView
			entering={onRemove ? blockIn() : undefined}
			className={cn(
				chip({ trailing: onRemove ? "remove" : "none", ground }),
				"flex-row items-center min-w-0 self-start",
			)}
		>
			{family === "neutral" ? null : <View className={chipDot({ family })} />}
			<RNText numberOfLines={1} className={cn(CHIP_LABEL, "shrink")}>
				{label}
			</RNText>
			{onRemove ? (
				<Press
					accessibilityRole="button"
					accessibilityLabel={`${words.remove} ${label}`}
					onPress={onRemove}
					hitSlop={slop}
					wash="rounded-full bg-wash-press"
					give
					className={cn(REMOVE_HIT, "self-stretch aspect-square")}
				>
					<Ink.Provider value="ink-body">
						<Icon name="X" fit="meta" />
					</Ink.Provider>
				</Press>
			) : null}
		</FadingView>
	);
}
