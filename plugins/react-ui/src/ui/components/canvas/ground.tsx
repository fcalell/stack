import { cn } from "@fcalell/ui-core/cn";
import { CANVAS_GROUND } from "@fcalell/ui-core/variants";
import { useId } from "react";
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
