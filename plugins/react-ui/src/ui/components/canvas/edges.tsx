import type { CanvasEdge } from "@fcalell/ui-core/descriptors";
import { useId } from "react";
import {
	ARROW,
	ARROW_REF,
	crisp,
	type Route,
	roundedPath,
} from "./geometry.ts";
import { EdgeLabel } from "./label.tsx";
import type { EdgeTone } from "./look.ts";

export const SVG = "absolute left-0 top-0 overflow-visible pointer-events-none";
const INK = "text-edge-strong";
// The dot grid's ink: `edge` is fainter than the grid and `ink-disabled` stands
// within 0.05 of lightness of `edge-strong`, so neither tells a dimmed edge.
const DIM = "text-grid";
// Dashed means a handoff, and only that.
const HANDOFF_DASH = "4 4";

// A line and its arrowhead. A marker takes its colour from where it is
// defined, so each stroke has its own inside its `g`, and a tone on the group
// reaches the line and the head together. An edge names itself with `edge`;
// the line being drawn has none.
export function Stroke({
	path,
	dashed,
	tone = "rest",
	edge,
}: {
	path: string;
	dashed: boolean;
	tone?: EdgeTone;
	edge?: string;
}) {
	const marker = useId();
	return (
		<g data-edge={edge} className={tone === "dimmed" ? DIM : INK}>
			<marker
				id={marker}
				markerWidth={ARROW}
				markerHeight={ARROW}
				refX={ARROW_REF}
				refY={4}
				orient="auto"
			>
				<path d="M0 0 L8 4 L0 8 Z" fill="currentColor" />
			</marker>
			<path
				d={path}
				fill="none"
				stroke="currentColor"
				strokeDasharray={dashed ? HANDOFF_DASH : undefined}
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
	below,
}: {
	edges: readonly CanvasEdge[];
	routes: ReadonlyMap<string, Route>;
	// Each edge's tone, by id.
	tones: ReadonlyMap<string, EdgeTone>;
	radius: number;
	// Under the text floor the chips draw nothing.
	below: boolean;
}) {
	return (
		<>
			<svg aria-hidden="true" className={SVG}>
				{edges.map((edge) => {
					const route = routes.get(edge.id);
					return route ? (
						<Stroke
							key={edge.id}
							edge={edge.id}
							path={roundedPath(crisp(route.points), radius)}
							dashed={edge.handoff ?? false}
							tone={tones.get(edge.id) ?? "rest"}
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
						below={below}
					/>
				) : null;
			})}
		</>
	);
}
