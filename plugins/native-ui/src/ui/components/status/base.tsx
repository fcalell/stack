import type { StatusState } from "@fcalell/ui-core/descriptors";
import { STATUS, STATUS_LABEL, statusDot } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import {
	clipWhen,
	inertProps,
	Painted,
	paintBox,
	useShown,
} from "../../lib/paint";
import { useWords } from "../../lib/words";
import { StatusDot } from "./dot";

const BOX = "flex-row items-center min-w-0";
const WORD = "shrink";
const DOT = "shrink-0";

/** What every status draws: the public `Status`, or `painted` (the dot's box and a word's filler while the status's data is not here). Outside the package's exports. */
export function StatusBase(
	props:
		| {
				state: StatusState;
				label?: string;
				painted?: never;
		  }
		| { painted: true },
) {
	const words = useWords();
	const shown = useShown(props.painted === true);
	if (props.painted)
		return (
			<View {...inertProps(true)} className={cn(STATUS, BOX)}>
				<View
					className={cn(statusDot({ state: "done" }), DOT, paintBox(shown))}
				/>
				<RNText
					numberOfLines={1}
					{...clipWhen(true)}
					className={cn(STATUS_LABEL, WORD)}
				>
					<Painted role="word" />
				</RNText>
			</View>
		);
	const label = props.label ?? words[props.state];
	return (
		<View className={cn(STATUS, BOX)}>
			<StatusDot state={props.state} />
			<RNText numberOfLines={1} className={cn(STATUS_LABEL, WORD)}>
				{label}
			</RNText>
		</View>
	);
}
