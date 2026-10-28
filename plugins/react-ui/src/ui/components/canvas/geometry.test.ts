import assert from "node:assert/strict";
import { test } from "node:test";
import { glyphTier, minZoomFor, routeSide } from "./floor.ts";
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

test("under the text floor a loop's grown head never covers the step above it", () => {
	// Stead's job: Setup over a loop (Work) whose first part is a loop (Fix),
	// placed as the layout places them at the desktop density: the layer gap
	// (`layerGap`) between Setup and Work's frame, and a head and a padding
	// over each group's first part.
	const head = 32;
	const pad = 12;
	const pair = 6;
	const glyph = 32;
	const layer = 54;
	const card = { x: 0, width: 240, height: 60 };
	const work = 60 + layer;
	const fix = work + head + pad;
	const implement = fix + head + pad;
	const cards = new Map<string, Box>([
		["trigger", { ...card, y: -60 - layer }],
		["setup", { ...card, y: 0 }],
		["implement", { ...card, y: implement }],
		["check", { ...card, y: implement + 60 + layer }],
		["review", { ...card, y: implement + 2 * (60 + layer) + pad }],
		["land", { ...card, y: implement + 3 * (60 + layer) + 2 * pad }],
	]);
	const groups = [
		{ id: "work", head: "Work", holds: ["fix", "review"] },
		{ id: "fix", head: "Fix", holds: ["implement", "check"] },
	];
	const held = new Map([
		["work", new Set(["implement", "check", "review"])],
		["fix", new Set(["implement", "check"])],
	]);
	const edges = [
		["trigger", "setup"],
		["setup", "implement"],
		["implement", "check"],
		["check", "review"],
		["review", "land"],
	].map(([from = "", to = ""]) => ({ id: `${from}>${to}`, from, to }));
	const lowest = minZoomFor([...cards.values()], glyph, pair);
	for (const zoom of [1, 0.9, 0.7, 0.5, lowest]) {
		const side = routeSide(zoom, glyph, pair);
		const tier = glyphTier(cards, new Map(), groups, {
			side,
			glyph,
			head,
			pad,
		});
		const { frames } = routeEdges({
			boxes: tier.boxes,
			edges,
			back: [],
			groups,
			labels: new Map(),
			head: tier.head,
			pad: tier.pad,
			pair,
			ports: false,
			port: 0,
		});
		for (const [group, frame] of frames)
			for (const [id, box] of tier.boxes) {
				if (held.get(group)?.has(id)) continue;
				assert.ok(
					!overlaps(frame, box),
					`at zoom ${zoom} ${group}'s frame covers ${id}: ${JSON.stringify([frame, box])}`,
				);
			}
		// Each node draws where it routes: its glyph on its card's centre.
		for (const [id, box] of tier.cards) {
			const routed = tier.boxes.get(id);
			assert.ok(routed);
			assert.equal(routed.y + routed.height / 2, box.y + box.height / 2);
		}
	}
});
