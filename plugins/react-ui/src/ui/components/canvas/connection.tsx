import type { CanvasPoint } from "@fcalell/ui-core/descriptors";
import { Stroke, SVG } from "./edges.tsx";
import { type Box, bendRoute, cleanPoints, roundedPath } from "./geometry.ts";

// The link being drawn from a node's out port to the pointer, in the layer's
// flow coordinates: an edge's own stroke, in the rest ink. Dashed would say
// handoff, and no tone says whether the port beneath the pointer takes it.
export function ConnectionLine({
	from,
	to,
	pair,
}: {
	from: Box;
	to: CanvasPoint;
	pair: number;
}) {
	const source = { x: from.x + from.width / 2, y: from.y + from.height };
	return (
		<svg aria-hidden="true" data-link className={SVG}>
			<Stroke
				path={roundedPath(cleanPoints(bendRoute(source, to, pair)), pair)}
				dashed={false}
			/>
		</svg>
	);
}
