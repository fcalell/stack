import type { Tone } from "@fcalell/ui-core/descriptors";
import { STATUS, STATUS_LABEL, statusDot } from "@fcalell/ui-core/variants";
import { Text as RNText, View } from "react-native";
import { cn } from "../../lib/cn";
import {
	clipWhen,
	inertProps,
	PAINT_BOX,
	Painted,
	PaintText,
	PaintView,
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
				tone: Tone;
				label?: string;
				painted?: never;
		  }
		| { painted: true },
) {
	const words = useWords();
	if (props.painted)
		return (
			<View {...inertProps(true)} className={cn(STATUS, BOX)}>
				<PaintView
					painted
					className={cn(statusDot({ tone: "done" }), DOT, PAINT_BOX)}
				/>
				<PaintText
					fills="word"
					painted
					numberOfLines={1}
					{...clipWhen(true)}
					className={cn(STATUS_LABEL, WORD)}
				>
					<Painted role="word" />
				</PaintText>
			</View>
		);
	const label = props.label ?? words[props.tone];
	return (
		<View className={cn(STATUS, BOX)}>
			<StatusDot tone={props.tone} />
			<RNText numberOfLines={1} className={cn(STATUS_LABEL, WORD)}>
				{label}
			</RNText>
		</View>
	);
}
