import type { StatusState } from "@fcalell/ui-core/descriptors";
import { STATUS, STATUS_LABEL } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { useWords } from "../../lib/words";
import { StatusDot } from "./dot";

export interface StatusProps extends Closed {
	state: StatusState;
	label?: string;
}

// A dot in the state's colour beside its word in meta ink, a mark: a status
// that moves is a `Picker` whose options carry states.
export function Status({ state, label }: StatusProps) {
	const words = useWords();
	return (
		<View className={cn(STATUS, "flex-row items-center min-w-0")}>
			<StatusDot state={state} />
			<RNText numberOfLines={1} className={cn(STATUS_LABEL, "shrink")}>
				{label ?? words[state]}
			</RNText>
		</View>
	);
}
