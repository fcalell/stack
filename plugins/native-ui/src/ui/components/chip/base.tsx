import { paintText } from "@fcalell/ui-core/paint";
import type { ChipFamily } from "@fcalell/ui-core/tokens";
import {
	CHIP_LABEL,
	chip,
	chipDot,
	PILL_COMPACT,
	REMOVE_HIT,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { tokenPx } from "../../lib/frame";
import { Ink } from "../../lib/ink";
import { blockIn, FadingView } from "../../lib/motion";
import { inertProps, PAINT_BOX, PaintView } from "../../lib/paint";
import { Press } from "../../lib/press";
import { useCSSVariable } from "../../lib/theme";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";

// A data value's tag, an outlined pill with a dot in its family's hue, hugging its content; its
// one act removes the value, a round hit box the chip's height closing its
// right end, which a hit slop widens to the target (44) without growing the
// chip. A lucide glyph takes a number and a colour, so the remove mark's
// size is resolved and its ink is the body's, which the web inherits.
// `painted` is the pill while its value is not here: its box filled at a
// word's length. Outside the package's exports.
export function ChipBase({
	label,
	family,
	onRemove,
	painted,
	compact,
}: {
	label: string;
	family: ChipFamily;
	onRemove?: () => void;
	painted?: boolean;
	// The compact form, a pill inside a row: the caption line between its
	// hairlines, so the row keeps its height. The row says it; a pill never
	// reads its parent.
	compact?: boolean;
}) {
	const words = useWords();
	const slop = Math.max(
		0,
		(tokenPx(useCSSVariable("--spacing-target")) -
			tokenPx(useCSSVariable("--spacing-chip"))) /
			2,
	);
	if (painted)
		return (
			<PaintView
				painted
				{...inertProps(true)}
				className={cn(
					chip({ trailing: "none" }),
					compact && PILL_COMPACT,
					"flex-row items-center min-w-0 self-start",
					PAINT_BOX,
				)}
			>
				<View className={cn(chipDot({ family }), "opacity-0")} />
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
				chip({ trailing: onRemove ? "remove" : "none" }),
				compact && PILL_COMPACT,
				"flex-row items-center min-w-0 self-start",
			)}
		>
			<View className={chipDot({ family })} />
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
					className={cn(REMOVE_HIT, "items-center justify-center")}
				>
					<Ink.Provider value="ink-body">
						<Icon name="X" fit="meta" />
					</Ink.Provider>
				</Press>
			) : null}
		</FadingView>
	);
}
