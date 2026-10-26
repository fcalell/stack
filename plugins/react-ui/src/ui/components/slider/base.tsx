import { Slider as Base } from "@base-ui/react/slider";
import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import {
	ANSWER,
	SLIDER,
	SLIDER_FILL,
	SLIDER_HEAD,
	SLIDER_LABEL,
	SLIDER_REST,
	SLIDER_THUMB,
	SLIDER_TRACK,
	SLIDER_VALUE,
} from "@fcalell/ui-core/variants";
import type { CSSProperties } from "react";
import { PAINT_CONTROL } from "../../lib/paint.tsx";
import type { SliderProps } from "./index.tsx";

const BOX = "flex flex-col justify-center";
const HEAD = "flex items-center justify-between";
const LABEL = "truncate data-disabled:text-ink-disabled";
const VALUE = "shrink-0 truncate data-disabled:text-ink-disabled";
// The track's inline padding is half the knob, so Base UI maps the pointer over
// the track less the knob, the knob's centre's travel; the fill and the rest
// run over that padding to the track's ends.
const TRACK =
	"group relative flex items-center px-[calc(var(--spacing-thumb)/2)]";
// The fill and the rest stand a knob's width apart: the fill's end margin is
// the knob's room (the thumb itself is out of the flow), not an element.
const FILL =
	"grow -ms-[calc(var(--spacing-thumb)/2)] me-thumb group-hover:bg-toggle-on-hover group-active:bg-toggle-on-hover group-data-disabled:bg-ink-disabled";
// The thumb is the target-sized hit box, its centre on the gap between the fill
// and the rest: the fill's width plus half the knob (`--share`, the value's
// share of the range), set by CSS from the first frame. It holds the knob and
// Base UI's range input, whose box is the thumb's, so the target is the box
// and the knob stays the drawn size.
const THUMB =
	"group/thumb [inset-inline-start:calc((100%-var(--spacing-thumb))*var(--share)+var(--spacing-thumb)/2)]! flex size-target items-center justify-center";
const KNOB =
	"relative shrink-0 overflow-hidden group-has-focus-visible/thumb:outline-2 group-has-focus-visible/thumb:outline-offset-2 group-has-focus-visible/thumb:outline-ring group-data-disabled/thumb:border-edge group-data-disabled/thumb:bg-fill-disabled";
const WASH = `absolute inset-0 ${ANSWER} not-in-data-disabled:group-hover:bg-wash-hover not-in-data-disabled:group-active:bg-wash-press`;
const REST =
	"grow -me-[calc(var(--spacing-thumb)/2)] group-data-disabled:bg-edge";

/** The label, value and track every Slider renders, on the `draft` its host holds: a field hosts the draft of its slider and draws a rejection in its own line. Painted, the label stands and the value and the track are filled, at the same height. Outside the package's exports. */
export function SliderBase({
	label,
	draft,
	onChange,
	onCommit,
	min,
	max,
	step,
	unit,
}: Omit<SliderProps, "value"> & { draft: Draft<number> }) {
	// A read that ended leaves the track with no value, blocked.
	const ended = draft.ended !== undefined;
	const painted = draft.painted && !ended;
	// Painted or ended, the thumb rests at the start: the value is the placeholder.
	const at = draft.painted ? min : draft.value;
	// The fill and the rest share the track less the knob in proportion to
	// the value, and the knob sits in the gap between them, so neither runs
	// under it. Base UI's `center` alignment places the thumb by the value
	// alone, measuring nothing, and maps the pointer over the track's content
	// box, the track less the knob.
	const share =
		max > min ? Math.min(1, Math.max(0, (at - min) / (max - min))) : 0;
	return (
		<Base.Root
			value={at}
			onValueChange={(next) => {
				draft.change(next);
				if (!ended) onChange(next);
			}}
			onValueCommitted={(next) => {
				if (onCommit) draft.change(next, () => onCommit(next));
			}}
			min={min}
			max={max}
			step={step}
			format={unit ? { style: "unit", unit } : undefined}
			thumbAlignment="center"
			className={cn(SLIDER, BOX)}
			// Base UI marks a disabled slider with `data-disabled` alone; the label
			// and value read as disabled to a checker through `aria-disabled` here.
			render={(root, state) => (
				<div
					{...root}
					aria-disabled={state.disabled || ended || undefined}
					inert={painted || undefined}
				/>
			)}
		>
			<div className={cn(SLIDER_HEAD, HEAD)}>
				<Base.Label className={cn(SLIDER_LABEL, LABEL)}>{label}</Base.Label>
				<Base.Value
					className={cn(SLIDER_VALUE, VALUE, draft.painted && "invisible")}
				/>
			</div>
			<Base.Control
				className={cn(
					SLIDER_TRACK,
					TRACK,
					painted && cn(PAINT_CONTROL, "*:invisible"),
				)}
				style={{ "--share": share } as CSSProperties}
			>
				<span
					className={cn(SLIDER_FILL, FILL)}
					style={{ flexGrow: at - min }}
				/>
				<span
					className={cn(SLIDER_REST, REST)}
					style={{ flexGrow: max - at }}
				/>
				{/* Named by the label's text itself: Base UI's reference to the label's element reads as no label to a checker once the label is scrolled out of view, leaving the description. */}
				<Base.Thumb
					aria-label={label}
					className={cn(THUMB, ended && "opacity-0")}
				>
					<span className={cn(SLIDER_THUMB, KNOB)}>
						<span className={WASH} />
					</span>
				</Base.Thumb>
			</Base.Control>
		</Base.Root>
	);
}
