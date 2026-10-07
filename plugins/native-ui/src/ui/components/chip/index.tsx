import type { ChipFamily } from "@fcalell/ui-core/tokens";
import { chip, chipLabel, REMOVE_HIT } from "@fcalell/ui-core/variants";

import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Ink } from "../../lib/ink";
import { useWords } from "../../lib/words";
import { Icon } from "../icon";

export interface ChipProps extends Closed {
	label: string;
	family: ChipFamily;
	onRemove?: () => void;
}

// A data value's tag on its family's soft ground, hugging its content; its
// one act removes the value, a round hit box the chip's height closing its
// right end. A lucide glyph takes a number and a colour, so the remove mark's
// size is resolved and its ink is the family's, which the web inherits.
export function Chip({ label, family, onRemove }: ChipProps) {
	const words = useWords();
	return (
		<View
			className={cn(
				chip({ family, trailing: onRemove ? "remove" : "none" }),
				"flex-row items-center min-w-0 self-start",
			)}
		>
			<RNText numberOfLines={1} className={cn(chipLabel({ family }), "shrink")}>
				{label}
			</RNText>
			{onRemove ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`${words.remove} ${label}`}
					onPress={onRemove}
					className={cn(
						REMOVE_HIT,
						"items-center justify-center active:bg-wash-press",
					)}
				>
					<Ink.Provider value={`chip-${family}-ink`}>
						<Icon name="X" fit="meta" />
					</Ink.Provider>
				</Pressable>
			) : null}
		</View>
	);
}
