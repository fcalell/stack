import type { StatusState } from "@fcalell/ui-core/descriptors";
import {
	STATUS_CHIP,
	status,
	statusContentTone,
} from "@fcalell/ui-core/variants";
import {
	CircleAlert,
	CircleCheck,
	CircleDot,
	CirclePause,
	CircleX,
	Clock,
	type LucideIcon,
} from "lucide-react-native";
import { Pressable, Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Glyph } from "../../lib/glyph";
import { useWords } from "../../lib/words";

export interface StatusProps extends Closed {
	state: StatusState;
	label?: string;
	onOpen?: () => void;
}

const MARK: Record<StatusState, LucideIcon> = {
	active: CircleDot,
	waiting: Clock,
	done: CircleCheck,
	attention: CircleAlert,
	failed: CircleX,
	idle: CirclePause,
};

// An icon and a word; the color follows the state. With `onOpen` it is a chip.
export function Status({ state, label, onOpen }: StatusProps) {
	const words = useWords();
	const word = label ?? words[state];
	const inner = (
		<>
			<Glyph icon={MARK[state]} tone={statusContentTone(state)} size={16} />
			<RNText className={status({ state })}>{word}</RNText>
		</>
	);
	if (onOpen) {
		return (
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={word}
				onPress={onOpen}
				className={cn(
					STATUS_CHIP,
					"flex-row items-center gap-pair self-start active:bg-edge",
				)}
			>
				{inner}
			</Pressable>
		);
	}
	return <View className="flex-row items-center gap-pair">{inner}</View>;
}
