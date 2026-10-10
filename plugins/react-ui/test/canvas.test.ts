import assert from "node:assert/strict";
import { test } from "node:test";
import { backEdges, pathOrder } from "@fcalell/ui-core/canvas";
import type { CanvasGroup } from "@fcalell/ui-core/descriptors";
import { STATUS_STATES, WIDTH_VALUE } from "@fcalell/ui-core/tokens";
import ELK from "elkjs";
import {
	elkGraph,
	fromElk,
	graphKey,
	layerGap,
} from "../src/ui/components/canvas/elk.ts";
import {
	belowFloor,
	glyphBoxes,
	glyphSize,
	minZoomFor,
	nameCap,
	OVERVIEW_FLOOR,
	overviewFloorFor,
	routeSide,
	TEXT_FLOOR,
} from "../src/ui/components/canvas/floor.ts";
import {
	ARROW,
	ARROW_REF,
	type Box,
	bendRoute,
	cleanPoints,
	crisp,
	crosses,
	emptyGroups,
	groupBoxes,
	groupTree,
	hollowRow,
	leftPads,
	PIXEL_CENTRE,
	type Route,
	type RouteInput,
	roundedPath,
	routeEdges,
	verticalLegs,
} from "../src/ui/components/canvas/geometry.ts";
import { carried } from "../src/ui/components/canvas/lift.ts";
import { edgeLook, nodeLook } from "../src/ui/components/canvas/look.ts";
import {
	centredTransform,
	EXTENT,
	fitTransform,
	inside,
	landAt,
	ORIGIN,
	openTransform,
	place,
	whole,
} from "../src/ui/components/canvas/view.ts";
import { showcaseFrames } from "../src/ui/showcase/cells.ts";
import {
	type Graph,
	JOURNEY,
	OFF,
	PROBLEM,
	RUN,
	SCENARIO,
	STATUSES,
	WORKFLOW,
} from "../src/ui/showcase/graphs.ts";

const WIDTH = Number.parseFloat(WIDTH_VALUE.node);
const HEIGHT = 56;
const HEAD = 28;
const PAD = 16;
const PAIR = 8;
// A port ring's drawn size.
const PORT = 8;
const CHIP = 20;
// A head's text starts a control's inline padding in and runs 7 px a letter.
const PADX = 12;
const GAPS = { node: 16, layer: layerGap(48, CHIP, PAIR), page: 24 };

const node = (id: string) => ({ id });

function graph(over: Partial<Parameters<typeof elkGraph>[0]> = {}) {
	const { nodes, edges, groups = [] } = WORKFLOW;
	const order = pathOrder(nodes, edges);
	return elkGraph({
		nodes,
		edges,
		groups,
		order,
		sizes: new Map(nodes.map((n) => [n.id, { width: WIDTH, height: HEIGHT }])),
		head: HEAD,
		pad: PAD,
		gaps: GAPS,
		...over,
	});
}

const ids = (nodes: { id: string }[] | undefined) =>
	(nodes ?? []).map((n) => n.id);

test("elkGraph stands the children in path order and a group where its first member stands", () => {
	const elk = graph();
	// start, plan, then the loop (build's place), gate, review, handoff.
	assert.deepEqual(ids(elk.children), [
		"n:start",
		"n:plan",
		"g:loop",
		"n:gate",
		"n:review",
		"n:handoff",
	]);
	const loop = elk.children?.find((child) => child.id === "g:loop");
	assert.deepEqual(ids(loop?.children), ["n:build", "n:check"]);
	// ELK gives a group's own layout its default spacing unless the group is told.
	assert.deepEqual(loop?.layoutOptions, {
		"elk.padding": "[top=44,left=16,bottom=16,right=16]",
		"elk.spacing.nodeNode": "16",
		"elk.layered.spacing.nodeNodeBetweenLayers": "88",
	});
});

test("elkGraph sizes a node by the width token and its measured height", () => {
	const build = graph()
		.children?.flatMap((c) => c.children ?? [c])
		.find((c) => c.id === "n:build");
	assert.equal(build?.width, WIDTH);
	assert.equal(build?.height, HEIGHT);
});

test("elkGraph gives ELK the forward edges only, in array order, with prefixed ids", () => {
	const elk = graph();
	assert.deepEqual(
		(elk.edges ?? []).map((e) => e.id),
		[
			"e:start-plan",
			"e:plan-build",
			"e:build-check",
			"e:check-gate",
			"e:gate-review",
			"e:review-handoff",
		],
	);
	const first = elk.edges?.[0];
	assert.deepEqual([first?.sources, first?.targets], [["n:start"], ["n:plan"]]);
});

test("elkGraph carries the root options and the spacing it is given, and no edge routing", () => {
	assert.deepEqual(graph().layoutOptions, {
		"elk.algorithm": "layered",
		"elk.direction": "DOWN",
		"elk.hierarchyHandling": "INCLUDE_CHILDREN",
		"elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
		"elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
		"elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
		"elk.json.shapeCoords": "ROOT",
		"elk.spacing.nodeNode": "16",
		"elk.layered.spacing.nodeNodeBetweenLayers": "88",
		"elk.padding": "[top=24,left=24,bottom=24,right=24]",
	});
});

test("a node held by two groups belongs to the first, and an unknown id is ignored", () => {
	const groups: CanvasGroup[] = [
		{ id: "one", head: "One", holds: ["a", "ghost"] },
		{ id: "two", head: "Two", holds: ["a", "b"] },
	];
	const nodes = ["a", "b", "c"].map(node);
	const elk = elkGraph({
		nodes,
		edges: [],
		groups,
		order: ["a", "b", "c"],
		sizes: new Map(nodes.map((n) => [n.id, { width: WIDTH, height: HEIGHT }])),
		head: HEAD,
		pad: PAD,
		gaps: GAPS,
	});
	assert.deepEqual(ids(elk.children), ["g:one", "g:two", "n:c"]);
	assert.deepEqual(ids(elk.children?.[0]?.children), ["n:a"]);
	assert.deepEqual(ids(elk.children?.[1]?.children), ["n:b"]);
});

test("a group never takes its own ancestor, and a group holding no node is dropped", () => {
	const groups: CanvasGroup[] = [
		{ id: "outer", head: "Outer", holds: ["inner", "a"] },
		{ id: "inner", head: "Inner", holds: ["outer", "b"] },
		{ id: "empty", head: "Empty", holds: [] },
	];
	const tree = groupTree(groups, new Set(["a", "b"]));
	assert.deepEqual(tree.roots, ["outer", "empty"]);
	assert.deepEqual(tree.groups.get("outer"), ["inner"]);
	assert.deepEqual(tree.groups.get("inner"), []);
	assert.equal(tree.parent.get("inner"), "outer");
	const nodes = ["a", "b"].map(node);
	const elk = elkGraph({
		nodes,
		edges: [],
		groups,
		order: ["a", "b"],
		sizes: new Map(nodes.map((n) => [n.id, { width: WIDTH, height: HEIGHT }])),
		head: HEAD,
		pad: PAD,
		gaps: GAPS,
	});
	assert.deepEqual(ids(elk.children), ["g:outer"]);
});

test("a layer gap holds the bend, the chip and the air round them", () => {
	// Half the gap holds a pair, the chip, a pair and an arrowhead.
	assert.equal(layerGap(48, 20, 8), 88);
	assert.equal(layerGap(48, 0, 8), 48);
	assert.equal(layerGap(120, 20, 8), 120);
});

test("fromElk reads every node's absolute position and ignores a group's rectangle", () => {
	const out = fromElk({
		id: "root",
		children: [
			{ id: "n:a", x: 24, y: 24, width: 240, height: 56 },
			{
				id: "g:loop",
				x: 24,
				y: 120,
				width: 300,
				height: 200,
				children: [{ id: "n:b", x: 40, y: 164, width: 240, height: 56 }],
			},
		],
	});
	assert.deepEqual(
		[...out],
		[
			["a", { x: 24, y: 24 }],
			["b", { x: 40, y: 164 }],
		],
	);
});

