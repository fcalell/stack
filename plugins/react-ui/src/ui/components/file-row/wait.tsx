import { cn } from "@fcalell/ui-core/cn";
import {
	ROW_LEADING,
	skeleton,
	skeletonLane,
	skeletonRow,
} from "@fcalell/ui-core/variants";
import { use } from "react";
import { GroundContext } from "../../lib/ground.ts";

const WAIT = "flex items-center";
const WAIT_LEADING = "flex shrink-0 items-center justify-center";
const WAIT_GLYPH = "shrink-0";
const WAIT_PATH = "flex grow min-w-0";
// The chip's lane and the counts' lane share the room the path leaves, each
// capped at the short measure, its bar at its end.
const WAIT_LANE = "flex basis-0 grow justify-end min-w-0 text-meta";
// The path's bar at half the row, the chip's at half its lane, the counts' at
// a third of theirs.
const PATH_BAR = "w-1/2";
const CHIP_BAR = "w-1/2";
const COUNTS_BAR = "w-1/3";

/** A FileRow waiting: the glyph, the path's bar, a chip's bar when `chip` is declared, and the counts' bar, busy when it waits alone (a list of them is busy once). Outside the package's exports. */
export function FileWait(props: { busy: boolean; chip: boolean }) {
	const ground = use(GroundContext);
	return (
		<div
			aria-busy={props.busy || undefined}
			aria-hidden={props.busy ? undefined : true}
			className={cn(
				skeletonRow({
					kind: ground === "group" ? "one-line-group" : "one-line",
				}),
				WAIT,
			)}
		>
			<span className={cn(ROW_LEADING, WAIT_LEADING)}>
				<span className={cn(skeleton({ kind: "icon" }), WAIT_GLYPH)} />
			</span>
			<span className={WAIT_PATH}>
				<span className={cn(skeleton({ kind: "line" }), PATH_BAR)} />
			</span>
			{props.chip ? (
				<span className={cn(skeletonLane({ role: "meta" }), WAIT_LANE)}>
					<span className={cn(skeleton({ kind: "line" }), CHIP_BAR)} />
				</span>
			) : null}
			<span className={cn(skeletonLane({ role: "meta" }), WAIT_LANE)}>
				<span className={cn(skeleton({ kind: "line" }), COUNTS_BAR)} />
			</span>
		</div>
	);
}
