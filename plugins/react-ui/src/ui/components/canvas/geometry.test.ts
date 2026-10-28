import assert from "node:assert/strict";
import { test } from "node:test";
import { type Box, routeEdges } from "./geometry.ts";

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
