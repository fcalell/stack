import { useState } from "react";
import { Canvas } from "../../components/canvas/index.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import { type Graph, JOURNEY, WORKFLOW } from "../graphs.ts";

export { JOURNEY, WORKFLOW };

// The canvas fills its region and has no height of its own. It stands on the
// page's ground, `surface`, as it does on a Shell column or a Gate, so it steps
// off what surrounds it: a frame paints `canvas`, the canvas's own ground.
export const STAGE =
	"flex flex-col h-[40rem] w-[56rem] max-w-full bg-surface p-page";
// The behaviour stories' other two: tall enough for the whole workflow at scale
// 1, and too small for the journey. Their classes live here, where the build
// scans for them.
export const TALL =
	"flex flex-col h-[72rem] w-[56rem] max-w-full bg-surface p-page";
export const SMALL = "flex flex-col h-[12rem] w-[20rem] bg-surface p-page";

// Read-only but for the selection, which a click or Escape moves.
function Selectable({
	label,
	graph,
	first,
}: {
	label: string;
	graph: Graph;
	first?: string;
}) {
	const [selected, select] = useState(first);
	return (
		<div className={STAGE}>
			<Canvas
				label={label}
				nodes={graph.nodes}
				edges={graph.edges}
				groups={graph.groups}
				selected={selected}
				onSelect={(id) => select(id ?? undefined)}
			/>
		</div>
	);
}

// The canvas draws in one cell, `CANVAS_NODE.state.rest`: the workflow at
// rest, the journey with its confirm node selected.
export function drawCanvas(frame: ShowcaseFrame) {
	if (frame.cell.name !== "CANVAS_NODE.state.rest") return undefined;
	if (frame.state === "selected")
		return <Selectable label="Journey" graph={JOURNEY} first="merge" />;
	return <Selectable label="Workflow" graph={WORKFLOW} />;
}
