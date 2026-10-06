import type {
	CanvasEdge,
	CanvasGroup,
	CanvasPoint,
} from "@fcalell/ui-core/descriptors";

// Pure geometry of the canvas, in flow coordinates: no DOM, so the numbers it
// is given (the spacing roles, the measured sizes) are the caller's.

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface Size {
	width: number;
	height: number;
}

export interface GroupTree {
	// Each group's members, in `holds` order: the nodes and the groups it owns.
	nodes: Map<string, string[]>;
	groups: Map<string, string[]>;
	// The group that owns a node or a group.
	parent: Map<string, string>;
	// The groups no group holds.
	roots: string[];
}

// Who owns whom. A node held by two groups belongs to the first in `groups`
// order, as does a group; an id that is no node or group is ignored, and a
// group never takes one of its own ancestors, so the tree has no cycle.
export function groupTree(
	groups: readonly CanvasGroup[],
	nodeIds: ReadonlySet<string>,
): GroupTree {
	const known = new Set(groups.map((group) => group.id));
	const parent = new Map<string, string>();
	const nodes = new Map<string, string[]>();
	const held = new Map<string, string[]>();
	const within = (id: string, ancestor: string): boolean => {
		for (let at: string | undefined = id; at; at = parent.get(at)) {
			if (at === ancestor) return true;
		}
		return false;
	};
	for (const group of groups) {
		nodes.set(group.id, []);
		held.set(group.id, []);
	}
	for (const group of groups) {
		for (const id of group.holds) {
			if (parent.has(id)) continue;
			if (nodeIds.has(id)) {
				parent.set(id, group.id);
				nodes.get(group.id)?.push(id);
			} else if (known.has(id) && !within(group.id, id)) {
				parent.set(id, group.id);
				held.get(group.id)?.push(id);
			}
		}
	}
	return {
		nodes,
		groups: held,
		parent,
		roots: groups.map((group) => group.id).filter((id) => !parent.has(id)),
	};
}

// A group's frame: the rectangle of everything it holds, grown by `pad` on
// three sides and by `pad + head` on top, its left side by `left` where the
// group has an entry (`leftPads`). A group holding no box has no frame.
// `reach` holds the right edge a group's content must reach (before its
// padding), where a back edge's corridor and label stand inside it.
export function groupBoxes(
	groups: readonly CanvasGroup[],
	boxes: ReadonlyMap<string, Box>,
	{
		pad,
		head,
		left: lefts = new Map(),
	}: { pad: number; head: number; left?: ReadonlyMap<string, number> },
	reach: ReadonlyMap<string, number> = new Map(),
): Map<string, Box> {
	const tree = groupTree(groups, new Set(boxes.keys()));
	const out = new Map<string, Box>();
	const frame = (id: string): Box | undefined => {
		if (out.has(id)) return out.get(id);
		const parts = [
			...(tree.nodes.get(id) ?? []).map((node) => boxes.get(node)),
			...(tree.groups.get(id) ?? []).map(frame),
		].filter((box): box is Box => box !== undefined);
		if (parts.length === 0) return undefined;
		const left = Math.min(...parts.map((box) => box.x));
		const top = Math.min(...parts.map((box) => box.y));
		const right = Math.max(
			...parts.map((box) => box.x + box.width),
			reach.get(id) ?? -Infinity,
		);
		const bottom = Math.max(...parts.map((box) => box.y + box.height));
		const inset = lefts.get(id) ?? pad;
		const box = {
			x: left - inset,
			y: top - pad - head,
			width: right - left + inset + pad,
			height: bottom - top + 2 * pad + head,
		};
		out.set(id, box);
		return box;
	};
	for (const group of groups) frame(group.id);
	return out;
}

// A group's left padding, a whole number of pixels, where its head text needs
// more than `pad`: the text
// starts at the frame's left edge and ends `reach` from it, and an edge enters
// the group at a node's centre, at least half a node's `width` in from the
// content's left, so the padding grows until the text ends a `pair` before it.
export function leftPads(
	groups: readonly CanvasGroup[],
	reach: ReadonlyMap<string, number>,
	{ pad, pair, width }: { pad: number; pair: number; width: number },
): Map<string, number> {
	const out = new Map<string, number>();
	for (const { id } of groups) {
		const need = (reach.get(id) ?? 0) + pair - width / 2;
		if (need > pad) out.set(id, Math.ceil(need));
	}
	return out;
}

// The part of a group's frame its head covers: the top `head` pixels.
const headBand = (frame: Box, head: number): Box => ({
	...frame,
	height: head,
});

