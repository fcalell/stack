import type { CanvasNode } from "@fcalell/ui-core/descriptors";
import { useEffect, useRef, useState } from "react";
import { Canvas } from "../../components/canvas/index.tsx";
import { LIFT_MS, SLOP } from "../../components/canvas/lift.ts";
import { Pane } from "../../components/pane/index.tsx";
import { Sheet } from "../../components/sheet/index.tsx";
import { FrameHost, FrameMain } from "../../components/shell/host.tsx";
import { Place } from "../../components/shell/place.tsx";
import { useWords } from "../../lib/words.tsx";
import type { ShowcaseFrame } from "../cells.ts";
import {
	ANSWERS_THREE,
	ANSWERS_TWO,
	CROWDED,
	ENTRY,
	ENTRY_RUN,
	type Graph,
	HOLLOW,
	HOLLOW_ALONE,
	HOLLOW_PLACED,
	JOURNEY,
	LONG,
	LOOPS,
	OFF,
	OPENING,
	ROLES,
	ROLES_OFF,
	ROLES_RUN,
	RUN,
	SCENARIO,
	STATUSES,
	WARNING,
	WELCOME_NOTE,
	WORKFLOW,
} from "../graphs.ts";
import { endedAt, waiting } from "../waiting.ts";
import { Stage } from "./overlay-stage.tsx";

export type { Graph };
export {
	ANSWERS_THREE,
	ANSWERS_TWO,
	CROWDED,
	ENTRY,
	ENTRY_RUN,
	HOLLOW,
	HOLLOW_ALONE,
	HOLLOW_PLACED,
	JOURNEY,
	LIFT_MS,
	LONG,
	LOOPS,
	OFF,
	OPENING,
	ROLES,
	ROLES_OFF,
	ROLES_RUN,
	RUN,
	SCENARIO,
	SLOP,
	STATUSES,
	WARNING,
	WELCOME_NOTE,
	WORKFLOW,
};

// The canvas fills its region and has no height of its own. It stands on the
// page's ground, `surface`, as it does on a Shell column or a Gate, so it steps
// off what surrounds it: a frame paints `canvas`, the canvas's own ground.
export const STAGE =
	"flex flex-col h-[40rem] w-[56rem] max-w-full bg-surface p-page";
// A pane narrower than the journey and shorter than it: a phone's, where the
// zoom stack keeps the corner of the waiting form.
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
// A pane the width of a half-width Pane beside a list: a wide graph opens
// fitted in it.
const ENTRY_STAGE =
	"flex flex-col h-[40rem] w-[42rem] max-w-full bg-surface p-page";
// The two crowded nodes: a status badge and a long line each, one above the other.
const CROWDED_STAGE =
	"flex flex-col h-[24rem] w-[28rem] max-w-full bg-surface p-page";
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
// A phone's pane and a half-width pane's: the welcome note's two exits side by
// side (about 500 px) cannot stand in either at the text floor.
const PHONE_STAGE =
	"flex flex-col h-[40rem] w-[20rem] max-w-full bg-surface p-page";
const HALF_STAGE =
	"flex flex-col h-[40rem] w-[30rem] max-w-full bg-surface p-page";
// A pane a pair wider than the welcome note's cards: it opens at its words.
const WORDS_STAGE =
	"flex flex-col h-[40rem] w-[36rem] max-w-full bg-surface p-page";
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

// The frames below judge their canvas's own edges and log an error where it
// breaks: how many frames they wait for the canvas to show, and then to settle.
const SHOW_WAIT = 240;
const OPEN_SETTLE = 30;
const SWAP_WAIT = 90;
const NODES = "[data-layer] button[data-focus]:not([aria-hidden=true])";

const meets = (a: DOMRect, b: DOMRect) =>
	a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

// What of a node shows: its glyph's box where it is a glyph, else its card.
function drawn(node: HTMLElement): DOMRect {
	return (node.querySelector("[data-shape]") ?? node).getBoundingClientRect();
}

