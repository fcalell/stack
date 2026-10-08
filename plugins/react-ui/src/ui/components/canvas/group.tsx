import { cn } from "@fcalell/ui-core/cn";
import { CANVAS_GROUP_HEAD, canvasGroup } from "@fcalell/ui-core/variants";
import type { FocusEvent } from "react";
import type { Box } from "./geometry.ts";

const FRAME = "absolute flex flex-col pointer-events-none";
const HEAD = "flex items-center";
const HEAD_TEXT = "min-w-0 truncate";
const HIDDEN = "invisible";
const CONTROL = "pointer-events-auto text-start";
const FOCUSED = "focus-visible:outline-2 focus-visible:outline-ring";

// A group's dashed frame and its head, standing in flow coordinates around
// the nodes it holds. The frame takes no pointer, so a drag that starts on it
// pans; with `onSelect` the head alone is a button that chooses the group's
// id. Under the text floor the head keeps its place and draws nothing, and is
// no button.
export function GroupFrame({
	id,
	head,
	box,
	below,
	selected,
	onSelect,
	onFocusVisible,
}: {
	id: string;
	head: string;
	box: Box;
	below: boolean;
	selected: boolean;
	onSelect?: (id: string | null) => void;
	onFocusVisible: (id: string) => void;
}) {
	const text = <span className={HEAD_TEXT}>{head}</span>;
	const classes = cn(CANVAS_GROUP_HEAD, HEAD, below && HIDDEN);
	// A press focuses the button too, and panning then would move the frame out
	// from under the pointer: only a keyboard focus pans.
	const focused = (event: FocusEvent<HTMLButtonElement>) => {
		if (event.currentTarget.matches(":focus-visible")) onFocusVisible(id);
	};
	return (
		// The frame's rectangle is a coordinate of the flow, known at run time.
		<div
			data-group={id}
			className={cn(
				canvasGroup({ state: selected ? "selected" : "rest" }),
				FRAME,
			)}
			style={{
				left: box.x,
				top: box.y,
				width: box.width,
				height: box.height,
			}}
		>
			{onSelect && head && !below ? (
				<button
					type="button"
					onClick={() => onSelect(id)}
					onFocus={focused}
					className={cn(classes, CONTROL, FOCUSED)}
				>
					{text}
				</button>
			) : (
				<div className={classes}>{text}</div>
			)}
		</div>
	);
}
