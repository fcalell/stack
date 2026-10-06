import { cn } from "@fcalell/ui-core/cn";
import { CANVAS_GROUP, CANVAS_GROUP_HEAD } from "@fcalell/ui-core/variants";
import type { Box } from "./geometry.ts";

const FRAME = "absolute flex flex-col pointer-events-none";
const HEAD = "flex items-center";
const HEAD_TEXT = "min-w-0 truncate";

// A group's dashed frame and its head, standing in flow coordinates around
// the nodes it holds. It takes no pointer, so a drag that starts on it pans.
export function GroupFrame({ head, box }: { head: string; box: Box }) {
	return (
		// The frame's rectangle is a coordinate of the flow, known at run time.
		<div
			className={cn(CANVAS_GROUP, FRAME)}
			style={{
				left: box.x,
				top: box.y,
				width: box.width,
				height: box.height,
			}}
		>
			<div className={cn(CANVAS_GROUP_HEAD, HEAD)}>
				<span className={HEAD_TEXT}>{head}</span>
			</div>
		</div>
	);
}
