import { cn } from "@fcalell/ui-core/cn";
import {
	GROUP_ITEM,
	lineBox,
	SLIDER,
	SLIDER_HEAD,
	SLIDER_TRACK,
	skeleton,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import { GroundContext } from "../../lib/ground.ts";

const BOX = "flex flex-col justify-center";
const HEAD = "flex items-center justify-between";
const LINE = "flex items-center h-lh";
const LABEL_WAIT = "grow";
const VALUE_WAIT = "justify-end shrink-0";
const TRACK_WAIT = "flex items-center";
const BAR = "w-full";

/** A Slider waiting: its label's and value's bars in their line boxes over a bar in the track's box, at the loaded Slider's height. Outside the package's exports. */
export function SliderWait() {
	// In a Group the slider is one of its items, at the card's inset.
	const item = use(GroundContext) === "group" && GROUP_ITEM;
	return (
		<div aria-hidden className={cn(SLIDER, item, BOX)}>
			<div className={cn(SLIDER_HEAD, HEAD)}>
				<span className={cn(lineBox({ role: "body" }), LINE, LABEL_WAIT)}>
					<span className={cn(skeleton({ kind: "line" }), "w-1/3")} />
				</span>
				<span
					className={cn(lineBox({ role: "meta" }), LINE, VALUE_WAIT, "w-1/12")}
				>
					<span className={cn(skeleton({ kind: "line" }), BAR)} />
				</span>
			</div>
			<div className={cn(SLIDER_TRACK, TRACK_WAIT)}>
				<span className={cn(skeleton({ kind: "line" }), BAR)} />
			</div>
		</div>
	);
}
