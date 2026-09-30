import type { StatusState } from "@fcalell/ui-core/descriptors";
import {
	STATUS,
	STATUS_LABEL,
	STATUS_OPEN,
	statusDot,
} from "@fcalell/ui-core/variants";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useWords } from "../../lib/words";

export interface StatusProps extends Closed {
	state: StatusState;
	label?: string;
	onOpen?: () => void;
}

// A dot in the state's colour beside its word in meta ink. With `onOpen` it is
// a pill that pulls back by its own padding, so the dot and the word sit where
// a static status's do; it hugs its content, so its wash is the pill's.
export function Status({ state, label, onOpen }: StatusProps) {
	const words = useWords();
	const word = label ?? words[state];
	const inner = (
		<>
			<View className={statusDot({ state })} />
			<RNText numberOfLines={1} className={cn(STATUS_LABEL, "shrink")}>
				{word}
			</RNText>
		</>
	);
	if (!onOpen) {
		return (
			<View className={cn(STATUS, "flex-row items-center min-w-0")}>
				{inner}
			</View>
		);
	}
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={word}
			onPress={onOpen}
			className={cn(
				STATUS,
				STATUS_OPEN,
				"flex-row items-center min-w-0 self-start active:bg-wash-press",
			)}
		>
			{inner}
		</Pressable>
	);
}