// The arrowhead's box, on its edge's end.
export const ARROW = 8;

export interface Leg {
	x: number;
	top: number;
	bottom: number;
}

// An edge's route: its points, the box its label chip stands in (when it
// carries one) and the box its arrowhead fills.
export interface Route {
	points: CanvasPoint[];
	label?: Box;
	arrow: Box;
}

export interface Routes {
	routes: Map<string, Route>;
	// Each group's frame once the back edges inside it are placed.
	frames: Map<string, Box>;
	// Everything drawn: boxes, frames, route points and labels.
	bounds: Box;
}

export interface RouteInput {
	boxes: ReadonlyMap<string, Box>;
	edges: readonly Pick<CanvasEdge, "id" | "from" | "to">[];
	// The ids of the edges that go back (`backEdges`).
	back: readonly string[];
	groups: readonly CanvasGroup[];
	// The chip an edge carries, by edge id.
	labels: ReadonlyMap<string, Size>;
	// A group head's height and a frame's padding, its left side's where the
	// head text needs more.
	head: number;
	pad: number;
	left?: ReadonlyMap<string, number>;
	// The corner radius and the unit every distance off a line is a multiple of.
	pair: number;
}

const same = (a: CanvasPoint, b: CanvasPoint) => a.x === b.x && a.y === b.y;

// The points with a repeat and a point on its neighbours' line taken out, until
// none is left: a route that doubles back on itself collapses to its ends.
export function cleanPoints(points: readonly CanvasPoint[]): CanvasPoint[] {
	let out = [...points];
	let changed = true;
	while (changed) {
		changed = false;
		for (let i = 1; i < out.length; i++) {
			const before = out[i - 1];
			const at = out[i];
			const after = out[i + 1];
			if (!before || !at) continue;
			const repeated = same(before, at);
			const straight =
				after !== undefined &&
				(at.x - before.x) * (after.y - at.y) ===
					(at.y - before.y) * (after.x - at.x);
			if (repeated || straight) {
				out = out.filter((_, index) => index !== i);
				changed = true;
				break;
			}
		}
	}
	return out;
}

// The vertical legs of a polyline.
export function verticalLegs(points: readonly CanvasPoint[]): Leg[] {
	const legs: Leg[] = [];
	points.forEach((point, index) => {
		const next = points[index + 1];
		if (next && next.x === point.x && next.y !== point.y)
			legs.push({
				x: point.x,
				top: Math.min(point.y, next.y),
				bottom: Math.max(point.y, next.y),
			});
	});
	return legs;
}

// Whether the open segment between two points passes through the inside of a
// box: touching its edge is no crossing.
export function crosses(a: CanvasPoint, b: CanvasPoint, box: Box): boolean {
	return (
		Math.max(a.x, b.x) > box.x &&
		Math.min(a.x, b.x) < box.x + box.width &&
		Math.max(a.y, b.y) > box.y &&
		Math.min(a.y, b.y) < box.y + box.height
	);
}

// The stretches of a leg no other leg draws on.
function alone(leg: Leg, others: readonly Leg[]): Leg[] {
	const taken = others
		.filter((o) => o.x === leg.x && o.top < leg.bottom && o.bottom > leg.top)
		.sort((a, b) => a.top - b.top);
	const out: Leg[] = [];
	let at = leg.top;
	for (const o of taken) {
		if (o.top > at) out.push({ x: leg.x, top: at, bottom: o.top });
		at = Math.max(at, o.bottom);
	}
	if (at < leg.bottom) out.push({ x: leg.x, top: at, bottom: leg.bottom });
	return out;
}

const length = (leg: Leg) => leg.bottom - leg.top;

