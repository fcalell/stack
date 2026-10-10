import type { StatusState } from "@fcalell/ui-core/descriptors";
import {
	STATUS,
	STATUS_LABEL,
	skeleton,
	statusDot,
} from "@fcalell/ui-core/variants";
import { type LayoutChangeEvent, Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import { useWords } from "../../lib/words";
import { StatusDot } from "./dot";

const BOX = "flex-row items-center min-w-0";
const WORD = "shrink";
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

/** What every status draws: the public `Status`, or its loading form a composer draws (a table's waiting status cell), the word's bar at a share of the cell. `short` is drawn in the word's place while `label` stays the name; `onWord` reads the word's layout, which a row measures. Outside the package's exports. */
export function StatusBase(
	props:
		| {
				state: StatusState;
				label?: string;
				short?: string;
				onWord?: (event: LayoutChangeEvent) => void;
				waiting?: never;
		  }
		| { waiting: keyof typeof WORD_WAIT },
) {
	const words = useWords();
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
		<View
			accessible={props.short === undefined ? undefined : true}
			accessibilityLabel={props.short === undefined ? undefined : label}
			className={cn(STATUS, BOX)}
		>
			<StatusDot state={props.state} />
			<RNText
				numberOfLines={1}
				onLayout={props.onWord}
				className={cn(STATUS_LABEL, WORD)}
			>
				{props.short ?? label}
			</RNText>
		</View>
	);
}
