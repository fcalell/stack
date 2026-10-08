import { backEdges } from "@fcalell/ui-core/canvas";
import type {
	CanvasEdge,
	CanvasGroup,
	CanvasNode,
	CanvasPoint,
} from "@fcalell/ui-core/descriptors";
import { WIDTH_VALUE } from "@fcalell/ui-core/tokens";
import type { ElkNode } from "elkjs/lib/elk-api.js";
import { ARROW, emptyGroups, groupTree, type Size } from "./geometry.ts";

// The input to ELK and the read of its output: pure, so node tests run them.
// Ids carry their kind, so a node, a group and an edge sharing a string never
// collide in ELK's one id space.

export interface Gaps {
	// Between nodes of a layer, and between layers.
	node: number;
	layer: number;
	// The graph's own margin.
	page: number;
}

export interface ElkInput {
	nodes: readonly Pick<CanvasNode, "id">[];
	edges: readonly Pick<CanvasEdge, "id" | "from" | "to">[];
	groups: readonly CanvasGroup[];
	// `pathOrder` of the nodes, the empty groups and the edges.
	order: readonly string[];
	sizes: ReadonlyMap<string, Size>;
	// A group's head height and the padding around what it holds.
	head: number;
	pad: number;
	// A group's left padding where its head text needs more (`leftPads`).
	left?: ReadonlyMap<string, number>;
	gaps: Gaps;
}

// A layer gap holds the router's own room: a forward edge bends in its middle,
// and under the bend a label chip hangs a `pair` below it with a `pair` of air
// and an arrowhead beneath it before the next node, so half the gap is that.
export function layerGap(sections: number, chip: number, pair: number): number {
	return Math.max(sections, 2 * (chip + 2 * pair + ARROW));
}

const sides = (top: number, left: number, rest: number) =>
	`[top=${top},left=${left},bottom=${rest},right=${rest}]`;

export function elkGraph(input: ElkInput): ElkNode {
	const { nodes, edges, groups, order, sizes, head, pad, left, gaps } = input;
	const width = Number.parseFloat(WIDTH_VALUE.node);
	// An empty group is a leaf of its head and padding, which an edge may name.
	const empty = emptyGroups(groups, new Set(nodes.map((node) => node.id)));
	const ids = new Set([...nodes.map((node) => node.id), ...empty]);
	const rank = new Map(order.map((id, index) => [id, index]));
	const tree = groupTree(groups, ids);

	// Where a group stands among its siblings: its first member's place.
	const firsts = new Map<string, number>();
	const first = (id: string): number => {
		const known = firsts.get(id);
		if (known !== undefined) return known;
		const at = Math.min(
			...(tree.nodes.get(id) ?? []).map((node) => rank.get(node) ?? Infinity),
			...(tree.groups.get(id) ?? []).map(first),
		);
		firsts.set(id, at);
		return at;
	};

	const leaf = (id: string): ElkNode => ({
		id: `n:${id}`,
		width,
		height: empty.includes(id) ? head + 2 * pad : (sizes.get(id)?.height ?? 0),
	});
	const frame = (id: string): ElkNode => {
		const members = [
			...(tree.nodes.get(id) ?? []).map((node) => ({
				at: rank.get(node) ?? Infinity,
				elk: leaf(node),
			})),
			...(tree.groups.get(id) ?? []).map((group) => ({
				at: first(group),
				elk: frame(group),
			})),
		].filter((member) => member.at !== Infinity);
		return {
			id: `g:${id}`,
			layoutOptions: {
				"elk.padding": sides(head + pad, left?.get(id) ?? pad, pad),
				"elk.spacing.nodeNode": String(gaps.node),
				"elk.layered.spacing.nodeNodeBetweenLayers": String(gaps.layer),
			},
			children: members.sort((a, b) => a.at - b.at).map(({ elk }) => elk),
		};
	};

	const held = new Set([...tree.nodes.values()].flat());
	const top = [
		...order
			.filter((id) => ids.has(id) && !held.has(id))
			.map((id) => ({ at: rank.get(id) ?? Infinity, elk: leaf(id) })),
		...tree.roots
			.filter((id) => first(id) !== Infinity)
			.map((id) => ({ at: first(id), elk: frame(id) })),
	];

	const back = new Set(backEdges(order, edges));
	return {
		id: "root",
		layoutOptions: {
			"elk.algorithm": "layered",
			"elk.direction": "DOWN",
			"elk.hierarchyHandling": "INCLUDE_CHILDREN",
			"elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
			// A parent stands over the middle of its children.
			"elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
			"elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
			"elk.json.shapeCoords": "ROOT",
			"elk.spacing.nodeNode": String(gaps.node),
			"elk.layered.spacing.nodeNodeBetweenLayers": String(gaps.layer),
			"elk.padding": sides(gaps.page, gaps.page, gaps.page),
		},
		children: top.sort((a, b) => a.at - b.at).map(({ elk }) => elk),
		edges: edges
			.filter(
				(edge) => !back.has(edge.id) && ids.has(edge.from) && ids.has(edge.to),
			)
			.map((edge) => ({
				id: `e:${edge.id}`,
				sources: [`n:${edge.from}`],
				targets: [`n:${edge.to}`],
			})),
	};
}

// Every node's absolute position, from ELK's output: `shapeCoords: ROOT` makes
// a node's `x` and `y` absolute, so the walk is flat and a group's own
// rectangle is ignored. A position is whole pixels where it enters the canvas,
// so node boxes, frames and edges drawn at pixel centres agree.
export function fromElk(output: ElkNode): Map<string, CanvasPoint> {
	const out = new Map<string, CanvasPoint>();
	const walk = (node: ElkNode) => {
		if (node.id.startsWith("n:"))
			out.set(node.id.slice(2), {
				x: Math.round(node.x ?? 0),
				y: Math.round(node.y ?? 0),
			});
		for (const child of node.children ?? []) walk(child);
	};
	walk(output);
	return out;
}

// What a layout is keyed by: the graph's structure, so a layout reruns when it
// changes and not for a status, a label, a selection or a path.
export function graphKey(
	nodes: readonly Pick<CanvasNode, "id">[],
	edges: readonly Pick<CanvasEdge, "id" | "from" | "to">[],
	groups: readonly CanvasGroup[],
): string {
	return JSON.stringify([
		nodes.map((node) => node.id),
		edges.map((edge) => [edge.id, edge.from, edge.to]),
		groups.map((group) => [group.id, group.head, group.holds]),
	]);
}
