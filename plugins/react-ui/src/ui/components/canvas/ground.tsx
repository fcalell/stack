import { cn } from "@fcalell/ui-core/cn";
import { CANVAS_GROUND, canvasNode } from "@fcalell/ui-core/variants";
import { useId } from "react";
import { Painted } from "../../lib/paint.tsx";
import { IconBase } from "../icon/index.tsx";
import { DOT, PITCH } from "./viewport.ts";

// Under `tablet` the region keeps half of the column it stands in, so the
// column scrolls past it and the head and banners above it scroll away. In a
// Pane it runs over the body's inset: to the Pane's sides and foot, and to its
// top when it is the body's first child; under content it draws a hairline
// where it meets it. It clips what the layer draws past it and is no scroll
// box: a focus on a node out of view scrolls nothing (the view pans to it), so
// the zoom stack and the act keep the region's foot.
const REGION =
	"@container/canvas relative flex flex-col grow min-h-0 page-max-tablet:min-h-1/2 min-w-0 overflow-clip touch-none in-[[data-page]]:-mx-page in-[[data-page]]:-mb-page in-[[data-page]]:first:-mt-page in-[[data-page]]:not-first:border-t in-[[data-page]]:not-first:border-edge";
const GRID = "absolute inset-0 size-full text-grid";

// The waiting graph: a column of node cards in the middle of the ground, each
// a loaded step node's card (`canvasNode`: the node width, its inset, border and
// radius) holding the node's parts painted, in the node's own text roles: the
// icon's box, then the overline, the title and the first line as filler, a layer
// gap apart. The graph's real nodes and where they stand are not known, so the
// placeholders are the nodes' measure alone, laid by flex: nothing reads a box.
const WAITING = "absolute inset-0 flex flex-col items-center justify-center";
const WAITING_NODE =
	"flex shrink-0 items-center max-w-[calc(100%-2*var(--spacing-page))]";
const WAITING_TEXT = "flex flex-col flex-auto min-w-0";
const WAITING_OVERLINE = "truncate text-caption leading-caption";
const WAITING_TITLE = "truncate text-body leading-body font-medium";
const WAITING_LINE = "truncate text-meta leading-meta";
const WAITING_NODES = 3;

/** The region a canvas stands in, loaded or waiting. */
export const GROUND = cn(CANVAS_GROUND, REGION);

// The dot grid at scale 1, which is how a waiting canvas draws it. A loaded
// canvas's viewport rewrites the pattern's attributes with each pan and zoom.
export function Grid() {
	const id = useId();
	return (
		<svg aria-hidden="true" data-ground className={GRID}>
			<defs>
				<pattern
					id={id}
					data-grid
					patternUnits="userSpaceOnUse"
					width={PITCH}
					height={PITCH}
				>
					<circle
						fill="currentColor"
						cx={PITCH / 2 + 0.5}
						cy={PITCH / 2 + 0.5}
						r={DOT}
					/>
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill={`url(#${id})`} />
		</svg>
	);
}

/** The nodes a waiting canvas stands: the loaded card's parts painted, at the node's measure. */
export function PaintedNodes() {
	return (
		<div aria-hidden="true" className={cn(WAITING, "gap-section")}>
			{Array.from({ length: WAITING_NODES }, (_, at) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: a fixed count of identical placeholders
					key={at}
					className={cn(canvasNode({ role: "step" }), WAITING_NODE)}
				>
					<IconBase name="Circle" fit="meta" stroke="line" painted />
					<span className={WAITING_TEXT}>
						<span className={WAITING_OVERLINE}>
							<Painted role="word" at={at} />
						</span>
						<span className={WAITING_TITLE}>
							<Painted role="name" at={at} />
						</span>
						<span className={WAITING_LINE}>
							<Painted role="phrase" at={at} />
						</span>
					</span>
				</div>
			))}
		</div>
	);
}