test("graphKey holds still for a status, a label or a selection and moves for an edge's ends", () => {
	const { nodes, edges, groups = [] } = WORKFLOW;
	const key = graphKey(nodes, edges, groups);
	const relabelled = edges.map((e) => ({ ...e, label: "other" }));
	const moved = nodes.map((n) => ({ ...n, status: undefined, line: "other" }));
	assert.equal(graphKey(moved, relabelled, groups), key);
	const rewired = edges.map((e, i) => (i === 0 ? { ...e, to: "gate" } : e));
	assert.notEqual(graphKey(nodes, rewired, groups), key);
	assert.notEqual(graphKey(nodes, edges, []), key);
	const renamed = groups.map((g) => ({ ...g, head: "Else" }));
	assert.notEqual(graphKey(nodes, edges, renamed), key);
});

test("nodeLook selects the node that matches and rests the others", () => {
	assert.equal(nodeLook(node("a"), "a").state, "selected");
	assert.equal(nodeLook(node("a"), "b").state, "rest");
	assert.deepEqual(nodeLook(node("a"), undefined), {
		state: "rest",
		tone: "rest",
		shows: "line",
		status: false,
		problem: false,
	});
});

const DONE = { state: "done", label: "Done" } as const;
const ONE_PATH = { nodes: ["a"], edges: [] };

test("nodeLook with no path puts every node on it, and draws a status when it holds one", () => {
	assert.equal(nodeLook({ id: "a", status: DONE }, undefined).status, true);
	assert.equal(nodeLook({ id: "a" }, undefined).status, false);
});

test("nodeLook draws a problem alone as the danger box, its words in rest ink in place of the line, and the danger mark", () => {
	assert.deepEqual(nodeLook({ id: "a", problem: "Bad" }, undefined), {
		state: "problem",
		tone: "rest",
		shows: "problem",
		status: false,
		problem: true,
	});
});

test("nodeLook lets selection win the outline over a problem, and keeps the words and the mark", () => {
	const look = nodeLook({ id: "a", problem: "Bad" }, "a");
	assert.equal(look.state, "selected");
	assert.equal(look.shows, "problem");
	assert.equal(look.problem, true);
});

test("nodeLook draws a problem and a status together: each keeps its own mark", () => {
	const look = nodeLook({ id: "a", problem: "Bad", status: DONE }, undefined);
	assert.equal(look.status, true);
	assert.equal(look.problem, true);
	assert.equal(look.state, "problem");
});

test("nodeLook lets off win over a problem: the word off, the rest box", () => {
	assert.deepEqual(
		nodeLook({ id: "a", off: true, problem: "Bad" }, undefined),
		{
			state: "rest",
			tone: "off",
			shows: "off",
			status: false,
			problem: false,
		},
	);
	assert.deepEqual(nodeLook({ id: "a", off: true }, undefined), {
		state: "rest",
		tone: "off",
		shows: "off",
		status: false,
		problem: false,
	});
});

test("nodeLook dims a node off the path in every part, with the rest box and no status", () => {
	assert.deepEqual(nodeLook({ id: "b", status: DONE }, undefined, ONE_PATH), {
		state: "rest",
		tone: "dimmed",
		shows: "line",
		status: false,
		problem: false,
	});
});

test("nodeLook keeps a selected node's ink dimmed off the path", () => {
	const look = nodeLook({ id: "b" }, "b", ONE_PATH);
	assert.equal(look.state, "selected");
	assert.equal(look.tone, "dimmed");
});

test("nodeLook draws a problem off the path in dimmed ink, the rest box and no mark", () => {
	assert.deepEqual(nodeLook({ id: "b", problem: "Bad" }, undefined, ONE_PATH), {
		state: "rest",
		tone: "dimmed",
		shows: "problem",
		status: false,
		problem: false,
	});
});

test("nodeLook outlines where the path stands, on the path even when it lists no such node", () => {
	const path = { nodes: ["a"], edges: [], at: "z" };
	const at = nodeLook({ id: "z", status: DONE }, undefined, path);
	assert.equal(at.state, "selected");
	assert.equal(at.tone, "rest");
	assert.equal(at.status, true);
	const both = nodeLook({ id: "z" }, "z", path);
	assert.equal(both.state, "selected");
	assert.equal(nodeLook({ id: "a" }, "z", path).state, "rest");
});

test("nodeLook with a path that lists no node dims every node but the one it stands at", () => {
	const path = { nodes: [], edges: [], at: "a" };
	assert.equal(nodeLook({ id: "a" }, undefined, path).tone, "rest");
	assert.equal(nodeLook({ id: "b" }, undefined, path).tone, "dimmed");
});

const EDGE = { id: "e", from: "a", to: "b" };
const ENDS = new Map<string, { off?: boolean }>([
	["a", {}],
	["b", {}],
	["c", { off: true }],
]);

test("edgeLook rests an edge with no path and dims one the path does not list", () => {
	assert.equal(edgeLook(EDGE, ENDS, undefined), "rest");
	assert.equal(edgeLook(EDGE, ENDS, { nodes: [], edges: ["e"] }), "rest");
	assert.equal(edgeLook(EDGE, ENDS, { nodes: [], edges: ["f"] }), "dimmed");
});

test("edgeLook reads an edge by its own id, never by its ends", () => {
	const path = { nodes: ["a", "b"], edges: [] };
	assert.equal(edgeLook(EDGE, ENDS, path), "dimmed");
});

test("edgeLook dims an edge to or from an off node, and never reads an unknown end as off", () => {
	assert.equal(
		edgeLook({ id: "e", from: "a", to: "c" }, ENDS, undefined),
		"dimmed",
	);
	assert.equal(
		edgeLook({ id: "e", from: "c", to: "b" }, ENDS, undefined),
		"dimmed",
	);
	assert.equal(
		edgeLook({ id: "e", from: "a", to: "unknown" }, ENDS, undefined),
		"rest",
	);
});

const STATED = [
	["OFF", OFF],
	["PROBLEM", PROBLEM],
	["STATUSES", STATUSES],
	["RUN", RUN],
	["SCENARIO", SCENARIO],
] as const;

test("every state fixture's path and edge ids exist, and it holds no position", () => {
	for (const [name, graph] of STATED) {
		const nodes = new Set(graph.nodes.map((n) => n.id));
		const edges = new Set(graph.edges.map((e) => e.id));
		for (const id of graph.path?.nodes ?? [])
			assert.ok(nodes.has(id), name + id);
		for (const id of graph.path?.edges ?? [])
			assert.ok(edges.has(id), name + id);
		if (graph.path?.at) assert.ok(nodes.has(graph.path.at), name);
		assert.ok(
			graph.nodes.every((n) => n.position === undefined),
			name,
		);
	}
});

test("a run and a scenario leave nodes off their path, at stands on it", () => {
	for (const graph of [RUN, SCENARIO]) {
		assert.ok(graph.path);
		assert.ok(graph.path.nodes.length < graph.nodes.length);
		assert.ok(graph.path.at && graph.path.nodes.includes(graph.path.at));
	}
});

test("STATUSES holds each status state exactly once", () => {
	const states = STATUSES.nodes.map((n) => n.status?.state);
	assert.deepEqual([...states].sort(), [...STATUS_STATES].sort());
});

test("the state fixtures change no structure: the key stands for every one", () => {
	const key = graphKey(WORKFLOW.nodes, WORKFLOW.edges, WORKFLOW.groups ?? []);
	for (const graph of [OFF, PROBLEM, STATUSES, RUN])
		assert.equal(graphKey(graph.nodes, graph.edges, graph.groups ?? []), key);
});

test("Canvas draws its state fixtures in cells of showcaseFrames", () => {
	const cells = new Set(
		showcaseFrames()
			.filter((frame) => frame.component === "Canvas")
			.map((frame) => `${frame.cell.name}/${frame.state}`),
	);
	for (const cell of [
		"CANVAS_NODE.state.problem/rest",
		"CANVAS_NODE_TEXT.tone.off/rest",
		"STATUS_DOT.state.active/rest",
		"CANVAS_NODE_TEXT.tone.dimmed/rest",
		"CANVAS_NODE_TEXT.tone.dimmed/selected",
		"CANVAS_NODE_NAME.tone.rest/rest",
		"CANVAS_NODE_NAME.tone.off/rest",
		"CANVAS_NODE_NAME.tone.dimmed/rest",
	])
		assert.ok(cells.has(cell), cell);
});

