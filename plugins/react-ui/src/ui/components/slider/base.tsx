import { Slider as Base } from "@base-ui/react/slider";
import type { Draft } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import {
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
const TRACK = "group relative flex items-center";
const FILL =
	"grow group-hover:bg-toggle-on-hover group-active:bg-toggle-on-hover group-data-disabled:bg-ink-disabled";
// Base UI places an edge-aligned thumb from a measure it takes after mount and
// hides it until then, so the thumb stands by CSS from the value (`--share`,
// the value's share of the range) on the first frame: the fill's width plus half
// the thumb, the point the gap between the fill and the rest centres on.
const THUMB =
	"[inset-inline-start:calc((100%-var(--spacing-thumb))*var(--share)+var(--spacing-thumb)/2)]! visible! relative shrink-0 overflow-hidden has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring data-disabled:border-edge data-disabled:bg-fill-disabled";
const WASH =
	"absolute inset-0 not-in-data-disabled:group-hover:bg-wash-hover not-in-data-disabled:group-active:bg-wash-press";
const GAP = "shrink-0 size-thumb";
const REST = "grow group-data-disabled:bg-edge";

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
	const painted = draft.painted;
	// Painted, the thumb rests at the start: the value is the placeholder.
	const at = painted ? min : draft.value;
	// The fill and the rest share the track less the thumb in proportion to
	// the value, and the thumb, held at the same point with `edge` alignment (the
	// pointer maps the track less the thumb), sits in the gap between them, so
	// neither runs under it.
	const share =
		max > min ? Math.min(1, Math.max(0, (at - min) / (max - min))) : 0;
	return (
		<Base.Root
			value={at}
			onValueChange={(next) => {
				draft.change(next);
				onChange(next);
			}}
			onValueCommitted={(next) => {
				if (onCommit) draft.change(next, () => onCommit(next));
			}}
			min={min}
			max={max}
			step={step}
			format={unit ? { style: "unit", unit } : undefined}
			thumbAlignment="edge"
			className={cn(SLIDER, BOX)}
			// Base UI marks a disabled slider with `data-disabled` alone; the label
			// and value read as disabled to a checker through `aria-disabled` here.
			render={(root, state) => (
				<div
					{...root}
					aria-disabled={state.disabled || undefined}
					inert={painted || undefined}
				/>
			)}
		>
			<div className={cn(SLIDER_HEAD, HEAD)}>
				<Base.Label className={cn(SLIDER_LABEL, LABEL)}>{label}</Base.Label>
				<Base.Value
					className={cn(SLIDER_VALUE, VALUE, painted && "invisible")}
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
				<span className={GAP} />
				<span
					className={cn(SLIDER_REST, REST)}
					style={{ flexGrow: max - at }}
				/>
				<Base.Thumb className={cn(SLIDER_THUMB, THUMB)}>
					<span className={WASH} />
				</Base.Thumb>
			</Base.Control>
		</Base.Root>
	);
}
