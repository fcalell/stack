import assert from "node:assert/strict";
import { test } from "node:test";
import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs/lib/elk-api.js";
import {
	type ElkInput,
	elkGraph,
	fromElk,
	graphKey,
	layerGap,
	wrapParts,
} from "./elk.ts";
import {
	type Box,
	crosses,
	type Route,
	routeEdges,
	verticalLegs,
} from "./geometry.ts";

// ELK's row of three top parts: two groups of one page each, side by side, and
// a loose node an edge links to the second group's page.
const output: ElkNode = {
	id: "root",
	children: [
		{
			id: "g:a",
			x: 16,
			y: 16,
			width: 312,
			height: 116,
			children: [{ id: "n:a1", x: 32, y: 56, width: 280, height: 60 }],
		},
		{
			id: "g:b",
			x: 344,
			y: 16,
			width: 312,
			height: 116,
			children: [{ id: "n:b1", x: 360, y: 56, width: 280, height: 60 }],
		},
		{ id: "n:c", x: 360, y: 200, width: 280, height: 60 },
	],
};
const edges = [{ from: "b1", to: "c" }];
const gaps = { across: 16, down: 40 };

test("a row of unlinked parts the room holds keeps ELK's places", () => {
	const positions = fromElk(output);
	assert.equal(wrapParts(output, positions, edges, 700, gaps), positions);
});

test("a row of unlinked parts wider than the room wraps them in a column", () => {
	const wrapped = wrapParts(output, fromElk(output), edges, 300, gaps);
	assert.deepEqual(wrapped.get("a1"), { x: 32, y: 56 });
	// The second part, the group and the node its edge links, stands under the
	// first, at the row's start, the `down` gap under it.
	assert.deepEqual(wrapped.get("b1"), { x: 32, y: 56 + 116 + 40 });
	assert.deepEqual(wrapped.get("c"), { x: 32, y: 200 + 116 + 40 });
});

test("one part, however wide, keeps ELK's places", () => {
	const positions = fromElk(output);
	const linked = [...edges, { from: "a1", to: "b1" }];
	assert.equal(wrapParts(output, positions, linked, 100, gaps), positions);
});

// A gate's fan, laid out by ELK as the canvas lays it out: the gate (Ready)
// answers Approve to Land and Request changes to Changes note, then a third
// answer, Revise, goes on to what follows the gate. Each density's sizes are
// the showcase's measured ones: a card, Land's and the gate's two lines, and
// each answer's chip.
interface Density {
	pair: number;
	pad: number;
	card: number;
	tall: number;
	chips: Record<string, { width: number; height: number }>;
}
const DESKTOP: Density = {
	pair: 6,
	pad: 12,
	card: 70,
	tall: 88,
	chips: {
		"ready>land:approve": { width: 69, height: 30 },
		"ready>note:request changes": { width: 115, height: 30 },
		"ready>landed:revise": { width: 57, height: 30 },
	},
};
const TOUCH: Density = {
	pair: 8,
	pad: 16,
	card: 86,
	tall: 108,
	chips: {
		"ready>land:approve": { width: 88, height: 38 },
		"ready>note:request changes": { width: 145, height: 38 },
		"ready>landed:revise": { width: 73, height: 38 },
	},
};
const fan = (density: Density, answers: number, gate: number): ElkInput => {
	const { pair, pad, card, tall, chips } = density;
	const nodes = ["verdict", "ready", "land", "landed-as", "note", "landed"];
	const edges = [
		{ id: "verdict>ready:", from: "verdict", to: "ready" },
		{ id: "ready>land:approve", from: "ready", to: "land" },
		{ id: "ready>note:request changes", from: "ready", to: "note" },
		{ id: "land>landed-as:", from: "land", to: "landed-as" },
		{ id: "landed-as>landed:", from: "landed-as", to: "landed" },
		{ id: "note>landed:", from: "note", to: "landed" },
		...(answers > 2
			? [{ id: "ready>landed:revise", from: "ready", to: "landed" }]
			: []),
	];
	const chip = Math.max(...Object.values(chips).map((each) => each.height));
	const height = (id: string) =>
		id === "ready" ? gate : id === "land" ? tall : card;
	return {
		nodes: nodes.map((id) => ({ id })),
		edges,
		groups: [],
		order: nodes,
		sizes: new Map(nodes.map((id) => [id, { width: 240, height: height(id) }])),
		head: 32,
		pad,
		gaps: { node: pad, layer: layerGap(24, chip, pair), page: 24 },
	};
};

// The canvas's rule: ELK runs when its input's key moves, and the graph is
// drawn at the sizes measured last.
async function drawn(density: Density, inputs: readonly ElkInput[]) {
	const elk = new ELK();
	let key: string | undefined;
	let positions = new Map<string, { x: number; y: number }>();
	for (const input of inputs) {
		const next = graphKey(input);
		if (next === key) continue;
		key = next;
		positions = fromElk(await elk.layout(elkGraph(input)));
	}
	const last = inputs.at(-1);
	assert.ok(last);
	const boxes = new Map<string, Box>();
	for (const [id, at] of positions) {
		const size = last.sizes.get(id);
		if (size) boxes.set(id, { ...at, ...size });
	}
	const ids = new Set(last.edges.map((edge) => edge.id));
	return routeEdges({
		boxes,
		edges: last.edges,
		back: [],
		groups: [],
		labels: new Map(
			Object.entries(density.chips).filter(([id]) => ids.has(id)),
		),
		head: last.head,
		pad: last.pad,
		pair: density.pair,
		ports: false,
		port: 0,
	}).routes;
}

// Each chip stands a `pair` beside a leg of its own edge, within the leg, and
// no edge's line runs through a chip.
function holdsChips(routes: Map<string, Route>, pair: number) {
	for (const [id, route] of routes) {
		const label = route.label;
		if (!label) continue;
		const beside = verticalLegs(route.points).some(
			(leg) =>
				(label.x === leg.x + pair || label.x + label.width === leg.x - pair) &&
				label.y >= leg.top &&
				label.y + label.height <= leg.bottom,
		);
		assert.ok(
			beside,
			`${id}'s chip stands off its leg: ${JSON.stringify(label)}`,
		);
	}
	for (const [id, route] of routes)
		for (const [other, { label }] of routes) {
			if (!label) continue;
			route.points.forEach((point, index) => {
				const next = route.points[index + 1];
				assert.ok(
					!next || !crosses(point, next, label),
					`${id} runs through ${other}'s chip`,
				);
			});
		}
}

for (const [name, density] of [
	["desktop", DESKTOP],
	["touch", TOUCH],
] as const)
	test(`a gate's answer chips stand on their own arrows before and after an answer is added (${name})`, async () => {
		const { card, tall, pair } = density;
		holdsChips(await drawn(density, [fan(density, 2, card)]), pair);
		// The third answer's words give the gate's line a second line: the run
		// the edit asks for still reads the gate's old height, and its new one is
		// measured after it.
		holdsChips(
			await drawn(density, [
				fan(density, 2, card),
				fan(density, 3, card),
				fan(density, 3, tall),
			]),
			pair,
		);
	});