const box = (x: number, y: number, width = 100, height = 50): Box => ({
	x,
	y,
	width,
	height,
});

test("groupBoxes grows the members' rectangle by the padding and the head on top", () => {
	const boxes = new Map([
		["a", box(100, 100)],
		["b", box(140, 200)],
	]);
	const frames = groupBoxes(
		[{ id: "g", head: "G", holds: ["a", "b"] }],
		boxes,
		{ pad: 10, head: 30 },
	);
	assert.deepEqual(frames.get("g"), { x: 90, y: 60, width: 160, height: 200 });
});

test("groupBoxes frames a nested group inside the one that holds it, whichever is listed first", () => {
	const boxes = new Map([
		["a", box(100, 100)],
		["b", box(100, 200)],
	]);
	const outer = { id: "outer", head: "O", holds: ["inner", "a"] };
	const inner = { id: "inner", head: "I", holds: ["b"] };
	for (const groups of [
		[outer, inner],
		[inner, outer],
	]) {
		const frames = groupBoxes(groups, boxes, { pad: 10, head: 30 });
		assert.deepEqual(frames.get("inner"), {
			x: 90,
			y: 160,
			width: 120,
			height: 100,
		});
		assert.deepEqual(frames.get("outer"), {
			x: 80,
			y: 60,
			width: 140,
			height: 210,
		});
	}
	assert.equal(
		groupBoxes([{ id: "g", head: "G", holds: ["ghost"] }], boxes, {
			pad: 10,
			head: 30,
		}).size,
		0,
	);
});

test("groupBoxes grows a frame to the right edge a back edge's corridor asks for", () => {
	const boxes = new Map([["a", box(100, 100)]]);
	const frames = groupBoxes(
		[{ id: "g", head: "G", holds: ["a"] }],
		boxes,
		{ pad: 10, head: 30 },
		new Map([["g", 260]]),
	);
	assert.deepEqual(frames.get("g"), { x: 90, y: 60, width: 180, height: 100 });
});

test("cleanPoints removes a repeat and a point on its neighbours' line, retraces included", () => {
	const p = (x: number, y: number) => ({ x, y });
	assert.deepEqual(cleanPoints([p(0, 0), p(0, 0), p(0, 10)]), [
		p(0, 0),
		p(0, 10),
	]);
	assert.deepEqual(cleanPoints([p(0, 0), p(0, 5), p(0, 10)]), [
		p(0, 0),
		p(0, 10),
	]);
	assert.deepEqual(
		cleanPoints([p(144, 194.5), p(144, 214.5), p(144, 201.5), p(144, 221.5)]),
		[p(144, 194.5), p(144, 221.5)],
	);
	assert.deepEqual(cleanPoints([p(0, 0), p(10, 0), p(10, 10)]), [
		p(0, 0),
		p(10, 0),
		p(10, 10),
	]);
});

test("roundedPath turns each corner into an arc of the radius, clamped to half a segment", () => {
	const corner = [
		{ x: 0, y: 0 },
		{ x: 100, y: 0 },
		{ x: 100, y: 100 },
	];
	assert.equal(roundedPath(corner, 10), "M0 0L90 0Q100 0 100 10L100 100");
	assert.equal(roundedPath(corner, 80), "M0 0L50 0Q100 0 100 50L100 100");
	assert.equal(roundedPath([], 10), "");
});

test("inside reads a box against the pane under the transform, inset on every side", () => {
	const transform = { x: 10, y: 10, k: 2 };
	const pane = { width: 400, height: 300 };
	assert.equal(inside(box(10, 10, 50, 20), transform, pane, 16), true);
	assert.equal(inside(box(0, 0, 50, 20), transform, pane, 16), false);
	assert.equal(inside(box(180, 10, 50, 20), transform, pane, 16), false);
});

test("fitTransform never exceeds scale 1 and centres the bounds", () => {
	const pane = { width: 400, height: 300 };
	const small = fitTransform(box(10, 20, 100, 50), pane, 16);
	assert.equal(small.k, 1);
	assert.equal(small.x + (10 + 50) * small.k, 200);
	assert.equal(small.y + (20 + 25) * small.k, 150);

	const large = fitTransform(box(0, 0, 1000, 200), pane, 16);
	assert.equal(large.k, (400 - 32) / 1000);
	assert.ok(large.k < 1);
	assert.ok(Math.abs(large.x + 500 * large.k - 200) <= 0.5);
	assert.ok(Math.abs(large.y + 100 * large.k - 150) <= 0.5);
});

test("openTransform centres a graph that fits and opens a larger one at its first node's top centre", () => {
	const pane = { width: 400, height: 300 };
	const fits = openTransform(
		box(10, 20, 100, 50),
		box(10, 20, 100, 50),
		pane,
		16,
	);
	assert.deepEqual(fits, { k: 1, x: 140, y: 105 });
	const bounds = box(0, 0, 1000, 1000);
	const first = box(300, 40, 240, 56);
	const open = openTransform(bounds, first, pane, 16);
	assert.equal(open.k, 1);
	// The first node's top centre stands on the pane's centre line, `inset`
	// below its top.
	assert.equal((first.x + first.width / 2) * open.k + open.x, 200);
	assert.equal(first.y * open.k + open.y, 16);
});

test("openTransform stays clear of the chrome a fit does: centred in the room, and a larger graph's first node at the room's top centre", () => {
	const pane = { width: 400, height: 300 };
	const clear = { left: 80, bottom: 70 };
	// The room is x 80 to 384 and y 16 to 230: 304 wide, 214 high.
	const bounds = box(10, 20, 100, 50);
	const fits = openTransform(bounds, bounds, pane, 16, clear);
	assert.deepEqual(fits, { k: 1, x: 80 + 152 - 60, y: 16 + 107 - 45 });
	const large = box(0, 0, 1000, 1000);
	const first = box(300, 40, 240, 56);
	const open = openTransform(large, first, pane, 16, clear);
	assert.equal(open.k, 1);
	assert.equal((first.x + first.width / 2) * open.k + open.x, 80 + 152);
	assert.equal(first.y * open.k + open.y, 16);
	// A graph that fits the pane but not the room opens as a larger one.
	const wide = box(0, 0, 330, 100);
	assert.equal(openTransform(wide, first, pane, 16).k, 1);
	assert.equal(
		(first.x + first.width / 2) * 1 +
			openTransform(wide, first, pane, 16, clear).x,
		80 + 152,
	);
});

// The graphs are placed by real ELK, the way the canvas does, with a node
// height, a group head and a chip of fixed test size, then routed.
const FIXTURES: [string, Graph][] = [
	["workflow", WORKFLOW],
	["journey", JOURNEY],
];

const chipSize = (label: string | undefined, handoff: boolean | undefined) => ({
	width: 7 * (label?.length ?? 0) + 24 + (handoff ? 20 : 0),
	height: CHIP,
});

async function route(source: Graph, pair = PAIR) {
	const { nodes, edges, groups = [] } = source;
	const order = pathOrder(nodes, edges);
	const reach = new Map(groups.map((g) => [g.id, PADX + 7 * g.head.length]));
	const left = leftPads(groups, reach, { pad: PAD, pair, width: WIDTH });
	const sizes = new Map(
		nodes.map((n) => [n.id, { width: WIDTH, height: HEIGHT }]),
	);
	const output = await new ELK().layout(
		elkGraph({
			nodes,
			edges,
			groups,
			order,
			sizes,
			head: HEAD,
			pad: PAD,
			left,
			gaps: { ...GAPS, layer: layerGap(48, CHIP, pair) },
		}),
	);
	const boxes = new Map<string, Box>(
		[...fromElk(output)].map(([id, point]) => [
			id,
			{ ...point, width: WIDTH, height: HEIGHT },
		]),
	);
	const labels = new Map(
		edges
			.filter((e) => e.label !== undefined || e.handoff)
			.map((e) => [e.id, chipSize(e.label, e.handoff)]),
	);
	const back = backEdges(order, edges);
	const input: RouteInput = {
		boxes,
		edges,
		back,
		groups,
		labels,
		head: HEAD,
		pad: PAD,
		left,
		pair,
		ports: false,
		port: PORT,
	};
	return {
		...routeEdges(input),
		input,
		output,
		back,
		boxes,
		order,
		reach,
		left,
	};
}

