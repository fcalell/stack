import {
	type glyphTier,
	minZoomFor,
	OVERVIEW_FLOOR,
	overviewFloorFor,
	routeSide,
} from "./floor.ts";
import { type Box, type Routes, type Size, union } from "./geometry.ts";
import {
	type Clearance,
	FIT_FLOOR,
	fitTransform,
	overviewTransform,
	room,
	solveScale,
	type Transform,
	withNames,
} from "./view.ts";

// The opening view: pure, so node tests run it. The layout reads the pane, the
// chrome and the density off the page and hands them here with the two ways it
// has to draw the graph at a routing side (`glyphTier`, `routeEdges`).
export interface Opening {
	pane: Size;
	inset: number;
	clear: Clearance;
	// A node's icon stands past its inline padding, in a box no wider than a
	// control: the part of a node the stack must leave clear where no offset
	// clears whole nodes.
	icon: { start: number; end: number };
	// A glyph's size on screen, the `pair` after it, and the widest a name stands
	// beside it.
	glyph: number;
	pair: number;
	names: number;
	// The nodes' boxes as placed, and the graph's nodes in path order.
	boxes: ReadonlyMap<string, Box>;
	// The node the view stands on: the running or failed one, else the first.
	anchor?: string;
	tierAt: (side: number) => ReturnType<typeof glyphTier>;
	routeTier: (side: number, tier: ReturnType<typeof glyphTier>) => Routes;
}

// The centres' span of the cards, across and down.
function spreadOf(cards: readonly Box[]): { across: number; down: number } {
	const centres = cards.map((box) => ({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
		width: 0,
		height: 0,
	}));
	const span = union(centres);
	return { across: span.width, down: span.height };
}

// The view a graph opens at, or Fit goes to when `floor` is the lowest scale the
// boxes allow. Fit is the whole graph in the room, down to `floor`. The opening
// view (`floor` the text floor, `FIT_FLOOR`) is the graph at its own size, where
// its words stand, when that shows every node whole across the pane and clear
// of the zoom stack: centred where its drawing (cards, routes and chips) fits
// the room, else framed at its anchor, the viewer panning down. Where its nodes
// and frames would be cut at the pane's side, or a node would stand under the
// stack, it opens as its overview instead (`overview`). An edge chip that
// stands past the pane's side is the one thing that may be cut.
export function openingView(o: Opening, floor: number): Transform {
	const { pane, inset, clear, glyph, pair } = o;
	const all = [...o.boxes.values()];
	const tier0 = o.tierAt(0);
	const cards = [...tier0.cards.values()];
	// The lowest scale the graph may open at: the overview's floor, or the lowest
	// the graph allows above it.
	const lowest = Math.max(OVERVIEW_FLOOR, minZoomFor(all, glyph, pair));
	const anchorOf = (tier: ReturnType<typeof glyphTier>) =>
		o.anchor === undefined ? undefined : tier.cards.get(o.anchor);

	const view = (at: number, bounds?: (routed: Routes) => Box) => {
		const tier = o.tierAt(at);
		const routed = o.routeTier(at, tier);
		return fitTransform(
			bounds ? bounds(routed) : routed.bounds,
			pane,
			inset,
			clear,
			anchorOf(tier),
			{ nodes: [...tier.cards.values()], icon: o.icon },
			floor,
		);
	};
	// Under the text floor the frames and the routes follow the zoom (a head and a
	// padding keep their size on screen), so the bounds depend on the scale they
	// are fitted to: the fit is taken again at the scale it gave, down until the
	// bounds at that scale fit it.
	const settle = (bounds?: (routed: Routes) => Box) => {
		let at = view(0, bounds);
		for (let step = 0; step < 6; step++) {
			const next = view(routeSide(at.k, glyph, pair), bounds);
			if (next.k >= at.k - 1e-3) return next;
			at = next;
		}
		return at;
	};

	if (floor !== FIT_FLOOR || lowest >= FIT_FLOOR) return settle();

	// What the graph's nodes and frames take at the text floor, and the box its
	// drawing takes with the routes and chips.
	const routed0 = o.routeTier(0, tier0);
	const frames = [...routed0.frames.values()];
	const bodies = union([
		...cards,
		...frames,
		...[...routed0.routes.values()].flatMap((route) =>
			route.points.map((at) => ({ ...at, width: 0, height: 0 })),
		),
	]);
	const chipped = union([
		...cards,
		...[...routed0.routes.values()].flatMap((route) => [
			...route.points.map((at) => ({ ...at, width: 0, height: 0 })),
			...(route.label ? [route.label] : []),
		]),
	]);
	// A drawing the pane holds with its chips is framed with them; one it holds
	// only without them is framed without, and its chips may be cut.
	const framed = settle(
		chipped.width <= pane.width - 2 * inset ? undefined : () => bodies,
	);
	// The words show the graph whole across the pane and clear of the stack. A
	// graph the pane holds is moved to stand in it, a `pair` from either side.
	const edge = pair;
	const body = union([...cards, ...frames]);
	const left = body.x * framed.k + framed.x;
	const over =
		body.width * framed.k > pane.width - 2 * edge
			? 0
			: Math.max(edge - left, 0) -
				Math.max(left + body.width * framed.k - (pane.width - edge), 0);
	const sided = { ...framed, x: framed.x + over };
	// The stack itself, without the `pair` of air the clearance keeps round it.
	const stackTop = pane.height - clear.stack + pair;
	const stacked = (box: Box, view: Transform) =>
		box.x * view.k + view.x < clear.left - pair &&
		(box.y + box.height) * view.k + view.y > stackTop &&
		box.y * view.k + view.y < pane.height;
	// A graph the pane holds from top to foot moves up out of the stack's rows
	// where a node under the stack's column would stand in them.
	const area = room(pane, inset, clear);
	const hit = cards.filter((box) => stacked(box, sided));
	const up = Math.max(
		0,
		...hit.map((box) => (box.y + box.height) * sided.k + sided.y - stackTop),
	);
	const words =
		hit.length > 0 &&
		body.height * sided.k <= area.height &&
		body.y * sided.k + sided.y - up >= area.y - 0.5
			? { ...sided, y: sided.y - up }
			: sided;
	const whole = [...cards, ...frames].every(
		(box) =>
			box.x * words.k + words.x >= edge - 0.5 &&
			(box.x + box.width) * words.k + words.x <= pane.width - edge + 0.5,
	);
	if (whole && !cards.some((box) => stacked(box, words))) return words;
	return overview(o, lowest);
}

