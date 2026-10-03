import type { StatusState } from "@fcalell/ui-core/descriptors";
import { STATUS, STATUS_LABEL, skeleton } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { useWords } from "../../lib/words";
import { StatusDot } from "./dot";

const BOX = "flex-row items-center min-w-0";
const WORD = "shrink";
// Waiting, the dot's and the word's skeletons fill what the status will.
const WAIT = "flex-row items-center grow min-w-0";
const DOT_WAIT = "shrink-0";
const WORD_WAIT = { third: "w-1/3", half: "w-1/2" } as const;

/** What every status draws: the public `Status`, or its loading form a composer draws (a table's waiting status cell), the word's bar at a share of the cell. Outside the package's exports. */
export function StatusBase(
	props:
		| { state: StatusState; label?: string; waiting?: never }
		| { waiting: keyof typeof WORD_WAIT },
) {
	const words = useWords();
	if (props.waiting)
		return (
			<View className={cn(STATUS, WAIT)}>
				<View className={cn(skeleton({ kind: "dot" }), DOT_WAIT)} />
				<View
					className={cn(skeleton({ kind: "line" }), WORD_WAIT[props.waiting])}
				/>
			</View>
		);
	return (
		<View className={cn(STATUS, BOX)}>
			<StatusDot state={props.state} />
			<RNText numberOfLines={1} className={cn(STATUS_LABEL, WORD)}>
				{props.label ?? words[props.state]}
			</RNText>
		</View>
	);
}