const cache = new Map<Graph, ReturnType<typeof route>>();
const placed = (source: Graph) => {
	let result = cache.get(source);
	if (!result) {
		result = route(source);
		cache.set(source, result);
	}
	return result;
};

const segments = (route: Route) =>
	route.points.slice(1).map((to, i) => [route.points[i], to] as const);

test("real ELK places the workflow without overlap, its forward edges downward, and the frames equal its own", async () => {
	const { boxes, output, back, input } = await placed(WORKFLOW);
	const { nodes, edges, groups = [] } = WORKFLOW;
	assert.equal(boxes.size, nodes.length);
	const all = [...boxes.entries()];
	for (const [i, [a, one]] of all.entries()) {
		for (const [b, two] of all.slice(i + 1)) {
			const apart =
				one.x + one.width <= two.x ||
				two.x + two.width <= one.x ||
				one.y + one.height <= two.y ||
				two.y + two.height <= one.y;
			assert.ok(apart, `${a} overlaps ${b}`);
		}
	}
	for (const e of edges) {
		if (back.includes(e.id)) continue;
		const from = boxes.get(e.from);
		const to = boxes.get(e.to);
		assert.ok(
			from && to && to.y >= from.y + from.height,
			`${e.id} runs downward`,
		);
	}
	const frames = groupBoxes(groups, boxes, {
		pad: PAD,
		head: HEAD,
		left: input.left,
	});
	for (const group of groups) {
		const own = output.children?.find((c) => c.id === `g:${group.id}`);
		const frame = frames.get(group.id);
		assert.ok(own && frame);
		for (const side of ["x", "y", "width", "height"] as const) {
			assert.ok(
				Math.abs((own[side] ?? 0) - frame[side]) < 1,
				`${group.id} ${side}: ELK ${own[side]}, frame ${frame[side]}`,
			);
		}
	}
	assert.equal(input.back.length, 2);
});

const grow = (box: Box, by: number): Box => ({
	x: box.x - by,
	y: box.y - by,
	width: box.width + 2 * by,
	height: box.height + 2 * by,
});

const overlaps = (a: Box, b: Box) =>
	a.x < b.x + b.width &&
	b.x < a.x + a.width &&
	a.y < b.y + b.height &&
	b.y < a.y + a.height;

for (const [name, source] of FIXTURES) {
	test(`${name}: no route holds a repeated point or one on its neighbours' line`, async () => {
		const { routes } = await placed(source);
		assert.ok(routes.size > 0);
		for (const [id, { points }] of routes) {
			assert.deepEqual(cleanPoints(points), points, id);
		}
	});

	test(`${name}: forward routes are orthogonal, run bottom centre to top centre and cross no node or foreign head`, async () => {
		const { routes, frames, boxes, back } = await placed(source);
		const { edges, groups = [] } = source;
		const tree = groupTree(groups, new Set(boxes.keys()));
		const holders = (id: string) => {
			const out: string[] = [];
			for (let at = tree.parent.get(id); at; at = tree.parent.get(at))
				out.push(at);
			return out;
		};
		for (const edge of edges) {
			if (back.includes(edge.id)) continue;
			const found = routes.get(edge.id);
			const from = boxes.get(edge.from);
			const to = boxes.get(edge.to);
			assert.ok(found && from && to, edge.id);
			assert.deepEqual(found.points[0], {
				x: from.x + from.width / 2,
				y: from.y + from.height,
			});
			assert.deepEqual(found.points.at(-1), {
				x: to.x + to.width / 2,
				y: to.y,
			});
			const held = new Set([...holders(edge.from), ...holders(edge.to)]);
			for (const [a, b] of segments(found)) {
				assert.ok(a && b);
				assert.ok(a.x === b.x || a.y === b.y, `${edge.id} is orthogonal`);
				for (const [id, other] of boxes) {
					if (id === edge.from || id === edge.to) continue;
					assert.ok(!crosses(a, b, other), `${edge.id} crosses ${id}`);
				}
				for (const [id, frame] of frames) {
					if (held.has(id)) continue;
					const band = { ...frame, height: HEAD };
					assert.ok(
						!crosses(a, b, band),
						`${edge.id} crosses the head of ${id}`,
					);
				}
			}
		}
	});

	test(`${name}: a chip stands beside a leg of its edge, on a stretch no other edge draws on, clear of every node, head, chip, arrowhead and its own line`, async () => {
		const { routes, frames, boxes, back } = await placed(source);
		const chips = [...routes].filter(([, r]) => r.label);
		assert.ok(chips.length > 0);
		for (const [id, { label, points }] of chips) {
			assert.ok(label, id);
			const leg = verticalLegs(points).find((l) => l.x + PAIR === label.x);
			assert.ok(leg, `${id}: a leg ${PAIR} left of its chip`);
			if (!back.includes(id)) {
				// `pair` under the stretch's top and a `pair` of air under the chip.
				const top = label.y - PAIR;
				const bottom = label.y + label.height + PAIR;
				assert.ok(
					top >= leg.top && bottom <= leg.bottom,
					`${id}: inside its leg`,
				);
				for (const [other, found] of routes) {
					if (other === id) continue;
					for (const l of verticalLegs(found.points))
						assert.ok(
							!(l.x === leg.x && l.top < bottom && l.bottom > top),
							`${id}: ${other} draws on its stretch`,
						);
				}
			}
			// It clears each by a `pair`: grown by one, it still touches none.
			const near = grow(label, PAIR);
			for (const [at, other] of boxes)
				assert.ok(!overlaps(near, other), `${id} is near ${at}`);
			for (const [at, frame] of frames)
				assert.ok(
					!overlaps(near, { ...frame, height: HEAD }),
					`${id} is near the head of ${at}`,
				);
			for (const [other, found] of routes) {
				assert.ok(
					!overlaps(near, found.arrow),
					`${id} is near the arrow of ${other}`,
				);
				if (other !== id && found.label)
					assert.ok(
						!overlaps(near, found.label),
						`${id} is near the chip of ${other}`,
					);
			}
			for (const [x, y] of segments({ points, arrow: label }))
				assert.ok(x && y && !crosses(x, y, near), `${id} is near its line`);
		}
	});
}

test("the journey's three option chips stand apart, level, a pair under the fan-out's bend", async () => {
	const { routes, boxes } = await placed(JOURNEY);
	const begin = boxes.get("begin");
	assert.ok(begin);
	const chips = ["begin-a1", "begin-b1", "begin-c1"].map((id) => {
		const label = routes.get(id)?.label;
		assert.ok(label, id);
		return label;
	});
	assert.equal(new Set(chips.map((c) => c.x)).size, 3);
	// The bend is the middle of the layer gap.
	for (const c of chips)
		assert.equal(c.y, begin.y + begin.height + GAPS.layer / 2 + PAIR);
});

const alone = (over: Partial<RouteInput>): RouteInput => ({
	boxes: new Map(),
	edges: [],
	back: [],
	groups: [],
	labels: new Map(),
	head: HEAD,
	pad: PAD,
	pair: PAIR,
	ports: false,
	port: PORT,
	...over,
});

test("a target whose column holds a node is entered from the middle of the gap above it", () => {
	const boxes = new Map([
		["s", box(0, 0, 240, 56)],
		["blocker", box(300, 100, 240, 56)],
		["t", box(300, 300, 240, 56)],
	]);
	const edges = [{ id: "e", from: "s", to: "t" }];
	const blocked = routeEdges(alone({ boxes, edges }));
	assert.deepEqual(blocked.routes.get("e")?.points, [
		{ x: 120, y: 56 },
		// The gap above the target runs from the blocker's bottom (156) to its top.
		{ x: 120, y: 228 },
		{ x: 420, y: 228 },
		{ x: 420, y: 300 },
	]);
	const clear = new Map([...boxes].filter(([id]) => id !== "blocker"));
	const free = routeEdges(alone({ boxes: clear, edges }));
	// Clear, it bends in the middle of the gap under the source.
	assert.deepEqual(free.routes.get("e")?.points[1], { x: 120, y: 178 });
});

