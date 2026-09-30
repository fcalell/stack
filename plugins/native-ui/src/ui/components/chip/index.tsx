import type { ChipFamily } from "@fcalell/ui-core/tokens";
import { chip, text } from "@fcalell/ui-core/variants";
import { X } from "lucide-react-native";
import { Pressable, Text as RNText, View } from "react-native";
import { useResolveClassNames } from "uniwind";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Glyph } from "../../lib/glyph";
import { useWords } from "../../lib/words";

export interface ChipProps extends Closed {
	label: string;
	family: ChipFamily;
	onRemove?: () => void;
}

// A data value's tag on its family's fill: the app gives each family of
// values (a type, a source, a destination) one of the six, so a chip's
// meaning is learnable across screens. Its one act is removing the value; a
// state is a `Status`, never a chip. React Native inherits no text style, so
// the label takes the role and the ink the cell names.
export function Chip({ label, family, onRemove }: ChipProps) {
	const words = useWords();
	const { width } = useResolveClassNames("size-icon-meta");
	return (
		<View
			className={cn(
				chip({ family }),
				"flex-row items-center gap-inside self-start",
			)}
		>
			<RNText
				numberOfLines={1}
				className={cn(text({ role: "caption" }), "text-ink-body")}
			>
				{label}
			</RNText>
			{onRemove ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={words.remove}
					onPress={onRemove}
				>
					<Glyph
						icon={X}
						size={typeof width === "number" ? width : undefined}
					/>
				</Pressable>
			) : null}
		</View>
	);
}
