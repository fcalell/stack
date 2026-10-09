import { useEffect, useRef, useState } from "react";
import { Canvas } from "../../components/canvas/index.tsx";
import { LIFT_MS, SLOP } from "../../components/canvas/lift.ts";
import { useWords } from "../../lib/words.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import {
	type Graph,
	HOLLOW,
	HOLLOW_ALONE,
	HOLLOW_PLACED,
	JOURNEY,
	OFF,
	PROBLEM,
	RUN,
	SCENARIO,
	STATUSES,
	WORKFLOW,
} from "../graphs.ts";

export type { Graph };
export {
	HOLLOW,
	HOLLOW_ALONE,
	HOLLOW_PLACED,
	JOURNEY,
	LIFT_MS,
	OFF,
	PROBLEM,
	RUN,
	SCENARIO,
	SLOP,
	STATUSES,
	WORKFLOW,
};

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

// The state frames' stages. A canvas opens at scale 1 and shows a graph whole
// only when its pane is as tall as the drawing, which the layout decides after
// the frame renders, so a stage is sized to the drawing measured in the touch
// density (the taller): the workflow is 1258 px and the journey 814 px, each
// plus the pane's inset on both sides. `FramesHoldTheirGraph` fails when a
// graph or a density outgrows its stage.
export const WORKFLOW_STAGE =
	"flex flex-col h-[86rem] w-[56rem] max-w-full bg-surface p-page";
export const JOURNEY_STAGE =
	"flex flex-col h-[58rem] w-[56rem] max-w-full bg-surface p-page";
export const ALONE_STAGE =
	"flex flex-col h-[16rem] w-[56rem] max-w-full bg-surface p-page";

// Read-only but for the selection, which a click or Escape moves.
function Selectable({
	label,
	graph,
	stage,
	first,
}: {
	label: string;
	graph: Graph;
	stage: string;
	first?: string;
}) {
	const [selected, select] = useState(first);
	return (
		<div className={stage}>
			<Canvas
				label={label}
				nodes={graph.nodes}
				edges={graph.edges}
				groups={graph.groups}
				path={graph.path}
				selected={selected}
				onSelect={(id) => select(id ?? undefined)}
			/>
		</div>
	);
}

// A graph fitted to its stage, which for the workflow is under the text floor,
// so every node is its glyph alone. The canvas has no prop for a zoom, so the
// frame presses its Fit once the layout shows.
function Overview({ graph, first }: { graph: Graph; first?: string }) {
	const stage = useRef<HTMLDivElement>(null);
	const words = useWords();
	useEffect(() => {
		let frame = 0;
		const fit = () => {
			const region = stage.current?.querySelector("section");
			if (region && getComputedStyle(region).opacity === "1") {
				region
					.querySelector<HTMLElement>(`button[aria-label="${words.fit}"]`)
					?.click();
				return;
			}
			frame = requestAnimationFrame(fit);
		};
		fit();
		return () => cancelAnimationFrame(frame);
	}, [words.fit]);
	return (
		<div ref={stage}>
			<Selectable label="Workflow" graph={graph} stage={STAGE} first={first} />
		</div>
	);
}

export const EMPTY = "Add a node, or drag from the trigger's port.";

// What each cell draws: the cell is the tone or state its frame is there to
// judge, and the canvas draws every state its graph holds. The confirm node of
// the journey is selected in the `selected` frame of the first.
const DRAWN: Record<string, { label: string; graph: Graph }> = {
	"CANVAS_NODE.state.problem": { label: "Problem", graph: PROBLEM },
	"CANVAS_NODE_TEXT.tone.off": { label: "Off", graph: OFF },
	"STATUS_DOT.state.active": { label: "Status", graph: STATUSES },
};

// The canvas draws in these cells: the workflow at rest (the journey with its
// confirm node selected, and waiting), the workflow with its loop group at rest
// and selected, beside a loop with an empty body between two steps and alone, a problem, an off node, a status per
// state, a run over the workflow, a scenario over the journey, and the glyph a
// node is under the text floor, which is the workflow fitted: at rest, with its
// plan node selected, and with a problem.
export function drawCanvas(frame: ShowcaseFrame) {
	const { name } = frame.cell;
	if (frame.state === "loading" || frame.state === "empty") {
		if (name !== "CANVAS_NODE.state.rest") return undefined;
		return (
			<div className={STAGE}>
				{frame.state === "loading" ? (
					<Canvas label="Workflow" nodes={[]} loading />
				) : (
					<Canvas
						label="Workflow"
						nodes={WORKFLOW.nodes.slice(0, 1)}
						empty={EMPTY}
					/>
				)}
			</div>
		);
	}
	if (name.startsWith("CANVAS_NODE_GLYPH.state.")) {
		if (frame.state !== "rest") return undefined;
		const state = name.slice(name.lastIndexOf(".") + 1);
		return (
			<Overview
				graph={state === "problem" ? PROBLEM : WORKFLOW}
				first={state === "selected" ? "plan" : undefined}
			/>
		);
	}
	if (name.startsWith("CANVAS_GROUP.state.")) {
		if (frame.state !== "rest") return undefined;
		const first = name.endsWith(".selected") ? "loop" : undefined;
		return (
			<>
				<Selectable
					label="Workflow"
					graph={WORKFLOW}
					stage={WORKFLOW_STAGE}
					first={first}
				/>
				<Selectable
					label="Hollow loop"
					graph={HOLLOW}
					stage={STAGE}
					first={first}
				/>
				<Selectable
					label="Placed loop"
					graph={HOLLOW_PLACED}
					stage={STAGE}
					first={first}
				/>
				<Selectable
					label="Lone loop"
					graph={HOLLOW_ALONE}
					stage={ALONE_STAGE}
					first={first}
				/>
			</>
		);
	}
	if (name === "CANVAS_NODE.state.rest") {
		if (frame.state === "selected")
			return (
				<Selectable
					label="Journey"
					graph={JOURNEY}
					stage={JOURNEY_STAGE}
					first="merge"
				/>
			);
		return (
			<Selectable label="Workflow" graph={WORKFLOW} stage={WORKFLOW_STAGE} />
		);
	}
	if (name === "CANVAS_NODE_TEXT.tone.dimmed")
		return frame.state === "selected" ? (
			<Selectable label="Scenario" graph={SCENARIO} stage={JOURNEY_STAGE} />
		) : (
			<Selectable label="Run" graph={RUN} stage={WORKFLOW_STAGE} />
		);
	const drawn = DRAWN[name];
	if (!drawn || frame.state !== "rest") return undefined;
	return (
		<Selectable
			label={drawn.label}
			graph={drawn.graph}
			stage={WORKFLOW_STAGE}
		/>
	);
}