test("with ports a forward route ends a ring's radius, the tip's overhang and a pixel centre above its target's top, the arrowhead with it; without, on the edge", () => {
	const boxes = new Map([
		["s", box(0, 0, 240, 56)],
		["t", box(300, 300, 240, 56)],
		["u", box(0, 300, 240, 56)],
	]);
	const edges = [
		{ id: "bent", from: "s", to: "t" },
		{ id: "straight", from: "s", to: "u" },
	];
	const bare = routeEdges(alone({ boxes, edges }));
	const ringed = routeEdges(alone({ boxes, edges, ports: true }));
	for (const [id, x] of [
		["bent", 420],
		["straight", 120],
	] as const) {
		const without = bare.routes.get(id);
		const withRing = ringed.routes.get(id);
		assert.deepEqual(without?.points.at(-1), { x, y: 300 });
		// The drawn tip, a stroke on a pixel centre plus the overhang, lands a
		// half pixel above the ring's outer top (300 - PORT / 2).
		const end = 300 - PORT / 2 - (ARROW - ARROW_REF) - PIXEL_CENTRE;
		assert.deepEqual(withRing?.points.at(-1), { x, y: end });
		assert.equal(crisp([{ x, y: end }])[0]?.y, end);
		assert.equal(end + (ARROW - ARROW_REF), 300 - PORT / 2 - PIXEL_CENTRE);
		assert.equal(without?.arrow.y, 300 - ARROW);
		assert.equal(withRing?.arrow.y, end - ARROW);
		// Nothing else moves: the route starts where it did.
		assert.deepEqual(withRing?.points[0], without?.points[0]);
		assert.equal(withRing?.points.length, without?.points.length);
	}
});

test("a back edge and a self loop enter a node's right side, so ports leave them unmoved", () => {
	const boxes = new Map([
		["a", box(0, 0, 240, 56)],
		["b", box(0, 200, 240, 56)],
	]);
	const edges = [
		{ id: "down", from: "a", to: "b" },
		{ id: "up", from: "b", to: "a" },
		{ id: "loop", from: "b", to: "b" },
	];
	const input = { boxes, edges, back: ["up", "loop"] };
	const bare = routeEdges(alone(input));
	const ringed = routeEdges(alone({ ...input, ports: true }));
	for (const id of ["up", "loop"]) {
		assert.deepEqual(ringed.routes.get(id), bare.routes.get(id));
	}
	assert.notDeepEqual(ringed.routes.get("down"), bare.routes.get("down"));
});

test("a target not far enough below its source bends at the middle of the span, unchecked", () => {
	const boxes = new Map([
		["s", box(0, 0, 240, 56)],
		["t", box(300, 60, 240, 56)],
	]);
	const { routes } = routeEdges(
		alone({ boxes, edges: [{ id: "e", from: "s", to: "t" }] }),
	);
	assert.deepEqual(routes.get("e")?.points, [
		{ x: 120, y: 56 },
		{ x: 120, y: 58 },
		{ x: 420, y: 58 },
		{ x: 420, y: 60 },
	]);
});

test("the workflow's loop edge runs inside the loop's frame, the gate's answer clears every frame and the frame differs from the bare rectangle only on the right", async () => {
	const { routes, frames, boxes, left } = await placed(WORKFLOW);
	const loop = frames.get("loop");
	const bare = groupBoxes(WORKFLOW.groups ?? [], boxes, {
		pad: PAD,
		head: HEAD,
		left,
	}).get("loop");
	assert.ok(loop && bare);
	const corridor = (id: string) =>
		verticalLegs(routes.get(id)?.points ?? [])[0];
	const red = corridor("check-build");
	const answer = corridor("gate-plan");
	assert.ok(red && answer);
	const chip = routes.get("check-build")?.label;
	assert.ok(chip);
	assert.ok(red.x > loop.x && red.x < loop.x + loop.width);
	// The frame holds the chip and its own padding.
	assert.ok(loop.x + loop.width >= chip.x + chip.width + PAD);
	assert.ok(answer.x > loop.x + loop.width);
	assert.deepEqual(
		[loop.x, loop.y, loop.height],
		[bare.x, bare.y, bare.height],
	);
	assert.ok(loop.width > bare.width);
});

test("corridors whose spans meet stand the widest chip and two pairs apart", () => {
	const boxes = new Map(
		["a", "b", "c"].map(
			(id, i) => [id, box(0, i * 120, WIDTH, HEIGHT)] as const,
		),
	);
	const edges = [
		{ id: "ca", from: "c", to: "a" },
		{ id: "cb", from: "c", to: "b" },
		{ id: "ba", from: "b", to: "a" },
	];
	const labels = new Map([
		["ca", { width: 90, height: CHIP }],
		["cb", { width: 40, height: CHIP }],
		["ba", { width: 60, height: CHIP }],
	]);
	const { routes } = routeEdges(
		alone({ boxes, edges, back: edges.map((e) => e.id), labels }),
	);
	const x = (id: string) =>
		verticalLegs(routes.get(id)?.points ?? [])[0]?.x ?? 0;
	for (const [one, two] of [
		["ca", "cb"],
		["ca", "ba"],
		["cb", "ba"],
	] as const) {
		const widest = Math.max(
			labels.get(one)?.width ?? 0,
			labels.get(two)?.width ?? 0,
		);
		assert.ok(Math.abs(x(one) - x(two)) >= widest + 2 * PAIR, `${one} ${two}`);
	}
});

test("a self-loop leaves and returns on its own node's right side", () => {
	const { routes } = routeEdges(
		alone({
			boxes: new Map([["a", box(0, 0, 240, 56)]]),
			edges: [{ id: "loop", from: "a", to: "a" }],
			back: ["loop"],
		}),
	);
	const points = routes.get("loop")?.points ?? [];
	assert.equal(points.length, 4);
	assert.deepEqual(points[0], { x: 240, y: 14 });
	assert.deepEqual(points.at(-1), { x: 240, y: 42 });
});

test("a nested group's back edge grows the inner frame, and the outer frame grows with it", () => {
	const boxes = new Map([
		["a", box(0, 0, 100, 50)],
		["b", box(0, 100, 100, 50)],
	]);
	const groups = [
		{ id: "outer", head: "O", holds: ["inner"] },
		{ id: "inner", head: "I", holds: ["a", "b"] },
	];
	const edges = [{ id: "up", from: "b", to: "a" }];
	const labels = new Map([["up", { width: 50, height: CHIP }]]);
	const base = groupBoxes(groups, boxes, { pad: PAD, head: HEAD });
	const { frames } = routeEdges(
		alone({ boxes, edges, back: ["up"], groups, labels }),
	);
	for (const id of ["inner", "outer"]) {
		const grown = frames.get(id);
		const was = base.get(id);
		assert.ok(grown && was);
		assert.ok(grown.width > was.width, id);
	}
	const inner = frames.get("inner");
	const outer = frames.get("outer");
	assert.ok(inner && outer);
	assert.ok(outer.x + outer.width >= inner.x + inner.width + PAD);
});

test("leftPads widens a group's left side until its head text ends a pair before a node's centre", () => {
	const groups = [
		{ id: "long", head: "L", holds: [] },
		{ id: "short", head: "S", holds: [] },
	];
	const pads = leftPads(
		groups,
		new Map([
			["long", 185],
			["short", 60],
		]),
		{ pad: 16, pair: 8, width: 240 },
	);
	// 185 + 8 - 120; a head that already ends before the centre keeps `pad`.
	assert.deepEqual([...pads], [["long", 73]]);
});