// Every route of the graph, from the final boxes. Back edges come first, so
// the frames they grow are the ones a forward edge is checked against.
//
// A forward edge leaves its source's bottom centre, bends `pair` below it and
// runs down its target's column into its target's top centre. When that last
// leg would cross a node or another group's head, it bends `pair` above the
// target instead. A back edge leaves its source's right side, runs up a
// corridor past everything it meets and enters its target's right side.
export function routeEdges(input: RouteInput): Routes {
	const { boxes, edges, back, groups, labels, head, pad, left, pair } = input;
	const tree = groupTree(groups, new Set(boxes.keys()));
	const reach = new Map<string, number>();
	let frames = groupBoxes(groups, boxes, { pad, head, left }, reach);
	const routes = new Map<string, Route>();

	// The groups that hold an id, nearest first.
	const holders = (id: string): string[] => {
		const out: string[] = [];
		for (let at = tree.parent.get(id); at; at = tree.parent.get(at))
			out.push(at);
		return out;
	};
	const depth = (group: string | undefined) =>
		group === undefined ? -1 : holders(group).length;

	// Back edges: those inside one group first, the deepest group first, then
	// the rest; each in `back` order.
	const byId = new Map(edges.map((edge) => [edge.id, edge]));
	const placed = back.flatMap((id) => {
		const edge = byId.get(id);
		if (!edge || !boxes.has(edge.from) || !boxes.has(edge.to)) return [];
		const ends = holders(edge.to);
		const scope = holders(edge.from).find((group) => ends.includes(group));
		return [{ edge, scope }];
	});
	const order = [
		...placed
			.filter(({ scope }) => scope !== undefined)
			.sort((a, b) => depth(b.scope) - depth(a.scope)),
		...placed.filter(({ scope }) => scope === undefined),
	];

	const corridors: { x: number; top: number; bottom: number; width: number }[] =
		[];
	for (const { edge, scope } of order) {
		const source = boxes.get(edge.from);
		const target = boxes.get(edge.to);
		if (!source || !target) continue;
		const loop = edge.from === edge.to;
		const fromY = source.y + source.height / (loop ? 4 : 2);
		const toY = loop
			? source.y + (source.height * 3) / 4
			: target.y + target.height / 2;
		const top = Math.min(fromY, toY);
		const bottom = Math.max(fromY, toY);
		const label = labels.get(edge.id);
		const width = label?.width ?? 0;
		const meets = (box: Box) => box.y <= bottom && box.y + box.height >= top;

		// What the corridor must clear: inside a group, the nodes it holds and
		// the groups nested in it; elsewhere every node and every frame.
		const clears = ([id]: [string, Box]) =>
			scope === undefined || holders(id).includes(scope);
		let x =
			Math.max(
				source.x + source.width,
				target.x + target.width,
				...[...boxes, ...frames]
					.filter(clears)
					.map(([, box]) => box)
					.filter(meets)
					.map((box) => box.x + box.width),
			) +
			// A stub out of the source and into the target holds the arrowhead and a
			// corner.
			(ARROW + pair);
		for (const c of corridors) {
			if (c.top <= bottom && c.bottom >= top)
				x = Math.max(x, c.x + Math.max(c.width, width) + 2 * pair);
		}
		corridors.push({ x, top, bottom, width });
		if (scope !== undefined) {
			reach.set(
				scope,
				Math.max(reach.get(scope) ?? -Infinity, Math.ceil(x + pair + width)),
			);
			frames = groupBoxes(groups, boxes, { pad, head, left }, reach);
		}
		const points = cleanPoints([
			{ x: source.x + source.width, y: fromY },
			{ x, y: fromY },
			{ x, y: toY },
			{ x: target.x + target.width, y: toY },
		]);
		routes.set(edge.id, {
			points,
			// Beside the corridor, `pair` clear of the corner at the source end.
			label: label && {
				x: x + pair,
				y: toY < fromY ? fromY - pair - label.height : fromY + pair,
				...label,
			},
			arrow: {
				x: target.x + target.width,
				y: toY - ARROW / 2,
				width: ARROW,
				height: ARROW,
			},
		});
	}

	// Forward edges.
	const bands = [...frames].map(([id, frame]) => ({
		id,
		band: headBand(frame, head),
	}));
	const solids = [...boxes.values(), ...frames.values()];
	const below = (y: number) =>
		solids.map((box) => box.y).filter((top) => top >= y);
	const over = (y: number) =>
		solids.map((box) => box.y + box.height).filter((bottom) => bottom <= y);
	const forward = edges.filter(
		(edge) =>
			!back.includes(edge.id) && boxes.has(edge.from) && boxes.has(edge.to),
	);
	for (const edge of forward) {
		const source = boxes.get(edge.from);
		const target = boxes.get(edge.to);
		if (!source || !target) continue;
		const from = {
			x: source.x + source.width / 2,
			y: source.y + source.height,
		};
		const to = { x: target.x + target.width / 2, y: target.y };
		const bent = (y: number) => [from, { x: from.x, y }, { x: to.x, y }, to];
		let points: CanvasPoint[];
		if (from.x === to.x) points = [from, to];
		else if (to.y < from.y + 2 * pair) points = bent((from.y + to.y) / 2);
		else {
			// The bend stands in the middle of the layer gap under the source: up
			// to the nearest node or frame below it.
			const bend = (from.y + Math.min(to.y, ...below(from.y))) / 2;
			const ends = new Set([edge.from, edge.to]);
			const heldByEnd = new Set([...ends].flatMap(holders));
			const down = { x: to.x, y: bend };
			const blocked =
				[...boxes].some(
					([id, box]) => !ends.has(id) && crosses(down, to, box),
				) ||
				bands.some(
					({ id, band }) => !heldByEnd.has(id) && crosses(down, to, band),
				);
			// Else in the middle of the gap above the target.
			const above = Math.max(from.y, ...over(to.y));
			points = bent(blocked ? (above + to.y) / 2 : bend);
		}
		routes.set(edge.id, {
			points: cleanPoints(points),
			arrow: {
				x: to.x - ARROW / 2,
				y: to.y - ARROW,
				width: ARROW,
				height: ARROW,
			},
		});
	}

	// A chip stands beside the first stretch of a leg that is its edge's alone
	// and long enough to hold it with a `pair` above and a `pair` and an
	// arrowhead below, `pair` from the line and `pair` under the stretch's top,
	// so it hangs near the source. A shared leg (a fan-out's stem) is skipped:
	// the chip goes beside what follows it.
	for (const edge of forward) {
		const route = routes.get(edge.id);
		const label = labels.get(edge.id);
		if (!route || !label) continue;
		const others = [...routes]
			.filter(([id]) => id !== edge.id)
			.flatMap(([, other]) => verticalLegs(other.points));
		const legs = verticalLegs(route.points);
		const own = legs.flatMap((leg) => alone(leg, others));
		const pool = own.length > 0 ? own : legs;
		const room = label.height + 2 * pair + ARROW;
		const leg =
			pool.find((each) => length(each) >= room) ??
			pool.reduce<Leg | undefined>(
				(best, each) => (!best || length(each) > length(best) ? each : best),
				undefined,
			);
		if (leg) route.label = { x: leg.x + pair, y: leg.top + pair, ...label };
	}

	const parts: Box[] = [...boxes.values(), ...frames.values()];
	for (const route of routes.values()) {
		for (const { x, y } of route.points)
			parts.push({ x, y, width: 0, height: 0 });
		if (route.label) parts.push(route.label);
	}
	return { routes, frames, bounds: union(parts) };
}

