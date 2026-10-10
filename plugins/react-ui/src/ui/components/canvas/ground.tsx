import { cn } from "@fcalell/ui-core/cn";
import { CANVAS_GROUND, CANVAS_UNDER_HEAD } from "@fcalell/ui-core/variants";
import { use, useId } from "react";
import { ThreadBleeds, ThreadRoom } from "../../lib/frame.ts";
import { DOT, PITCH } from "./viewport.ts";

// Under `tablet` the region keeps half of the column it stands in, so the
// column scrolls past it and the head and banners above it scroll away.
const REGION =
	"relative flex flex-col grow min-h-0 page-max-tablet:min-h-1/2 min-w-0 overflow-hidden touch-none";
const GRID = "absolute inset-0 size-full text-grid";

/** The region a canvas stands in, loaded or waiting. */
export const GROUND = cn(CANVAS_GROUND, REGION);

/** The class a canvas's ground takes where it fills a Split's main: the sides bleed through the inset the record's head keeps and a hairline parts it from that head, as a filling Thread's does. Nothing elsewhere. */
export function useBleed() {
	const fills = use(ThreadRoom);
	const bleeds = use(ThreadBleeds);
	return fills && bleeds ? CANVAS_UNDER_HEAD : undefined;
}

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