test("workflow: every edge that crosses a group's head band passes a pair beyond the head text", async () => {
	const { routes, frames, reach } = await placed(WORKFLOW);
	let crossed = 0;
	for (const [id, frame] of frames) {
		const band = { ...frame, height: HEAD };
		const end = frame.x + (reach.get(id) ?? 0);
		for (const [edge, route] of routes) {
			for (const [a, b] of segments(route)) {
				if (!a || !b || !crosses(a, b, band)) continue;
				crossed++;
				assert.ok(
					Math.min(a.x, b.x) >= end + PAIR,
					`${edge} crosses the head ${Math.min(a.x, b.x) - end} px from its text`,
				);
			}
		}
	}
	assert.ok(crossed > 0);
});

for (const [name, source] of FIXTURES) {
	test(`${name}: no forward bend lies within a pair of a node's top or bottom`, async () => {
		const { routes, boxes, back } = await placed(source);
		for (const edge of source.edges) {
			if (back.includes(edge.id)) continue;
			const points = routes.get(edge.id)?.points ?? [];
			for (const { y } of points.slice(1, -1))
				for (const [id, node] of boxes) {
					assert.ok(
						Math.abs(y - node.y) >= PAIR &&
							Math.abs(y - (node.y + node.height)) >= PAIR,
						`${edge.id} bends at ${y}, near ${id}`,
					);
				}
		}
	});
}

test("the journey's start node stands over the middle of its legs", async () => {
	const { boxes } = await placed(JOURNEY);
	const centre = (id: string) => {
		const node = boxes.get(id);
		assert.ok(node, id);
		return node.x + node.width / 2;
	};
	const legs = ["a1", "b1", "c1"].map(centre);
	const middle = (Math.min(...legs) + Math.max(...legs)) / 2;
	assert.ok(
		Math.abs(centre("begin") - middle) <= PAIR,
		`begin is ${centre("begin") - middle} px off the middle of its legs`,
	);
});

test("crisp moves each point onto its pixel's centre", () => {
	assert.deepEqual(
		crisp([
			{ x: 181.2969, y: 92 },
			{ x: 181.7, y: 172.99 },
		]),
		[
			{ x: 181.5, y: 92.5 },
			{ x: 181.5, y: 172.5 },
		],
	);
});

for (const pair of [PAIR, 6]) {
	test(`workflow at pair ${pair}: each back-edge stub holds the arrowhead and a corner`, async () => {
		const { routes, frames, back, boxes } = await route(WORKFLOW, pair);
		assert.ok(back.length > 0);
		for (const id of back) {
			const points = routes.get(id)?.points ?? [];
			assert.equal(points.length, 4, id);
			const [out, , , into] = points;
			assert.ok(out && into);
			const edge = WORKFLOW.edges.find((e) => e.id === id);
			assert.ok(edge, id);
			const far = points[1];
			assert.ok(far);
			const source = boxes.get(edge.from);
			const target = boxes.get(edge.to);
			assert.ok(source && target);
			assert.ok(
				far.x - (source.x + source.width) >= ARROW + pair,
				`${id} out of its source`,
			);
			assert.ok(
				far.x - (target.x + target.width) >= ARROW + pair,
				`${id} into its target`,
			);
		}
		// The loop's frame still holds its corridor and chip.
		const loop = frames.get("loop");
		const corridor = routes.get("check-build")?.points[1];
		const chip = routes.get("check-build")?.label;
		assert.ok(loop && corridor && chip);
		assert.ok(loop.x + loop.width >= chip.x + chip.width + PAD);
	});
}

test("whole puts a transform's translate on whole pixels and keeps its scale", () => {
	assert.deepEqual(whole({ x: 260.156, y: -573.5, k: 1 }), {
		x: 260,
		y: -573,
		k: 1,
	});
	assert.deepEqual(whole({ x: -0.4, y: 12.5, k: 0.37 }), {
		x: -0,
		y: 13,
		k: 0.37,
	});
});

test("fromElk rounds every position to whole pixels, and real ELK's are whole", async () => {
	const out = fromElk({
		id: "root",
		children: [{ id: "n:a", x: 303.84, y: 24.4, width: 240, height: 56 }],
	});
	assert.deepEqual([...out], [["a", { x: 304, y: 24 }]]);
	for (const source of [WORKFLOW, JOURNEY]) {
		const { boxes } = await placed(source);
		for (const [id, { x, y }] of boxes)
			assert.ok(Number.isInteger(x) && Number.isInteger(y), id);
	}
});

test("leftPads rounds up to whole pixels", () => {
	const pads = leftPads(
		[{ id: "g", head: "G", holds: [] }],
		new Map([["g", 150.3]]),
		{ pad: 16, pair: 6, width: 240 },
	);
	assert.deepEqual([...pads], [["g", 37]]);
});

test("landAt puts the node's centre on the point, keeping its sign", () => {
	assert.deepEqual(landAt({ x: 100, y: 60 }, { width: 40, height: 20 }), {
		x: 80,
		y: 50,
	});
	assert.deepEqual(landAt({ x: 7, y: 9 }, { width: 0, height: 0 }), {
		x: 7,
		y: 9,
	});
	assert.deepEqual(landAt({ x: -100, y: -60 }, { width: 40, height: 20 }), {
		x: -120,
		y: -70,
	});
});

test("place reads live, then the given position, then landed, then computed, then the origin", () => {
	const at = (x: number) => ({ x, y: x });
	const node = { id: "a", position: at(2) };
	const bare = { id: "a" };
	const live = new Map([["a", at(1)]]);
	const landed = new Map([["a", at(3)]]);
	const computed = new Map([["a", at(4)]]);
	const none = new Map<string, { x: number; y: number }>();
	assert.deepEqual(place(node, { live, landed, computed }), at(1));
	assert.deepEqual(place(node, { live: none, landed, computed }), at(2));
	assert.deepEqual(place(bare, { live: none, landed, computed }), at(3));
	assert.deepEqual(place(bare, { live: none, landed: none, computed }), at(4));
	assert.deepEqual(place(bare, { live: none, landed: none }), ORIGIN);
});

test("bendRoute is straight on one column and bends a pair under the source otherwise", () => {
	const S = { x: 100, y: 0 };
	assert.deepEqual(bendRoute(S, { x: 100, y: 200 }, PAIR), [
		S,
		{ x: 100, y: 200 },
	]);
	assert.deepEqual(bendRoute(S, { x: 40, y: 200 }, PAIR), [
		S,
		{ x: 100, y: PAIR },
		{ x: 40, y: PAIR },
		{ x: 40, y: 200 },
	]);
});

test("bendRoute bends a target within two pairs at the middle of the span", () => {
	const S = { x: 100, y: 0 };
	const T = { x: 160, y: 2 * PAIR - 1 };
	assert.deepEqual(bendRoute(S, T, PAIR), [
		S,
		{ x: 100, y: T.y / 2 },
		{ x: 160, y: T.y / 2 },
		T,
	]);
});

test("bendRoute draws a target left of or above the source with nothing doubled or collinear", () => {
	const S = { x: 100, y: 100 };
	for (const T of [
		{ x: 20, y: 400 },
		{ x: 20, y: 100 },
		{ x: 180, y: 40 },
		{ x: 100, y: 40 },
		{ x: 100, y: 100 },
	]) {
		const points = cleanPoints(bendRoute(S, T, PAIR));
		assert.deepEqual(points[0], S);
		assert.deepEqual(points.at(-1), T);
		points.forEach((point, index) => {
			const before = points[index - 1];
			const after = points[index + 1];
			if (before) assert.notDeepEqual(before, point);
			if (before && after)
				assert.notEqual(
					(point.x - before.x) * (after.y - point.y),
					(point.y - before.y) * (after.x - point.x),
				);
		});
	}
});

test("elkGraph ignores the positions the nodes carry", () => {
	const { nodes } = WORKFLOW;
	const placed = nodes.map((n, index) => ({
		...n,
		position: { x: index * 10, y: index * 20 },
	}));
	assert.deepEqual(graph({ nodes: placed }), graph());
});

test("the text floor is the caption's size, and a zoom is below it under exactly zoom 1", () => {
	assert.equal(TEXT_FLOOR, 11);
	assert.equal(belowFloor(1, TEXT_FLOOR, TEXT_FLOOR), false);
	assert.equal(belowFloor(1 - 1e-9, TEXT_FLOOR, TEXT_FLOOR), true);
	assert.equal(belowFloor(2, TEXT_FLOOR, TEXT_FLOOR), false);
	assert.equal(belowFloor(0.5, 22, 11), false);
	assert.equal(belowFloor(0.49, 22, 11), true);
});

