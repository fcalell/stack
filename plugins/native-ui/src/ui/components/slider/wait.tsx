import {
	GROUP_ITEM,
	SLIDER,
	SLIDER_HEAD,
	SLIDER_TRACK,
	skeleton,
} from "@fcalell/ui-core/variants";
import { useContext } from "react";
import { View } from "react-native";
import { cn } from "../../lib/cn";
import { GroundContext } from "../../lib/ground";
import { Strut } from "../../lib/strut";

const HEAD = "flex-row items-center justify-between";
// A loading line stands in its text's line box: a zero-width line of the
// role beside the bar, so the waiting slider keeps the loaded one's height.
const LINE = "flex-row items-center";
const LABEL_WAIT = "grow";
const VALUE_WAIT = "justify-end shrink-0";
const TRACK_WAIT = "flex-row items-center";
const BAR = "w-full";

// A Slider waiting: its label's and value's bars in their line boxes over a
// bar in the track's box, at the loaded Slider's height. Outside the
// package's exports.
export function SliderWait() {
	// In a Group the slider is one of its items, at the card's inset.
	const item = useContext(GroundContext) === "group" && GROUP_ITEM;
	return (
		<View className={cn(SLIDER, item, "justify-center")}>
			<View className={cn(SLIDER_HEAD, HEAD)}>
				<View className={cn(LINE, LABEL_WAIT)}>
					<Strut role="body" />
					<View className={cn(skeleton({ kind: "line" }), "w-1/3")} />
				</View>
				<View className={cn(LINE, VALUE_WAIT, "w-1/12")}>
					<Strut role="meta" />
					<View className={cn(skeleton({ kind: "line" }), BAR)} />
				</View>
			</View>
			<View className={cn(SLIDER_TRACK, TRACK_WAIT)}>
				<View className={cn(skeleton({ kind: "line" }), BAR)} />
			</View>
		</View>
	);
}
