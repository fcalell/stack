import type { CanvasEdge } from "@fcalell/ui-core/descriptors";
import { useId } from "react";
import { crisp, type Route, roundedPath } from "./geometry.ts";
import { EdgeLabel } from "./label.tsx";
import type { EdgeTone } from "./look.ts";

const SVG = "absolute left-0 top-0 overflow-visible pointer-events-none";
const INK = "text-edge-strong";
// The dot grid's ink: `edge` is fainter than the grid and `ink-disabled` stands
// within 0.05 of lightness of `edge-strong`, so neither tells a dimmed edge.
const DIM = "text-grid";
// Dashed means a handoff, and only that.
const HANDOFF_DASH = "4 4";

// One edge: its path and its arrowhead. A marker takes its colour from where
// it is defined, so each edge has its own inside its `g`, and a tone on the
// group reaches the line and the head together.
function EdgePath({
	id,
	route,
	handoff,
	tone,
	radius,
}: {
	id: string;
	route: Route;
	handoff: boolean;
	tone: EdgeTone;
	radius: number;
}) {
	const marker = useId();
	return (
		<g data-edge={id} className={tone === "dimmed" ? DIM : INK}>
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
	tones,
	radius,
}: {
	edges: readonly CanvasEdge[];
	routes: ReadonlyMap<string, Route>;
	// Each edge's tone, by id.
	tones: ReadonlyMap<string, EdgeTone>;
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
							id={edge.id}
							route={route}
							handoff={edge.handoff ?? false}
							tone={tones.get(edge.id) ?? "rest"}
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
						tone={tones.get(edge.id) ?? "rest"}
						at={at}
					/>
				) : null;
			})}
		</>
	);
}