test("a glyph is the control size of its density", () => {
	assert.equal(glyphSize(false), 32);
	assert.equal(glyphSize(true), 44);
});

test("minZoomFor keeps two glyphs a gap of 2 * pair apart by the larger axis of their centres, within the scale extent", () => {
	const at = (x: number, y: number) => box(x - 100, y - 20, 200, 40);
	// Centres 200 apart across and 120 apart down: the larger gap decides.
	const pair = [at(0, 0), at(200, 120)];
	assert.equal(minZoomFor(pair, 32, PAIR), (32 + 2 * PAIR) / 200);
	assert.equal(minZoomFor(pair, 44, PAIR), (44 + 2 * PAIR) / 200);
	assert.equal(minZoomFor(pair, 32, 0), 32 / 200);
	// The nearest pair of three decides.
	assert.equal(
		minZoomFor([at(0, 0), at(400, 0), at(400, 160)], 32, PAIR),
		(32 + 2 * PAIR) / 160,
	);
	// Never above 1, never under the extent's floor; one node or none gives it.
	assert.equal(minZoomFor([at(0, 0), at(10, 0)], 32, PAIR), 1);
	assert.equal(minZoomFor([at(0, 0), at(0, 0)], 32, PAIR), 1);
	assert.equal(minZoomFor([at(0, 0), at(100000, 0)], 32, PAIR), EXTENT[0]);
	assert.equal(minZoomFor([at(0, 0)], 32, PAIR), EXTENT[0]);
	assert.equal(minZoomFor([], 32, PAIR), EXTENT[0]);
});

test("minZoomFor on the workflow keeps every pair of glyphs a gap of 2 * pair apart at that zoom", async () => {
	const boxes = [...(await placed(WORKFLOW)).boxes.values()];
	for (const glyph of [glyphSize(false), glyphSize(true)]) {
		const k = minZoomFor(boxes, glyph, PAIR);
		assert.ok(k >= EXTENT[0] && k <= 1);
		boxes.forEach((one, index) => {
			for (const two of boxes.slice(index + 1)) {
				const gap = Math.max(
					Math.abs(one.x + one.width / 2 - (two.x + two.width / 2)),
					Math.abs(one.y + one.height / 2 - (two.y + two.height / 2)),
				);
				assert.ok(gap * k >= glyph + 2 * PAIR - 1e-9);
			}
		});
	}
});

test("the overview floor is a half, and a name is capped at the short measure of the caption", () => {
	assert.equal(OVERVIEW_FLOOR, 0.5);
	// 18 characters at 0.6 of an 11 px caption, rounded up; the touch caption is larger.
	assert.equal(nameCap(false), 119);
	assert.ok(nameCap(true) > nameCap(false));
});

test("overviewFloorFor keeps two overview forms apart by the nearer of the two axes, never under the overview floor", () => {
	const at = (x: number, y: number) => box(x - 100, y - 20, 200, 40);
	const form = 32 + PAIR + 119;
	const air = 2 * PAIR;
	// Far apart: the floor stands at the overview's own.
	assert.equal(
		overviewFloorFor([at(0, 0), at(2000, 2000)], 32, form, air),
		OVERVIEW_FLOOR,
	);
	assert.equal(overviewFloorFor([at(0, 0)], 32, form, air), OVERVIEW_FLOOR);
	assert.equal(overviewFloorFor([], 32, form, air), OVERVIEW_FLOOR);
	// Side by side 400 apart, level: the width over the distance.
	assert.equal(
		overviewFloorFor([at(0, 0), at(400, 0)], 32, form, air),
		Math.max(OVERVIEW_FLOOR, (form + air) / 400),
	);
	// Stacked 100 apart, in one column: the glyph over the distance.
	assert.equal(
		overviewFloorFor([at(0, 0), at(0, 100)], 32, form, air),
		Math.max(OVERVIEW_FLOOR, (32 + air) / 100),
	);
	// Offset on both axes: the nearer zoom that clears one of them.
	const offset = overviewFloorFor([at(0, 0), at(300, 120)], 32, form, air);
	assert.equal(
		offset,
		Math.max(OVERVIEW_FLOOR, Math.min((form + air) / 300, (32 + air) / 120)),
	);
	// Too close to clear above zoom 1, or coincident: no overview, the floor is 1.
	assert.equal(overviewFloorFor([at(0, 0), at(30, 20)], 32, form, air), 1);
	assert.equal(overviewFloorFor([at(0, 0), at(0, 0)], 32, form, air), 1);
});

test("on the workflow the overview forms clear each other at their floor, at both densities", async () => {
	const boxes = [...(await placed(WORKFLOW)).boxes.values()];
	for (const touch of [false, true]) {
		const glyph = glyphSize(touch);
		const form = glyph + PAIR + nameCap(touch);
		const floor = overviewFloorFor(boxes, glyph, form, 2 * PAIR);
		assert.ok(floor >= OVERVIEW_FLOOR && floor <= 1);
		if (floor === 1) continue;
		boxes.forEach((one, index) => {
			for (const two of boxes.slice(index + 1)) {
				const across =
					Math.abs(one.x + one.width / 2 - (two.x + two.width / 2)) * floor;
				const down =
					Math.abs(one.y + one.height / 2 - (two.y + two.height / 2)) * floor;
				assert.ok(
					across >= form + 2 * PAIR - 1e-9 || down >= glyph + 2 * PAIR - 1e-9,
				);
			}
		});
	}
});

test("routeSide is 0 from zoom 1 and, under it, the glyph over the zoom rounded up to a step", () => {
	assert.equal(routeSide(1, 32, PAIR), 0);
	assert.equal(routeSide(2, 32, PAIR), 0);
	assert.equal(routeSide(0.5, 32, PAIR), 64);
	// A tick inside one step is the same side: nothing is routed again.
	assert.equal(routeSide(0.485, 32, PAIR), routeSide(0.49, 32, PAIR));
	assert.equal(routeSide(0.49, 32, PAIR), 72);
	for (const k of [0.99, 0.7, 0.33, 0.1]) {
		const side = routeSide(k, 44, PAIR);
		assert.ok(side >= 44 / k && side < 44 / k + PAIR);
		assert.equal(side % PAIR, 0);
	}
});

test("glyphBoxes centres a square of the side on each box", () => {
	const boxes = new Map([["a", box(10, 20, 240, 56)]]);
	assert.deepEqual(glyphBoxes(boxes, 64).get("a"), box(98, 16, 64, 64));
});

test("routed to its glyph's box, every edge's two ends lie on the glyphs and a frame holds its glyphs by the padding", async () => {
	for (const [, source] of FIXTURES) {
		const { input } = await placed(source);
		for (const glyph of [glyphSize(false), glyphSize(true)]) {
			const k = minZoomFor([...input.boxes.values()], glyph, PAIR);
			const side = routeSide(k, glyph, PAIR);
			assert.ok(side > 0);
			const solids = glyphBoxes(input.boxes, side);
			const { routes, frames } = routeEdges({
				...input,
				boxes: solids,
				ports: false,
			});
			for (const edge of input.edges) {
				const route = routes.get(edge.id);
				const from = solids.get(edge.from);
				const to = solids.get(edge.to);
				assert.ok(route && from && to, edge.id);
				const first = route.points[0];
				const last = route.points.at(-1);
				assert.ok(first && last);
				const on = (point: { x: number; y: number }, b: Box) =>
					point.x >= b.x &&
					point.x <= b.x + b.width &&
					point.y >= b.y &&
					point.y <= b.y + b.height;
				assert.ok(on(first, from), `${edge.id}: starts on its source's glyph`);
				assert.ok(on(last, to), `${edge.id}: ends on its target's glyph`);
			}
			for (const group of input.groups) {
				const frame = frames.get(group.id);
				assert.ok(frame, group.id);
				for (const id of group.holds) {
					const held = solids.get(id);
					if (!held) continue;
					assert.ok(frame.x <= held.x - input.pad + 1e-9);
					assert.ok(frame.y <= held.y - input.pad - input.head + 1e-9);
					assert.ok(
						frame.x + frame.width >= held.x + held.width + input.pad - 1e-9,
					);
					assert.ok(
						frame.y + frame.height >= held.y + held.height + input.pad - 1e-9,
					);
				}
			}
		}
	}
});