// The faults of a canvas's opening view: a node cut by the pane's side (part in,
// part out; one wholly out is the viewer's to pan to), or standing under the zoom
// stack.
function openingFaults(region: Element): string[] {
	const pane = region.getBoundingClientRect();
	const stack = region
		.querySelector('[data-clear="left"]')
		?.getBoundingClientRect();
	const faults: string[] = [];
	for (const node of region.querySelectorAll<HTMLElement>(NODES)) {
		const box = drawn(node);
		if (box.width === 0) continue;
		const id = node.dataset.focus ?? "a node";
		const edges = [pane.left, pane.right];
		if (edges.some((edge) => box.left < edge - 1 && box.right > edge + 1))
			faults.push(`${id} is cut at the pane's side`);
		if (stack && meets(box, stack))
			faults.push(`${id} stands under the zoom stack`);
	}
	return faults;
}

// Calls `done` once the canvas under `host` shows (its layout is set and it has
// faded in) and has stood still for a while, so its opening view is what is read.
function onceOpen(host: HTMLElement | null, done: (region: Element) => void) {
	let frame = 0;
	let waited = 0;
	let seen = 0;
	const watch = () => {
		const region = host?.querySelector("section");
		if (region && getComputedStyle(region).opacity === "1") {
			if (++seen >= OPEN_SETTLE) {
				done(region);
				return;
			}
		} else if (++waited >= SHOW_WAIT) return;
		frame = requestAnimationFrame(watch);
	};
	frame = requestAnimationFrame(watch);
	return () => cancelAnimationFrame(frame);
}

// A graph in a pane, and a canvas that judges how it opens: every node whole
// across the pane (or wholly beyond it) and none under the zoom stack.
function Opened({
	label,
	graph,
	stage,
}: {
	label: string;
	graph: Graph;
	stage: string;
}) {
	const host = useRef<HTMLDivElement>(null);
	useEffect(
		() =>
			onceOpen(host.current, (region) => {
				for (const fault of openingFaults(region))
					console.error(`${label} opens with ${fault}`);
			}),
		[label],
	);
	return (
		<div ref={host}>
			<Selectable label={label} graph={graph} stage={stage} />
		</div>
	);
}

// A canvas given another set of nodes once it shows. Left as it opened, it opens
// again on the new set: every node of it stands in the pane. Panned by the
// viewer first (`panned`), it keeps the view the viewer left.
function Swapped({
	label,
	before,
	after,
	stage,
	panned = false,
}: {
	label: string;
	before: Graph;
	after: Graph;
	stage: string;
	panned?: boolean;
}) {
	const host = useRef<HTMLDivElement>(null);
	const [graph, setGraph] = useState(before);
	useEffect(() => {
		let frame = 0;
		let waited = 0;
		let view = "";
		let swapped = false;
		let since = 0;
		const layer = () =>
			host.current?.querySelector<HTMLElement>("[data-layer]");
		const watch = () => {
			const region = host.current?.querySelector("section");
			if (!swapped) {
				if (region && getComputedStyle(region).opacity === "1") {
					// The viewer's pan: a plain wheel.
					if (panned)
						region.dispatchEvent(
							new WheelEvent("wheel", {
								deltaX: 48,
								deltaY: 0,
								bubbles: true,
								cancelable: true,
							}),
						);
					view = layer()?.style.transform ?? "";
					swapped = true;
					setGraph(after);
				} else if (++waited >= SHOW_WAIT) return;
			} else if (region) {
				// The new set is drawn, and has stood while the layout ran and the view
				// opened on it.
				const count = region.querySelectorAll(NODES).length;
				since = count === after.nodes.length ? since + 1 : 0;
				if (since >= SWAP_WAIT) {
					if (panned) {
						if (layer()?.style.transform !== view)
							console.error(
								`${label}: a canvas the viewer moved opened again on its new nodes`,
							);
					} else {
						for (const fault of openingFaults(region))
							console.error(`${label}: after its nodes changed, ${fault}`);
					}
					return;
				}
			}
			frame = requestAnimationFrame(watch);
		};
		frame = requestAnimationFrame(watch);
		return () => cancelAnimationFrame(frame);
	}, [label, after, panned]);
	return (
		<div ref={host}>
			<Selectable label={label} graph={graph} stage={stage} />
		</div>
	);
}

