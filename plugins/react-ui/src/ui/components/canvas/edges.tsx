import type { CanvasEdge } from "@fcalell/ui-core/descriptors";
import { useId } from "react";
import { crisp, type Route, roundedPath } from "./geometry.ts";
import { EdgeLabel } from "./label.tsx";

const SVG = "absolute left-0 top-0 overflow-visible pointer-events-none";
const INK = "text-edge-strong";
// Dashed means a handoff, and only that.
const HANDOFF_DASH = "4 4";

// One edge: its path and its arrowhead. A marker takes its colour from where
// it is defined, so each edge has its own inside its `g`, and a tone on the
// group reaches the line and the head together.
function EdgePath({
	route,
	handoff,
	radius,
}: {
	route: Route;
	handoff: boolean;
	radius: number;
}) {
	const marker = useId();
	return (
		<g className={INK}>
			<marker
				id={marker}
				markerWidth={8}
				markerHeight={8}
				refX={7}
				refY={4}
				orient="auto"
			>
				<path d="M0 0 L8 4 L0 8 Z" fill="currentColor" />
			</marker>
			<path
				d={roundedPath(crisp(route.points), radius)}
				fill="none"
				stroke="currentColor"
				strokeDasharray={handoff ? HANDOFF_DASH : undefined}
				markerEnd={`url(#${marker})`}
			/>
		</g>
	);
}

// Every edge as one SVG in flow coordinates, then the chips over it. Nothing
// here decides a coordinate: the router did.
export function EdgeLayer({
	edges,
	routes,
	radius,
}: {
	edges: readonly CanvasEdge[];
	routes: ReadonlyMap<string, Route>;
	radius: number;
}) {
	return (
		<>
			<svg aria-hidden="true" className={SVG}>
				{edges.map((edge) => {
					const route = routes.get(edge.id);
					return route ? (
						<EdgePath
							key={edge.id}
							route={route}
							handoff={edge.handoff ?? false}
							radius={radius}
						/>
					) : null;
				})}
			</svg>
			{edges.map((edge) => {
				const at = routes.get(edge.id)?.label;
				return at ? (
					<EdgeLabel
						key={edge.id}
						label={edge.label}
						handoff={edge.handoff ?? false}
						at={at}
					/>
				) : null;
			})}
		</>
	);
}