function union(boxes: readonly Box[]): Box {
	if (boxes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
	const left = Math.min(...boxes.map((box) => box.x));
	const top = Math.min(...boxes.map((box) => box.y));
	const right = Math.max(...boxes.map((box) => box.x + box.width));
	const bottom = Math.max(...boxes.map((box) => box.y + box.height));
	return { x: left, y: top, width: right - left, height: bottom - top };
}

const fixed = (value: number): number => Math.round(value * 100) / 100;

// The points moved onto pixel centres: a 1 px stroke at a whole coordinate
// straddles two pixel columns at half intensity, so the layer stands at a whole
// translate (`fitTransform`, `openTransform`) and a stroke at `n + 0.5` is one
// solid column at scale 1.
export function crisp(points: readonly CanvasPoint[]): CanvasPoint[] {
	return points.map(({ x, y }) => ({
		x: Math.floor(x) + 0.5,
		y: Math.floor(y) + 0.5,
	}));
}

// The SVG `d` of a polyline whose corners are quadratic arcs of `radius`,
// clamped to half of each adjacent segment.
export function roundedPath(
	points: readonly CanvasPoint[],
	radius: number,
): string {
	const [first, ...rest] = points;
	if (!first) return "";
	let d = `M${fixed(first.x)} ${fixed(first.y)}`;
	rest.forEach((point, index) => {
		const before = points[index];
		const after = rest[index + 1];
		const into = before
			? Math.hypot(point.x - before.x, point.y - before.y)
			: 0;
		const out = after ? Math.hypot(after.x - point.x, after.y - point.y) : 0;
		if (!before || !after || into === 0 || out === 0) {
			d += `L${fixed(point.x)} ${fixed(point.y)}`;
			return;
		}
		const r = Math.min(radius, into / 2, out / 2);
		const near = {
			x: point.x - ((point.x - before.x) / into) * r,
			y: point.y - ((point.y - before.y) / into) * r,
		};
		const far = {
			x: point.x + ((after.x - point.x) / out) * r,
			y: point.y + ((after.y - point.y) / out) * r,
		};
		d += `L${fixed(near.x)} ${fixed(near.y)}Q${fixed(point.x)} ${fixed(point.y)} ${fixed(far.x)} ${fixed(far.y)}`;
	});
	return d;
}
