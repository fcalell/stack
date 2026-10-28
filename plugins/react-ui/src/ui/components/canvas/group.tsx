import { cn } from "@fcalell/ui-core/cn";
import { CANVAS_GROUP_HEAD, canvasGroup } from "@fcalell/ui-core/variants";
import type { FocusEvent } from "react";
import { spacing } from "../../lib/media.ts";
import { UNZOOM, UNZOOM_VAR } from "./floor.ts";
import type { Box } from "./geometry.ts";
import type { Transform } from "./view.ts";
import { useViewportValue, type Viewport } from "./viewport.ts";

const FRAME = "absolute flex flex-col pointer-events-none";
const HEAD = "flex items-center";
const HEAD_TEXT = "min-w-0 truncate";
// Under the text floor the head keeps its size on screen: the layer's scale is
// taken back (`UNZOOM`) about the frame's top left, and its width is the
// frame's on screen, so a long head truncates inside the frame.
const UNZOOMED = "origin-top-left";
const UNZOOMED_STYLE = {
	...UNZOOM,
	width: `calc(100% / var(${UNZOOM_VAR}))`,
};
const CONTROL = "pointer-events-auto text-start";

// How far the head's words stand in from its frame's start, in the head's own
// pixels: as far as the pane's start stands past the frame's, so a frame that
// runs off the pane's start keeps its head's words in view (its band stays
// across the frame), up to the frame's end less a head's padding and a little
// room for the words. Under the text floor the head draws at its own size on
// screen, so the flow's distance is taken at the scale.
function headShift(box: Box, view: Transform, below: boolean): number {
	const pad = spacing("pad");
	const past = -view.x / view.k - box.x;
	const most = box.width - (4 * pad) / (below ? view.k : 1);
	const flow = Math.max(0, Math.min(past, most));
	return Math.round(below ? flow * view.k : flow);
}
const HOVERED = "hover:border-edge-hover";
const FOCUSED = "focus-visible:outline-2 focus-visible:outline-ring";

// A group's dashed frame and its head, standing in flow coordinates around
// the nodes it holds. The frame takes no pointer, so a drag that starts on it
// pans; with `onSelect` the head alone is a button that chooses the group's
// id. Under the text floor the head stays, at its own size on screen. Its
// words stay in view while the frame runs off the pane's start (`headShift`).
export function GroupFrame({
	id,
	head,
	box,
	below,
	viewport,
	selected,
	onSelect,
	onFocusVisible,
}: {
	id: string;
	head: string;
	box: Box;
	below: boolean;
	viewport: Viewport;
	selected: boolean;
	onSelect?: (id: string | null) => void;
	onFocusVisible: (id: string) => void;
}) {
	const shift = useViewportValue(viewport, (view) =>
		headShift(box, view, below),
	);
	const text = <span className={HEAD_TEXT}>{head}</span>;
	// The head's start padding and the shift, a distance known at run time.
	const style = {
		...(below ? UNZOOMED_STYLE : undefined),
		...(shift > 0
			? { paddingInlineStart: `calc(var(--spacing-pad) + ${shift}px)` }
			: undefined),
	};
	const classes = cn(CANVAS_GROUP_HEAD, HEAD, below && UNZOOMED);
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
			{onSelect && head ? (
				<button
					type="button"
					onClick={() => onSelect(id)}
					onFocus={focused}
					style={style}
					className={cn(classes, CONTROL, HOVERED, FOCUSED)}
				>
					{text}
				</button>
			) : (
				<div style={style} className={classes}>
					{text}
				</div>
			)}
		</div>
	);
}
