import assert from "node:assert/strict";
import { test } from "node:test";
import { backEdges, pathOrder } from "@fcalell/ui-core/canvas";
import type {
	CanvasEdge,
	CanvasGroup,
	CanvasNode,
} from "@fcalell/ui-core/descriptors";
import ELK from "elkjs/lib/elk.bundled.js";
import * as graphs from "../../showcase/graphs.ts";
import {
	type ElkInput,
	elkGraph,
	fromElk,
	layerGap,
	wrapParts,
} from "./elk.ts";
import { glyphTier, nameCap } from "./floor.ts";
import {
	type Box,
	emptyGroups,
	leftPads,
	routeEdges,
	type Size,
} from "./geometry.ts";
import { type Opening, openingView } from "./open.ts";
import { FIT_FLOOR, type Transform } from "./view.ts";

// A density's sizes, as the showcase measures them (elk.test.ts).
interface Density {
	touch: boolean;
	pair: number;
	pad: number;
	page: number;
	control: number;
	card: number;
	tall: number;
	chip: Size;
	head: number;
	port: number;
}
const DESKTOP: Density = {
	touch: false,
	pair: 6,
	pad: 12,
	page: 24,
	control: 28,
	card: 70,
	tall: 88,
	chip: { width: 69, height: 30 },
	head: 32,
	port: 12,
};
const TOUCH: Density = {
	touch: true,
	pair: 8,
	pad: 16,
	page: 16,
	control: 44,
	card: 86,
	tall: 108,
	chip: { width: 88, height: 38 },
	head: 44,
	port: 12,
};

type Graph = {
	nodes: readonly CanvasNode[];
	edges: readonly CanvasEdge[];
	groups?: readonly CanvasGroup[];
};

// The welcome note's workflow: a trigger, a gate that asks first and two ways out.
const WELCOME: Graph = {
	nodes: [
		{ id: "trigger", icon: "Play", role: "start", title: "A call" },
		{ id: "say-ok", icon: "GitFork", role: "decision", title: "Say ok" },
		{ id: "no", icon: "Flag", role: "end", title: "Stop" },
		{ id: "told", icon: "Flag", role: "end", title: "Told" },
	],
	edges: [
		{ id: "a", from: "trigger", to: "say-ok" },
		{ id: "b", from: "say-ok", to: "no", label: "Not this" },
		{ id: "c", from: "say-ok", to: "told", label: "Go on" },
	],
};

// The graph laid out as the canvas lays it out (ELK, the unlinked parts wrapped
// to the room) and its opening drawn from the same closures `useLayout` builds.
async function opening(
	graph: Graph,
	density: Density,
	pane: Size,
	anchor?: string,
): Promise<{ o: Opening; view: Transform; boxes: Map<string, Box> }> {
	const { pair, pad, page, control, head } = density;
	const nodes = graph.nodes;
	const groups = graph.groups ?? [];
	const hollow = emptyGroups(groups, new Set(nodes.map((node) => node.id)));
	const order = pathOrder(
		[...nodes, ...hollow.map((id) => ({ id }))],
		graph.edges,
	);
	const sizes = new Map(
		nodes.map((node) => [
			node.id,
			{
				width: 240,
				height: node.line || node.status ? density.tall : density.card,
			},
		]),
	);
	const labelled = graph.edges.filter((edge) => edge.label);
	const chip = density.chip.height;
	const input: ElkInput = {
		nodes,
		edges: graph.edges,
		groups,
		order,
		sizes,
		head,
		pad,
		gaps: { node: pad, layer: layerGap(24, chip, pair), page },
	};
	const out = await new ELK().layout(elkGraph(input));
	const room = pane.width - page - (page + control + pair);
	const computed = wrapParts(out, fromElk(out), graph.edges, room, {
		across: pad,
		down: input.gaps.layer,
	});
	const boxes = new Map<string, Box>();
	for (const [id, size] of sizes) {
		const at = computed.get(id);
		if (at) boxes.set(id, { ...at, ...size });
	}
	const holes = new Map<string, Box>();
	for (const id of hollow) {
		const at = computed.get(id);
		if (at) holes.set(id, { ...at, width: 240, height: head + 2 * pad });
	}
	const labels = new Map(
		labelled.map((edge) => [
			edge.id,
			{
				width: Math.min(160, 16 + 7 * (edge.label?.length ?? 0)),
				height: density.chip.height,
			},
		]),
	);
	const back = backEdges(order, graph.edges);
	const lefts = leftPads(
		groups,
		new Map(groups.map((group) => [group.id, 7 * group.head.length])),
		{ pad, pair, width: 240 },
	);
	const glyph = control;
	const o: Opening = {
		pane,
		inset: page,
		clear: {
			left: page + control + pair,
			bottom: 0,
			stack: page + 3 * control + pair,
		},
		icon: { start: pad, end: pad + control },
		glyph,
		pair,
		names: nameCap(density.touch),
		boxes,
		anchor: anchor ?? order[0],
		tierAt: (side) =>
			glyphTier(boxes, holes, groups, {
				side,
				glyph,
				head,
				pad,
				left: lefts,
			}),
		routeTier: (_side, tier) =>
			routeEdges({
				boxes: tier.boxes,
				edges: graph.edges,
				back,
				groups,
				labels,
				head: tier.head,
				pad: tier.pad,
				left: lefts,
				pair,
				ports: false,
				port: density.port,
			}),
	};
	return { o, view: openingView(o, FIT_FLOOR), boxes };
}

