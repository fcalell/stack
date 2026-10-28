import assert from "node:assert/strict";
import { test } from "node:test";
import { type Box, crosses, routeEdges } from "./geometry.ts";

const overlaps = (a: Box, b: Box) =>
	a.x < b.x + b.width &&
	b.x < a.x + a.width &&
	a.y < b.y + b.height &&
	b.y < a.y + a.height;

test("two edge chips never print over each other", () => {
	// A fan-out whose two legs run a few pixels apart (two handoffs to
	// neighbouring targets), each with a chip.
	const boxes = new Map<string, Box>([
		["from", { x: 0, y: 0, width: 240, height: 64 }],
		["a", { x: 280, y: 160, width: 240, height: 64 }],
		["b", { x: 290, y: 160, width: 240, height: 64 }],
	]);
	const { routes } = routeEdges({
		boxes,
		edges: [
			{ id: "to-a", from: "from", to: "a" },
			{ id: "to-b", from: "from", to: "b" },
		],
		back: [],
		groups: [],
		labels: new Map([
			["to-a", { width: 60, height: 28 }],
			["to-b", { width: 110, height: 28 }],
		]),
		head: 36,
		pad: 12,
		pair: 8,
		ports: false,
		port: 0,
	});
	const a = routes.get("to-a")?.label;
	const b = routes.get("to-b")?.label;
	assert.ok(a && b, "both edges carry their chip");
	assert.ok(!overlaps(a, b), `chips overlap: ${JSON.stringify([a, b])}`);
});

test("an edge that skips a layer runs beside what stands in its column", () => {
	// Handed fans to two hands and on to Noted, which stands under it with a
	// hand between them (Stead's entry): ELK keeps a column clear of the hand.
	const boxes = new Map<string, Box>([
		["handed", { x: 280, y: 24, width: 240, height: 64 }],
		["hand-code", { x: 24, y: 160, width: 240, height: 64 }],
		["hand-home", { x: 280, y: 160, width: 240, height: 64 }],
		["noted", { x: 280, y: 296, width: 240, height: 64 }],
	]);
	const edges = [
		["handed", "hand-code"],
		["handed", "hand-home"],
		["handed", "noted"],
		["hand-code", "noted"],
		["hand-home", "noted"],
	].map(([from = "", to = ""]) => ({ id: `${from}>${to}`, from, to }));
	const { routes } = routeEdges({
		boxes,
		edges,
		back: [],
		groups: [],
		labels: new Map([["handed>noted", { width: 60, height: 28 }]]),
		head: 36,
		pad: 12,
		pair: 8,
		ports: false,
		port: 0,
	});
	const route = routes.get("handed>noted");
	assert.ok(route?.label, "the edge carries its chip");
	const hand = boxes.get("hand-home");
	assert.ok(hand);
	route.points.forEach((point, index) => {
		const next = route.points[index + 1];
		if (!next) return;
		assert.ok(
			!crosses(point, next, hand),
			`a stretch runs behind Hand home: ${JSON.stringify([point, next])}`,
		);
	});
	assert.ok(!overlaps(route.label, hand), "the chip stands clear of the hand");
	const last = route.points.at(-1);
	assert.deepEqual(last, { x: 400, y: 296 }, "it enters Noted's top centre");
});
