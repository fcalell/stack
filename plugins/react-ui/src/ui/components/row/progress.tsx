import { cn } from "@fcalell/ui-core/cn";
import { levelOf } from "@fcalell/ui-core/list-state";
import {
	METER_TRACK,
	meterFill,
	ROW_PROGRESS,
} from "@fcalell/ui-core/variants";
import type { CSSProperties } from "react";

/** A row's progress: a running task's `value` of its `max` as the meter's bar along the row's foot, at the text column's start, a badge gap under the facts. It fills in the meta ink and turns the good tone once it reaches `max`, never amber. Outside the package's exports. */
export function RowProgress(props: {
	value: number;
	max: number;
	name: string;
}) {
	const { value, max, name } = props;
	if (!(max > 0)) return null;
	const share = Math.min(Math.max(value / max, 0), 1);
	return (
		<div className={ROW_PROGRESS}>
			<div
				role="progressbar"
				aria-label={name}
				aria-valuemin={0}
				aria-valuemax={max}
				aria-valuenow={Math.min(Math.max(value, 0), max)}
				className={cn(METER_TRACK, "pointer-events-none")}
			>
				<div
					className={meterFill({ level: levelOf(share, undefined, true) })}
					// The fill is the whole track scaled to the task's share.
					style={{ "--fill": share } as CSSProperties}
				/>
			</div>
		</div>
	);
}