// Where the graph's nodes stand in the pane under the view: the cards at the
// text floor and over, each node's glyph (a square on its card's centre) under it.
function shown(
	o: Opening,
	view: Transform,
	density: Density,
): Map<string, Box> {
	const out = new Map<string, Box>();
	for (const [id, card] of o.boxes) {
		const centre = {
			x: (card.x + card.width / 2) * view.k + view.x,
			y: (card.y + card.height / 2) * view.k + view.y,
		};
		out.set(
			id,
			view.k < FIT_FLOOR
				? {
						x: centre.x - density.control / 2,
						y: centre.y - density.control / 2,
						width: density.control,
						height: density.control,
					}
				: {
						x: card.x * view.k + view.x,
						y: card.y * view.k + view.y,
						width: card.width * view.k,
						height: card.height * view.k,
					},
		);
	}
	return out;
}

// A node the pane's side cuts: part of it in, part of it out.
const cut = (box: Box, pane: Size) =>
	(box.x < 0 && box.x + box.width > 0) ||
	(box.x < pane.width && box.x + box.width > pane.width);

// The zoom stack's own corner, without the `pair` of air round it.
const underStack = (box: Box, o: Opening) =>
	box.x < o.clear.left - o.pair &&
	box.y + box.height > o.pane.height - o.clear.stack + o.pair &&
	box.y < o.pane.height;

const WIDE = [
	["the welcome note", WELCOME],
	["a gate's three answers", graphs.ANSWERS_THREE],
	["the roles", graphs.ROLES],
	["the journey", graphs.JOURNEY],
	["the entry", graphs.ENTRY],
] as const;

for (const [name, density, width] of [
	["a phone", TOUCH, 320],
	["a large phone", TOUCH, 390],
	["a half-width pane", DESKTOP, 420],
] as const)
	for (const [what, graph] of WIDE)
		test(`${what} opens with every node whole and clear of the zoom stack at ${name} (${width})`, async () => {
			const pane = { width, height: 640 };
			const { o, view } = await opening(graph, density, pane);
			// Its cards cannot all stand in the pane at the text floor, so it opens
			// as the overview, no lower than the overview's floor.
			assert.ok(view.k < FIT_FLOOR && view.k >= 0.5, `k ${view.k}`);
			const nodes = shown(o, view, density);
			for (const [id, box] of nodes) {
				assert.ok(!cut(box, pane), `${id} is cut at the pane's side`);
				assert.ok(!underStack(box, o), `${id} stands under the zoom stack`);
			}
			// The node the view stands on, and the leftmost one, are in the pane.
			const anchor = nodes.get(o.anchor ?? "");
			assert.ok(anchor && anchor.x >= 0 && anchor.x + anchor.width <= width);
			const leftmost = Math.min(...[...nodes.values()].map((box) => box.x));
			assert.ok(
				leftmost >= o.clear.left - o.pair,
				"the leftmost is past the stack",
			);
		});

