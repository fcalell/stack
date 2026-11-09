import { cn } from "@fcalell/ui-core/cn";
import { CANVAS_GROUP_HEAD, canvasGroup } from "@fcalell/ui-core/variants";
import type { FocusEvent } from "react";
import { spacing } from "../../lib/media.ts";
import { UNZOOM, UNZOOM_VAR } from "./floor.ts";
import type { Box } from "./geometry.ts";
import type { Transform } from "./view.ts";
import { useViewportValue, type Viewport } from "./viewport.ts";

const FRAME = "absolute flex flex-col pointer-events-none";
// The head band stands over the edges that cross it into the frame, so no
// edge strikes through its words: the band's ground covers them.
const HEAD = "relative z-1 flex items-center";
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
// pixels: as far as the zoom stack's column (`clear.left`, from the pane's
// start) stands past the frame's start where the head stands in the stack's
// rows (`clear.stack`, up from the pane's foot), else as far as the pane's start,
// so a frame that runs under the stack or off the pane's start keeps its head's
// words in view and clear of the stack (its band stays across the frame), up to
// the frame's end less a head's padding and a little room for the words. A head
// above the stack's rows has no stack to clear: a frame of a few glyphs gives it
// its whole width. Under the text floor the head draws at its own size on
// screen, so the flow's distance is taken at the scale.
function headShift(
	box: Box,
	view: Transform,
	below: boolean,
	clear: Clear,
	pane: { width: number; height: number },
): number {
	const pad = spacing("pad");
	const top = box.y * view.k + view.y;
	const band = spacing("control") * (below ? 1 : view.k);
	const stood = top + band > pane.height - clear.stack && top < pane.height;
	const past = ((stood ? clear.left : 0) - view.x) / view.k - box.x;
	const most = box.width - (4 * pad) / (below ? view.k : 1);
	const flow = Math.max(0, Math.min(past, most));
	return Math.round(below ? flow * view.k : flow);
}
// How far the frame's end runs past the pane's end, less the page inset, in the
// head's own pixels (as `headShift`): the head's words stop that far short of
// the frame's end, so a frame that runs off the pane's end keeps them in view.
// What the words keep is what `headShift` leaves of the frame, never less than
// the room it keeps for them.
function headEnd(
	box: Box,
	view: Transform,
	below: boolean,
	pane: number,
	shift: number,
): number {
	const pad = spacing("pad");
	const over =
		((box.x + box.width) * view.k + view.x - pane + spacing("page")) /
		(below ? 1 : view.k);
	const most = (below ? box.width * view.k : box.width) - 4 * pad - shift;
	const flow = Math.max(0, Math.min(over, most));
	return Math.round(flow);
}
// What the zoom stack takes from the pane: the columns it reaches across and the
// rows it reaches up.
interface Clear {
	left: number;
	stack: number;
}
const HOVERED = "hover:border-edge-hover";
const FOCUSED =
	"in-data-[modality=keyboard]:focus-visible:outline-2 focus-visible:outline-ring";

// A group's dashed frame and its head, standing in flow coordinates around
// the nodes it holds. The frame takes no pointer, so a drag that starts on it
// pans; with `onSelect` the head alone is a button that chooses the group's
// id. Under the text floor the head stays, at its own size on screen. Its
// words stay in view, past the zoom stack, while the frame runs under the stack
// or off the pane's start (`headShift`).
export function GroupFrame({
	id,
	head,
	box,
	below,
	clear,
	viewport,
	selected,
	onSelect,
	onFocusVisible,
}: {
	id: string;
	head: string;
	box: Box;
	below: boolean;
	// The zoom stack's column, from the pane's start, and its rows, up from the
	// pane's foot (`headShift`).
	clear: Clear;
	viewport: Viewport;
	selected: boolean;
	onSelect?: (id: string | null) => void;
	onFocusVisible: (id: string) => void;
}) {
	const shift = useViewportValue(viewport, (view) =>
		headShift(box, view, below, clear, viewport.size()),
	);
	const stop = useViewportValue(viewport, (view) =>
		headEnd(box, view, below, viewport.size().width, shift),
	);
	const text = <span className={HEAD_TEXT}>{head}</span>;
	// The head's start and end padding and the shifts, distances known at run time.
	const style = {
		...(below ? UNZOOMED_STYLE : undefined),
		...(shift > 0
			? { paddingInlineStart: `calc(var(--spacing-pad) + ${shift}px)` }
			: undefined),
		...(stop > 0
			? { paddingInlineEnd: `calc(var(--spacing-pad) + ${stop}px)` }
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
