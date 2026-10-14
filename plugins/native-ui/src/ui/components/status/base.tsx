import type { StatusState } from "@fcalell/ui-core/descriptors";
import {
	STATUS,
	STATUS_LABEL,
	skeleton,
	statusDot,
} from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { inertProps, Painted, paintBox, useShown } from "../../lib/paint";
import { useWords } from "../../lib/words";
import { StatusDot } from "./dot";

const BOX = "flex-row items-center min-w-0";
const WORD = "shrink";
const DOT = "shrink-0";
// Waiting, the dot's and the word's skeletons fill what the status will.
const WAIT = "flex-row items-center grow min-w-0";
const DOT_WAIT = "shrink-0";
const WORD_WAIT = {
	third: "w-1/3",
	half: "w-1/2",
	short: "w-measure-short",
} as const;
// A row's status on its way: the bar stands where the word will, so the dot's
// room is kept unseen and the bar is a short label wide at most.
const DOT_ROOM = "opacity-0 shrink-0";

/** What every status draws: the public `Status`, or its loading form a composer draws (a table's waiting status cell), the word's bar at a share of the cell, or `painted` (the dot's box and a word's filler while the status's data is not here; `waiting` goes with the List's waiting forms). Outside the package's exports. */
export function StatusBase(
	props:
		| {
				state: StatusState;
				label?: string;
				waiting?: never;
				painted?: never;
		  }
		| { waiting: keyof typeof WORD_WAIT; painted?: never }
		| { painted: true; waiting?: never },
) {
	const words = useWords();
	const shown = useShown(props.painted === true);
	if (props.painted)
		return (
			<View {...inertProps(true)} className={cn(STATUS, BOX)}>
				<View
					className={cn(statusDot({ state: "done" }), DOT, paintBox(shown))}
				/>
				<RNText numberOfLines={1} className={cn(STATUS_LABEL, WORD)}>
					<Painted role="word" />
				</RNText>
			</View>
		);
	if (props.waiting)
		return (
			<View className={cn(STATUS, WAIT)}>
				<View
					className={
						props.waiting === "short"
							? cn(statusDot({ state: "done" }), DOT_ROOM)
							: cn(skeleton({ kind: "dot" }), DOT_WAIT)
					}
				/>
				<View
					className={cn(skeleton({ kind: "line" }), WORD_WAIT[props.waiting])}
				/>
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
