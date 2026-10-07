import type {
	CanvasEdge,
	CanvasNode,
	CanvasPath,
} from "@fcalell/ui-core/descriptors";

// What a node draws, decided here and only spelled by `NodeView`.
export interface NodeLook {
	// The `CANVAS_NODE` state: the outline's colour.
	state: "rest" | "selected" | "problem";
	// The `CANVAS_NODE_TEXT` tone of every part. A problem's words take the rest
	// ink: status colour belongs to a mark.
	tone: "rest" | "off" | "dimmed";
	// What the line slot shows.
	shows: "line" | "off" | "problem";
	// Whether the trailing column draws the node's `status`.
	status: boolean;
	// Whether the trailing column draws the danger mark. It outlives selection,
	// which takes the outline from the problem's border.
	problem: boolean;
}

// A node is on the path when there is no path, when the path lists it, or when
// it is where the path stands.
function onPath(id: string, path: CanvasPath | undefined): boolean {
	return !path || path.nodes.includes(id) || id === path.at;
}

// An off node ignores its problem, and a node off the path shows none.
function problems(
	node: Pick<CanvasNode, "id" | "off" | "problem">,
	path: CanvasPath | undefined,
): boolean {
	return Boolean(node.problem) && !node.off && onPath(node.id, path);
}

function boxState(
	node: Pick<CanvasNode, "id" | "off" | "problem">,
	selected: string | undefined,
	path: CanvasPath | undefined,
): NodeLook["state"] {
	if (node.id === selected || node.id === path?.at) return "selected";
	return problems(node, path) ? "problem" : "rest";
}

function nodeTone(
	node: Pick<CanvasNode, "id" | "off">,
	path: CanvasPath | undefined,
): NodeLook["tone"] {
	if (!onPath(node.id, path)) return "dimmed";
	return node.off ? "off" : "rest";
}

function lineShows(
	node: Pick<CanvasNode, "off" | "problem">,
): NodeLook["shows"] {
	if (node.off) return "off";
	return node.problem ? "problem" : "line";
}

export function nodeLook(
	node: Pick<CanvasNode, "id" | "off" | "problem" | "status">,
	selected: string | undefined,
	path?: CanvasPath,
): NodeLook {
	return {
		state: boxState(node, selected, path),
		tone: nodeTone(node, path),
		shows: lineShows(node),
		status: Boolean(node.status) && onPath(node.id, path),
		problem: problems(node, path),
	};
}

export type EdgeTone = "rest" | "dimmed";

// An edge is on the path by its own id only, never by its ends; an edge to an
// off node dims with it. An end that is not a node is never off.
export function edgeLook(
	edge: Pick<CanvasEdge, "id" | "from" | "to">,
	nodes: ReadonlyMap<string, Pick<CanvasNode, "off">>,
	path: CanvasPath | undefined,
): EdgeTone {
	if (path && !path.edges.includes(edge.id)) return "dimmed";
	if (nodes.get(edge.from)?.off || nodes.get(edge.to)?.off) return "dimmed";
	return "rest";
}
