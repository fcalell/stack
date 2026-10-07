import { Slider as Base } from "@base-ui/react/slider";
import { cn } from "@fcalell/ui-core/cn";
import {
	GROUP_ITEM,
	SLIDER,
	SLIDER_FILL,
	SLIDER_HEAD,
	SLIDER_LABEL,
	SLIDER_REST,
	SLIDER_THUMB,
	SLIDER_TRACK,
	SLIDER_VALUE,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { GroundContext } from "../../lib/ground.ts";

const BOX = "flex flex-col justify-center";
const HEAD = "flex items-center justify-between";
const LABEL = "truncate data-disabled:text-ink-disabled";
const VALUE = "shrink-0 data-disabled:text-ink-disabled";
const TRACK = "group relative flex items-center";
const FILL =
	"grow group-hover:bg-toggle-on-hover group-active:bg-toggle-on-hover group-data-disabled:bg-ink-disabled";
const THUMB =
	"relative shrink-0 overflow-hidden has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring data-disabled:border-edge data-disabled:bg-fill-disabled";
const WASH =
	"absolute inset-0 not-in-data-disabled:group-hover:bg-wash-hover not-in-data-disabled:group-active:bg-wash-press";
const GAP = "shrink-0 size-thumb";
const REST = "grow";

/** A number picked along a range, its label over the track. */
export interface SliderProps extends Closed {
	/** What it sets, drawn over the track and naming the thumb. */
	label: string;
	/** The value, between `min` and `max`. */
	value: number;
	/** Hears each value the viewer moves it to. */
	onChange: (value: number) => void;
	/** The value at the track's start. */
	min: number;
	/** The value at the track's end. */
	max: number;
	/** The distance between two values it can take; 1 unless set. */
	step?: number;
	/** An Intl unit identifier (`minute`, `percent`), formatted after the value in the viewer's locale. */
	unit?: string;
}

/** A slider's label and value over its track: the fill up to the thumb, the rest after it. In a `Group` it stands as one of the card's items at the card's inset, the group's hairline between. */
export function Slider({
	label,
	value,
	onChange,
	min,
	max,
	step,
	unit,
}: SliderProps) {
	// In a Group the slider is one of its items, at the card's inset.
	const item = use(GroundContext) === "group" && GROUP_ITEM;
	// The fill and the rest share the track less the thumb in proportion to
	// the value, and the thumb, positioned by Base UI at the same point with
	// `edge` alignment, sits in the gap between them, so neither runs under it.
	return (
		<Base.Root
			value={value}
			onValueChange={(next) => onChange(next)}
			min={min}
			max={max}
			step={step}
			format={unit ? { style: "unit", unit } : undefined}
			thumbAlignment="edge"
			className={cn(SLIDER, item, BOX)}
		>
			<div className={cn(SLIDER_HEAD, HEAD)}>
				<Base.Label className={cn(SLIDER_LABEL, LABEL)}>{label}</Base.Label>
				<Base.Value className={cn(SLIDER_VALUE, VALUE)} />
			</div>
			<Base.Control className={cn(SLIDER_TRACK, TRACK)}>
				<span
					className={cn(SLIDER_FILL, FILL)}
					style={{ flexGrow: value - min }}
				/>
				<span className={GAP} />
				<span
					className={cn(SLIDER_REST, REST)}
					style={{ flexGrow: max - value }}
				/>
				<Base.Thumb className={cn(SLIDER_THUMB, THUMB)}>
					<span className={WASH} />
				</Base.Thumb>
			</Base.Control>
		</Base.Root>
	);
}
