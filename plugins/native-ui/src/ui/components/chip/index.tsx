import type { ChipFamily } from "@fcalell/ui-core/tokens";
import { chip, text } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";

export interface ChipProps extends Closed {
	label: string;
	family: ChipFamily;
}

// A data value's tag on its family's fill: the app gives each family of
// values (a type, a source, a destination) one of the six, so a chip's
// meaning is learnable across screens. It carries no act; a state is a
// `Status`, never a chip. React Native inherits no text style, so the label
// takes the role and the ink the cell names.
export function Chip({ label, family }: ChipProps) {
	return (
		<View className={cn(chip({ family }), "self-start")}>
			<RNText
				numberOfLines={1}
				className={cn(text({ role: "caption" }), "text-ink-body")}
			>
				{label}
			</RNText>
		</View>
	);
}