test("the words open where the cards stand in the pane, a pair from either side, and the stack's rows hold none of them", async () => {
	// The welcome note's cards are 492 (desktop) and 496 (touch) px across.
	for (const [density, widths] of [
		[DESKTOP, [504, 520, 545, 700]],
		[TOUCH, [520, 540, 700]],
	] as const)
		for (const width of widths) {
			const pane = { width, height: 640 };
			const { o, view } = await opening(WELCOME, density, pane);
			assert.equal(view.k, FIT_FLOOR, `${density.touch} ${width}`);
			for (const [id, box] of shown(o, view, density)) {
				assert.ok(box.x >= 0 && box.x + box.width <= width, `${id} is cut`);
				assert.ok(!underStack(box, o), `${id} stands under the zoom stack`);
			}
		}
	// One pane narrower than the cards and their pairs opens as the overview.
	for (const [density, width] of [
		[DESKTOP, 500],
		[TOUCH, 510],
	] as const) {
		const { view } = await opening(WELCOME, density, { width, height: 640 });
		assert.ok(view.k < FIT_FLOOR);
	}
});

test("the words open centred across the pane where no node stands in the stack's rows, not pushed against the far side", async () => {
	// The welcome note's cards (492 px across at the desktop) stand above the
	// stack's rows in a pane 640 high, so the stack takes nothing from them: the
	// same margin on both sides, though the room past the stack's column is
	// narrower than the cards.
	for (const [density, widths] of [
		[DESKTOP, [504, 520, 545, 700]],
		[TOUCH, [520, 540, 700]],
	] as const)
		for (const width of widths) {
			const pane = { width, height: 640 };
			const { o, view } = await opening(WELCOME, density, pane);
			const nodes = [...shown(o, view, density).values()];
			if (nodes.some((box) => underStack(box, o))) continue;
			const left = Math.min(...nodes.map((box) => box.x));
			const right = width - Math.max(...nodes.map((box) => box.x + box.width));
			assert.ok(
				Math.abs(left - right) <= 1,
				`${density.touch} ${width}: ${left} px from the start, ${right} from the end`,
			);
		}
});

test("a column with a loop opens at its words where its cards and bands stand in the pane, and only a chip may be cut", async () => {
	const pane = { width: 420, height: 640 };
	const { o, view } = await opening(graphs.WORKFLOW, DESKTOP, pane);
	assert.equal(view.k, FIT_FLOOR);
	for (const [id, box] of shown(o, view, DESKTOP)) {
		assert.ok(box.x >= 0 && box.x + box.width <= pane.width, `${id} is cut`);
		assert.ok(!underStack(box, o), `${id} stands under the zoom stack`);
	}
	const { frames } = o.routeTier(0, o.tierAt(0));
	for (const [id, frame] of frames)
		assert.ok(
			frame.x * view.k + view.x >= 0 &&
				(frame.x + frame.width) * view.k + view.x <= pane.width,
			`${id}'s band runs past the pane's side`,
		);
});

test("an overview holds its loops' bands across the pane too", async () => {
	// The loops' frames are 837 px across at the text floor: wider than the pane,
	// so the graph opens as the overview, whose bands (the padding and the head
	// round the glyphs) keep their size on screen and stand inside the pane.
	const pane = { width: 700, height: 640 };
	const { o, view } = await opening(graphs.LOOPS, DESKTOP, pane);
	assert.ok(view.k < FIT_FLOOR);
	const side =
		Math.ceil(DESKTOP.control / view.k / DESKTOP.pair) * DESKTOP.pair;
	const tier = o.tierAt(side);
	const { frames } = o.routeTier(side, tier);
	for (const [id, frame] of frames) {
		const left = frame.x * view.k + view.x;
		assert.ok(
			left >= 0 && left + frame.width * view.k <= pane.width,
			`${id}'s band runs past the pane`,
		);
	}
});

test("the view stands on the running node when the graph is taller than the pane", async () => {
	const pane = { width: 560, height: 480 };
	// The workflow, under way: the review is running and stands below the fold.
	const { o, view } = await opening(graphs.WORKFLOW, DESKTOP, pane, "review");
	assert.equal(view.k, FIT_FLOOR);
	const review = shown(o, view, DESKTOP).get("review");
	assert.ok(review);
	assert.ok(
		review.y >= 0 && review.y + review.height <= pane.height,
		"the running node is in the pane",
	);
	// The default is the first node, at the pane's top.
	const first = await opening(graphs.WORKFLOW, DESKTOP, pane);
	const start = shown(first.o, first.view, DESKTOP).get("start");
	assert.ok(start && start.y >= 0 && start.y < DESKTOP.page * 2);
});