// A graph wider than its pane at the text floor opens as its overview: its
// glyphs, its frames (the loops' bands, their heads and the corridors up their
// sides) and the last glyph's name at the scale that holds them across the room
// the zoom stack leaves, no lower than `lowest` and just under the text floor at
// most, so no node opens cut at the pane's edge. Where it is also taller than
// the pane it opens lower, down to where its names still clear each other (or,
// with no named overview, to `lowest`). A graph that holds at `lowest` neither
// across nor down opens there anyway, against the room's start (see
// `overviewTransform`).
function overview(o: Opening, lowest: number): Transform {
	const { pane, inset, clear, glyph, pair, names } = o;
	const all = [...o.boxes.values()];
	const area = room(pane, inset, clear);
	const spread = spreadOf([...o.tierAt(0).cards.values()]);
	const named = overviewFloorFor(all, glyph, glyph + pair + names, 2 * pair);
	const heightFloor = named < FIT_FLOOR ? Math.max(lowest, named) : lowest;
	// The glyphs and the frames at a scale: the tier its routing side draws.
	const at = (k: number) => {
		const side = routeSide(k, glyph, pair);
		const tier = o.tierAt(side);
		const squares = [...tier.cards.keys()].flatMap(
			(id) => tier.boxes.get(id) ?? [],
		);
		const frames = [...o.routeTier(side, tier).frames.values()];
		return { tier, box: union([...squares, ...frames]) };
	};
	const across = solveScale(
		(k) => at(k).box.width * k + pair + names,
		spread.across,
		area.width,
		lowest,
	);
	const down = solveScale(
		(k) => at(k).box.height * k,
		spread.down,
		area.height,
		lowest,
		across.k,
	);
	const k = Math.max(Math.min(across.k, heightFloor), down.k);
	const { tier, box } = at(k);
	return overviewTransform(
		withNames(box, pair + names, k),
		k,
		pane,
		inset,
		clear,
		o.anchor === undefined ? undefined : tier.boxes.get(o.anchor),
	);
}
