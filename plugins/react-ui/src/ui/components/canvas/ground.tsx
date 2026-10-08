import { cn } from "@fcalell/ui-core/cn";
import { CANVAS_GROUND } from "@fcalell/ui-core/variants";
import { useId } from "react";
import { DOT, PITCH } from "./viewport.ts";

const REGION =
	"relative flex flex-col grow min-h-0 min-w-0 overflow-hidden touch-none";
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
