import { cn } from "@fcalell/ui-core/cn";
import {
	ACTION_BAR_ACTS,
	type ActionBarFit,
	actionBar,
	skeleton,
} from "@fcalell/ui-core/variants";

// The acts row of the loaded bar (`./index.tsx`): at its end at the acts'
// natural width, or across the container with each act at the field's height;
// on touch one act per row.
const BAR: Record<ActionBarFit, string> = {
	end: "flex flex-col items-end touch:items-stretch",
	full: "flex flex-col",
};
const ACTS: Record<ActionBarFit, string> = {
	end: "flex items-center justify-end touch:flex-col touch:items-stretch",
	full: "grid grid-flow-col auto-cols-fr touch:flex touch:flex-col",
};
// An act at the end stands in the control's box, the bar filling it; the
// natural width of an act is a short label's measure.
const ACT_END = "flex min-h-control w-measure-short touch:w-full";
const FILL = "grow";

/** An ActionBar waiting: `count` act-shaped bars at the loaded geometry (the control's box at the end, the field's height across, one per row on touch) and no text. Outside the package's exports. */
export function ActionBarWait(props: { fit: ActionBarFit; count: number }) {
	const { fit } = props;
	return (
		<div aria-hidden className={cn(actionBar({ fit }), BAR[fit])}>
			<div className={cn(ACTION_BAR_ACTS, ACTS[fit])}>
				{Array.from({ length: props.count }, (_, at) =>
					fit === "full" ? (
						// biome-ignore lint/suspicious/noArrayIndexKey: the bars are fixed stand-ins
						<span key={at} className={skeleton({ kind: "field" })} />
					) : (
						// biome-ignore lint/suspicious/noArrayIndexKey: the bars are fixed stand-ins
						<span key={at} className={ACT_END}>
							<span className={cn(skeleton({ kind: "bar" }), FILL)} />
						</span>
					),
				)}
			</div>
		</div>
	);
}
