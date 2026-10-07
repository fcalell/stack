import { cn } from "@fcalell/ui-core/cn";
import { CANVAS_GROUP, CANVAS_GROUP_HEAD } from "@fcalell/ui-core/variants";
import type { Box } from "./geometry.ts";

const FRAME = "absolute flex flex-col pointer-events-none";
const HEAD = "flex items-center";
const HEAD_TEXT = "min-w-0 truncate";
const HIDDEN = "invisible";

// A group's dashed frame and its head, standing in flow coordinates around
// the nodes it holds. It takes no pointer, so a drag that starts on it pans.
// Under the text floor the head keeps its place and draws nothing.
export function GroupFrame({
	id,
	head,
	box,
	below,
}: {
	id: string;
	head: string;
	box: Box;
	below: boolean;
}) {
	return (
		// The frame's rectangle is a coordinate of the flow, known at run time.
		<div
			data-group={id}
			className={cn(CANVAS_GROUP, FRAME)}
			style={{
				left: box.x,
				top: box.y,
				width: box.width,
				height: box.height,
			}}
		>
			<div className={cn(CANVAS_GROUP_HEAD, HEAD, below && HIDDEN)}>
				<span className={HEAD_TEXT}>{head}</span>
			</div>
		</div>
	);
}
