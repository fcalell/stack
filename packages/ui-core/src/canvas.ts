// The canvas's graph logic: pure and framework-free, so the web canvas and a
// consumer that numbers or reads its nodes share one answer. Inputs are
// structural, so a consumer passes its own objects.

import type { CanvasEdge, CanvasNode, IconName } from "./descriptors.ts";

// A handoff edge's glyph, drawn beside its label.
export const HANDOFF_GLYPH: IconName = "ArrowRightLeft";

// The edges between known nodes, as indices into `edges`, grouped by source
// in array order, with each node's in-edge count.
function link(
	ids: readonly string[],
	edges: readonly { from: string; to: string }[],
) {
	const known = new Set(ids);
	const out = new Map<string, number[]>(ids.map((id) => [id, []]));
	const inDegree = new Map<string, number>(ids.map((id) => [id, 0]));
	edges.forEach((edge, index) => {
		if (!known.has(edge.from) || !known.has(edge.to)) return;
		out.get(edge.from)?.push(index);
		inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
	});
	return { out, inDegree };
}

// The indices of the edges that close a cycle: a colouring walk from the
// roots (nodes with no in-edge), then from each node still unvisited, takes
// an edge into a node still on the walk's stack, a self-loop included, as the
// cut. A ring with no root is cut at its first node in array order.
function cycleCuts(
	ids: readonly string[],
	edges: readonly { from: string; to: string }[],
): Set<number> {
	const { out, inDegree } = link(ids, edges);
	const state = new Map<string, "stacked" | "done">();
	const cuts = new Set<number>();
	const walk = (id: string) => {
		state.set(id, "stacked");
		for (const index of out.get(id) ?? []) {
			const target = edges[index]?.to;
			if (target === undefined) continue;
			const seen = state.get(target);
			if (seen === "stacked") cuts.add(index);
			else if (seen === undefined) walk(target);
		}
		state.set(id, "done");
	};
	for (const id of ids) {
		if (inDegree.get(id) === 0 && !state.has(id)) walk(id);
	}
	for (const id of ids) {
		if (!state.has(id)) walk(id);
	}
	return cuts;
}

// Every node id once, in path order: depth first from the roots, out-edges in
// array order, a node with several predecessors placed after its last one. A
// cycle is cut where `cycleCuts` finds it, so every graph terminates; an
// edge naming an id outside `nodes` is ignored.
export function pathOrder(
	nodes: readonly Pick<CanvasNode, "id">[],
	edges: readonly Pick<CanvasEdge, "from" | "to">[],
): string[] {
	const ids = nodes.map((node) => node.id);
	const cuts = cycleCuts(ids, edges);
	const kept = edges.filter((_, index) => !cuts.has(index));
	const { out, inDegree } = link(ids, kept);
	const waiting = new Map(inDegree);
	const order: string[] = [];
	const place = (id: string) => {
		order.push(id);
		for (const index of out.get(id) ?? []) {
			const target = kept[index]?.to;
			if (target === undefined) continue;
			const left = (waiting.get(target) ?? 0) - 1;
			waiting.set(target, left);
			if (left === 0) place(target);
		}
	};
	for (const id of ids) {
		if (inDegree.get(id) === 0) place(id);
	}
	return order;
}

// The ids of the edges whose target is at or before its source in `order`, in
// edge-array order; an edge naming an id outside `order` is never back.
export function backEdges(
	order: readonly string[],
	edges: readonly Pick<CanvasEdge, "id" | "from" | "to">[],
): string[] {
	const at = new Map(order.map((id, index) => [id, index]));
	return edges
		.filter((edge) => {
			const from = at.get(edge.from);
			const to = at.get(edge.to);
			return from !== undefined && to !== undefined && to <= from;
		})
		.map((edge) => edge.id);
}
