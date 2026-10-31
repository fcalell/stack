import type { CanvasNode } from "@fcalell/ui-core/descriptors";
import { useEffect, useRef, useState } from "react";
import { Canvas } from "../../components/canvas/index.tsx";
import { LIFT_MS, SLOP } from "../../components/canvas/lift.ts";
import { useWords } from "../../lib/words.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import {
	ANSWERS_THREE,
	ANSWERS_TWO,
	CROWDED,
	type Graph,
	HOLLOW,
	HOLLOW_ALONE,
	HOLLOW_PLACED,
	JOURNEY,
	LONG,
	LOOPS,
	OFF,
	OPENING,
	PROBLEM,
	ROLES,
	ROLES_OFF,
	ROLES_RUN,
	RUN,
	SCENARIO,
	STATUSES,
	WORKFLOW,
} from "../graphs.ts";
import { endedAt, waiting } from "../waiting.ts";

export type { Graph };
export {
	ANSWERS_THREE,
	ANSWERS_TWO,
	CROWDED,
	HOLLOW,
	HOLLOW_ALONE,
	HOLLOW_PLACED,
	JOURNEY,
	LIFT_MS,
	LONG,
	LOOPS,
	OFF,
	OPENING,
	PROBLEM,
	ROLES,
	ROLES_OFF,
	ROLES_RUN,
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
// A pane narrower than the journey and shorter than it, so a canvas opens at the
// text floor, framed at its start, with the zoom stack over the graph's left.
export const NARROW_STAGE =
	"flex flex-col h-[24rem] w-[28rem] max-w-full bg-surface p-page";

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
// The role frames' stage: the roles graph's five layers at scale 1, in either density.
export const ROLES_STAGE =
	"flex flex-col h-[52rem] w-[56rem] max-w-full bg-surface p-page";
// A canvas opens at the text floor (scale 1), so a stage is as tall as the
// drawing at scale 1 plus the zoom stack under it: a lone group (touch, the
// taller) with the page insets, a `pair` of air and the stack.
export const ALONE_STAGE =
	"flex flex-col h-[22rem] w-[56rem] max-w-full bg-surface p-page";
// The placed loop's: its two positioned nodes, the row of empty groups below
// and the stack under the row's first group.
export const PLACED_STAGE =
	"flex flex-col h-[44rem] w-[56rem] max-w-full bg-surface p-page";
// The overview's: a pane the workflow fits at about two thirds, between the
// overview floor and the full node, in either density.
export const OVERVIEW_STAGE =
	"flex flex-col h-[60rem] w-[56rem] max-w-full bg-surface p-page";

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

// Pans the layer by a plain wheel until its drawn parts (every glyph and frame)
// stand about the middle of the pane.
function centre(region: Element) {
	const parts = region.querySelectorAll(
		"[data-layer] > div:not([data-group]) > button, [data-group]",
	);
	const pane = region.getBoundingClientRect();
	const boxes = [...parts].map((part) => part.getBoundingClientRect());
	if (boxes.length === 0) return;
	const middle = {
		x:
			(Math.min(...boxes.map((box) => box.left)) +
				Math.max(...boxes.map((box) => box.right))) /
			2,
		y:
			(Math.min(...boxes.map((box) => box.top)) +
				Math.max(...boxes.map((box) => box.bottom))) /
			2,
	};
	region.dispatchEvent(
		new WheelEvent("wheel", {
			deltaX: middle.x - (pane.left + pane.width / 2),
			deltaY: middle.y - (pane.top + pane.height / 2),
			bubbles: true,
			cancelable: true,
		}),
	);
}

// A graph zoomed out from the scale a fit opens at: `out` presses of Zoom out,
// which for the workflow in `STAGE` (`ALL`) reach the overview floor and under
// it, so every node is its glyph alone, and in `OVERVIEW_STAGE` (`NAMED`) stop
// between that and the full node, so every glyph carries its name. The canvas
// has no prop for a zoom, so the frame presses the button once the layout shows.
const ALL = 20;
const NAMED = 3;
function Overview({
	graph,
	first,
	stage = STAGE,
	out = ALL,
}: {
	graph: Graph;
	first?: string;
	stage?: string;
	out?: number;
}) {
	const host = useRef<HTMLDivElement>(null);
	const words = useWords();
	useEffect(() => {
		let frame = 0;
		let settle: ReturnType<typeof setTimeout> | undefined;
		const zoom = () => {
			const region = host.current?.querySelector("section");
			if (region && getComputedStyle(region).opacity === "1") {
				const button = region.querySelector<HTMLElement>(
					`button[aria-label="${words.zoomOut}"]`,
				);
				for (let press = 0; press < out; press++) button?.click();
				// The zoom travels on `base`; the graph is then panned to the middle of
				// the pane, as the reader would, so the whole of it is in view.
				settle = setTimeout(() => centre(region), 600);
				return;
			}
			frame = requestAnimationFrame(zoom);
		};
		zoom();
		return () => {
			cancelAnimationFrame(frame);
			clearTimeout(settle);
		};
	}, [words.zoomOut, out]);
	return (
		<div ref={host}>
			<Selectable label="Workflow" graph={graph} stage={stage} first={first} />
		</div>
	);
}

// A graph edited once the canvas shows it, as a consumer's edit changes it:
// `after` takes the place of `before`, and the layout runs again on it, and
// again once a node it made taller is measured. The canvas has no prop for an
// edit, so the frame makes it once the layout shows.
function Edited({
	label,
	before,
	after,
	stage,
}: {
	label: string;
	before: Graph;
	after: Graph;
	stage: string;
}) {
	const host = useRef<HTMLDivElement>(null);
	const [graph, setGraph] = useState(before);
	useEffect(() => {
		let frame = 0;
		const edit = () => {
			const region = host.current?.querySelector("section");
			if (region && getComputedStyle(region).opacity === "1") {
				setGraph(after);
				return;
			}
			frame = requestAnimationFrame(edit);
		};
		edit();
		return () => cancelAnimationFrame(frame);
	}, [after]);
	return (
		<div ref={host}>
			<Selectable label={label} graph={graph} stage={stage} />
		</div>
	);
}

// What each cell draws: the cell is the tone or state its frame is there to
// judge, and the canvas draws every state its graph holds. The confirm node of
// the journey is selected in the `selected` frame of the first.
// Nodes that never arrive: a canvas given them stays painted.
const waitingNodes = waiting.at((): readonly CanvasNode[] => []);

const DRAWN: Record<string, { label: string; graph: Graph }> = {
	"CANVAS_NODE.state.problem": { label: "Problem", graph: PROBLEM },
	"CANVAS_NODE_TEXT.tone.off": { label: "Off", graph: OFF },
	"STATUS_DOT.tone.active": { label: "Status", graph: STATUSES },
};

// The canvas draws in these cells: the workflow at rest (the journey with its
// confirm node selected, and waiting), the workflow with its loop group at rest
// and selected, beside a loop with an empty body between two steps and alone, a problem, an off node, a status per
// state, a run over the workflow, a scenario over the journey, a gate given a
// third answer once it shows, two loops under a step fitted under the text
// floor, and the glyph a
// node is under the text floor, which is the workflow fitted: at rest, with its
// plan node selected, and with a problem; and its overview, the workflow, an off
// node and a run fitted to a pane where each glyph carries its node's name.
export function drawCanvas(frame: ShowcaseFrame) {
	const { name } = frame.cell;
	if (
		frame.state === "loading" ||
		frame.state === "empty" ||
		frame.state === "error"
	) {
		if (name !== "CANVAS_NODE.state.rest") return undefined;
		// The waiting form is the ground painted with three node cards at a node's
		// measure, in the middle of the pane: whole in a pane as tall as the drawing
		// and in the narrow one (a phone's), where the stack keeps the corner.
		if (frame.state === "loading")
			return (
				<>
					<div className={STAGE}>
						<Canvas label="Workflow" nodes={waitingNodes} />
					</div>
					<div className={NARROW_STAGE}>
						<Canvas label="Workflow, narrow" nodes={waitingNodes} />
					</div>
				</>
			);
		// The nodes' read that answers none, fails or answers not found is the
		// canvas's own frame, which draws its form in its ground.
		return endedAt<CanvasNode>(frame.id, frame.state).map(
			({ title, items }) => (
				<div key={title} className={STAGE}>
					<Canvas label={`Workflow, ${title}`} nodes={items} />
				</div>
			),
		);
	}
	if (/^CANVAS_NODE(_INK)?\.(role|tone)\./.test(name)) {
		if (frame.state !== "rest") return undefined;
		const tone = name.slice(name.lastIndexOf(".") + 1);
		const graph =
			tone === "off" ? ROLES_OFF : tone === "dimmed" ? ROLES_RUN : ROLES;
		return <Selectable label="Roles" graph={graph} stage={ROLES_STAGE} />;
	}
	if (/^CANVAS_NODE_GLYPH\.(role|tone)\./.test(name)) {
		if (frame.state !== "rest") return undefined;
		const tone = name.slice(name.lastIndexOf(".") + 1);
		const graph =
			tone === "off" ? ROLES_OFF : tone === "dimmed" ? ROLES_RUN : ROLES;
		return <Overview graph={graph} stage={ROLES_STAGE} />;
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
	if (name.startsWith("CANVAS_NODE_NAME.tone.")) {
		if (frame.state !== "rest") return undefined;
		const tone = name.slice(name.lastIndexOf(".") + 1);
		const graph = tone === "off" ? OFF : tone === "dimmed" ? RUN : WORKFLOW;
		return <Overview graph={graph} stage={OVERVIEW_STAGE} out={NAMED} />;
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
					stage={PLACED_STAGE}
					first={first}
				/>
				<Selectable
					label="Lone loop"
					graph={HOLLOW_ALONE}
					stage={ALONE_STAGE}
					first={first}
				/>
				<Overview graph={LOOPS} first={first ? "work" : undefined} />
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
			<>
				<Selectable label="Workflow" graph={WORKFLOW} stage={WORKFLOW_STAGE} />
				<Edited
					label="Answers"
					before={ANSWERS_TWO}
					after={ANSWERS_THREE}
					stage={ROLES_STAGE}
				/>
			</>
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