// A canvas in a Pane with a sheet open over it, as a step's sheet opens in the
// app: the graph stands behind the scrim, drawn, never the bare ground.
function UnderSheet() {
	return (
		<Stage contain>
			<FrameHost>
				<FrameMain>
					<Place title="Flow">
						<Pane fill wide title="Flow">
							<Canvas
								label="Behind a sheet"
								nodes={WORKFLOW.nodes}
								edges={WORKFLOW.edges}
								groups={WORKFLOW.groups}
							/>
						</Pane>
					</Place>
					<Sheet
						open
						onClose={() => {}}
						title="What the workflow gains"
						description="Saving gives it these. Closing keeps the draft unsaved."
					>
						<p>Adds the command toolchain, free.</p>
					</Sheet>
				</FrameMain>
			</FrameHost>
		</Stage>
	);
}

// What each cell draws: the cell is the tone or state its frame is there to
// judge, and the canvas draws every state its graph holds. The confirm node of
// the journey is selected in the `selected` frame of the first.
// Nodes that never arrive: a canvas given them stays painted.
const waitingNodes = waiting.at((): readonly CanvasNode[] => []);

const DRAWN: Record<string, { label: string; graph: Graph }> = {
	"CANVAS_NODE.state.warning": { label: "Warning", graph: WARNING },
	"CANVAS_NODE_TEXT.tone.off": { label: "Off", graph: OFF },
	"STATUS_DOT.tone.active": { label: "Status", graph: STATUSES },
};

// The canvas draws in these cells: the workflow at rest (the journey with its
// confirm node selected, and waiting), the workflow with its loop group at rest
// and selected, beside a loop with an empty body between two steps and alone, a warning, an off node, a status per
// state, a run over the workflow, a scenario over the journey, a gate given a
// third answer once it shows, two loops under a step fitted under the text
// floor, and the glyph a
// node is under the text floor, which is the workflow fitted: at rest, with its
// plan node selected, and with a warning; and its overview, the workflow, an off
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
				graph={state === "warning" ? WARNING : WORKFLOW}
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
				{/* A status is a badge under the title; a long line is plain text under it. */}
				<Selectable label="Crowded" graph={CROWDED} stage={CROWDED_STAGE} />
				{/* A wide graph opens fitted in the pane it stands in, edge labels, the answer's arrow and its band's label in view. */}
				<Selectable label="Entry" graph={ENTRY} stage={ENTRY_STAGE} />
				{/* A graph wider than its pane opens as the overview with every glyph whole and clear of the zoom stack; from a pane a pair wider than its cards, at its words. Each judges its own opening. */}
				<Opened
					label="Welcome note, phone"
					graph={WELCOME_NOTE}
					stage={PHONE_STAGE}
				/>
				<Opened
					label="Welcome note, half width"
					graph={WELCOME_NOTE}
					stage={HALF_STAGE}
				/>
				<Opened
					label="Welcome note, words"
					graph={WELCOME_NOTE}
					stage={WORDS_STAGE}
				/>
				{/* A canvas given another set of nodes opens again on it, unless the viewer moved the view. */}
				<Swapped
					label="Swapped nodes"
					before={WORKFLOW}
					after={JOURNEY}
					stage={JOURNEY_STAGE}
				/>
				<Swapped
					label="Swapped nodes, panned"
					before={WORKFLOW}
					after={JOURNEY}
					stage={JOURNEY_STAGE}
					panned
				/>
				<Selectable label="Entry run" graph={ENTRY_RUN} stage={ENTRY_STAGE} />
				<UnderSheet />
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