test("carried moves a node by the pointer's distance over the zoom", () => {
	const start = { x: 100, y: 50 };
	const from = { x: 300, y: 200 };
	assert.deepEqual(carried(start, from, { x: 360, y: 240 }, 1), {
		x: 160,
		y: 90,
	});
	assert.deepEqual(carried(start, from, { x: 360, y: 240 }, 2), {
		x: 130,
		y: 70,
	});
	assert.deepEqual(carried(start, from, from, 0.5), start);
	assert.deepEqual(carried(start, from, { x: 290, y: 190 }, 0.5), {
		x: 80,
		y: 30,
	});
});

test("centredTransform puts the box's centre on the pane's centre at the given zoom", () => {
	const pane = { width: 400, height: 300 };
	const target = box(100, 60, 240, 56);
	for (const k of [0.5, 1, 2]) {
		const { x, y } = centredTransform(target, k, pane);
		assert.equal((target.x + target.width / 2) * k + x, pane.width / 2);
		assert.equal((target.y + target.height / 2) * k + y, pane.height / 2);
		assert.equal(centredTransform(target, k, pane).k, k);
	}
});

test("fitTransform stands the bounds clear of the chrome on the left and the bottom", () => {
	const pane = { width: 400, height: 300 };
	const bounds = box(0, 0, 1000, 200);
	// No chrome, or chrome inside the inset, is the plain fit.
	assert.deepEqual(
		fitTransform(bounds, pane, 16, { left: 10, bottom: 10 }),
		fitTransform(bounds, pane, 16),
	);
	const clear = { left: 60, bottom: 90 };
	const fit = fitTransform(bounds, pane, 16, clear);
	// The scale fits the room left: 400 - 16 - 60 wide.
	assert.equal(fit.k, (400 - 16 - 60) / 1000);
	// The drawing stands inside the room, centred in it.
	assert.ok(fit.x >= 60 - 1e-9);
	assert.ok(fit.x + 1000 * fit.k <= 400 - 16 + 1e-9);
	assert.ok(fit.y + 200 * fit.k <= 300 - 90 + 1e-9);
	assert.ok(Math.abs(fit.x + 500 * fit.k - (60 + (400 - 16)) / 2) < 1e-9);
	assert.ok(Math.abs(fit.y + 100 * fit.k - (16 + (300 - 90)) / 2) < 1e-9);
	// A tall graph is held by the bottom.
	const tall = fitTransform(box(0, 0, 100, 1000), pane, 16, clear);
	assert.equal(tall.k, (300 - 16 - 90) / 1000);
	// A small graph keeps its own size.
	assert.equal(fitTransform(box(0, 0, 50, 50), pane, 16, clear).k, 1);
});

test("emptyGroups names the groups holding no present node and no group, and not the group that frames one", () => {
	const groups: CanvasGroup[] = [
		{ id: "loop", head: "Loop", holds: ["gone", "a"] },
		{ id: "bare", head: "Bare", holds: ["gone"] },
		{ id: "frame", head: "Frame", holds: ["bare"] },
		{ id: "none", head: "None", holds: [] },
	];
	assert.deepEqual(emptyGroups(groups, new Set(["a"])), ["bare", "none"]);
	assert.deepEqual(emptyGroups(groups, new Set()), ["loop", "bare", "none"]);
});

test("hollowRow stands the ids in one row below the nodes' bounds, left-aligned with them, in the order given, and stands none without a node", () => {
	const nodes = [box(40, 10, 100, 50), box(200, 90, 100, 70)];
	const size = { width: 240, height: 74 };
	const row = hollowRow(["a", "b", "c"], nodes, size, { gap: 16, drop: 60 });
	assert.deepEqual([...row.keys()], ["a", "b", "c"]);
	assert.deepEqual(row.get("a"), { x: 40, y: 220, ...size });
	assert.deepEqual(row.get("b"), { x: 296, y: 220, ...size });
	assert.deepEqual(row.get("c"), { x: 552, y: 220, ...size });
	assert.equal(hollowRow(["a"], [], size, { gap: 16, drop: 60 }).size, 0);
});

test("groupBoxes frames an empty group by its own box, and the group that holds only empty groups around it", () => {
	const groups: CanvasGroup[] = [
		{ id: "frame", head: "F", holds: ["bare"] },
		{ id: "bare", head: "B", holds: [] },
	];
	const boxes = new Map([["bare", box(100, 100, 240, 74)]]);
	const frames = groupBoxes(groups, boxes, { pad: 10, head: 30 });
	assert.deepEqual(frames.get("bare"), box(100, 100, 240, 74));
	assert.deepEqual(frames.get("frame"), {
		x: 90,
		y: 60,
		width: 260,
		height: 124,
	});
});

test("real ELK stands an empty group between its neighbours as a leaf of its head and padding, and its edges meet it", async () => {
	const nodes = ["a", "b"].map(node);
	const groups: CanvasGroup[] = [{ id: "loop", head: "Loop", holds: [] }];
	const edges = [
		{ id: "in", from: "a", to: "loop" },
		{ id: "out", from: "loop", to: "b" },
	];
	const order = pathOrder([...nodes, { id: "loop" }], edges);
	assert.deepEqual(order, ["a", "loop", "b"]);
	const output = await new ELK().layout(
		elkGraph({
			nodes,
			edges,
			groups,
			order,
			sizes: new Map(
				nodes.map((n) => [n.id, { width: WIDTH, height: HEIGHT }]),
			),
			head: HEAD,
			pad: PAD,
			gaps: GAPS,
		}),
	);
	assert.deepEqual(
		(output.children ?? []).map((child) => child.id),
		["n:a", "n:loop", "n:b"],
	);
	const leaf = output.children?.find((child) => child.id === "n:loop");
	assert.equal(leaf?.width, WIDTH);
	assert.equal(leaf?.height, HEAD + 2 * PAD);
	const sized = (id: string, height: number): [string, Box] => {
		const at = fromElk(output).get(id);
		assert.ok(at);
		return [id, { ...at, width: WIDTH, height }];
	};
	const boxes = new Map([
		sized("a", HEIGHT),
		sized("loop", HEAD + 2 * PAD),
		sized("b", HEIGHT),
	]);
	const a = boxes.get("a");
	const hollow = boxes.get("loop");
	const b = boxes.get("b");
	assert.ok(a && hollow && b);
	assert.ok(a.y + a.height <= hollow.y && hollow.y + hollow.height <= b.y);
	const routed = routeEdges(alone({ boxes, edges, groups }));
	assert.deepEqual(routed.frames.get("loop"), hollow);
	assert.deepEqual(routed.routes.get("in")?.points.at(-1), {
		x: hollow.x + hollow.width / 2,
		y: hollow.y,
	});
	assert.deepEqual(routed.routes.get("out")?.points[0], {
		x: hollow.x + hollow.width / 2,
		y: hollow.y + hollow.height,
	});
});

test("an edge naming a group with a node is ignored, and an empty group's edge ends on its frame with ports on", () => {
	const framed = routeEdges(
		alone({
			boxes: new Map([["a", box(0, 0)]]),
			edges: [{ id: "x", from: "a", to: "loop" }],
			groups: [{ id: "loop", head: "Loop", holds: ["a"] }],
		}),
	);
	assert.equal(framed.routes.size, 0);
	const routed = routeEdges(
		alone({
			boxes: new Map([
				["a", box(0, 0, 240, 56)],
				["loop", box(0, 200, 240, 74)],
			]),
			edges: [{ id: "in", from: "a", to: "loop" }],
			groups: [{ id: "loop", head: "Loop", holds: [] }],
			ports: true,
		}),
	);
	assert.deepEqual(routed.routes.get("in")?.points.at(-1), { x: 120, y: 200 });
});
