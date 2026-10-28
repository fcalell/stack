import type {
	CanvasEdge,
	CanvasNode,
	CanvasPath,
	CanvasRole,
} from "@fcalell/ui-core/descriptors";

export type Surface =
	| "plain"
	| "strong"
	| "accent"
	| "attention"
	| "muted"
	| "off"
	| "dimmed";

// The tone each role draws at rest.
const ROLE_SURFACE: Record<CanvasRole, Surface> = {
	step: "plain",
	start: "accent",
	decision: "strong",
	wait: "attention",
	call: "plain",
	end: "muted",
};

// What a node draws, decided here and only spelled by `NodeView`.
export interface NodeLook {
	// The `CANVAS_NODE` state: the outline's colour.
	state: "rest" | "selected" | "problem";
	// The `CANVAS_NODE_TEXT` tone of every part. A problem's words take the rest
	// ink: status colour belongs to a mark. An end's words are quiet as an off
	// node's.
	tone: "rest" | "off" | "dimmed";
	// What the node is: its shape.
	role: CanvasRole;
	// The `CANVAS_NODE` tone: the role's ground and edge at rest, and the quiet
	// an off node and a node off the path draw over any role.
	surface: Surface;
	// What the line slot shows.
	shows: "line" | "off" | "problem";
	// Whether the line under the title is led by the node's `status`.
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
	node: Pick<CanvasNode, "id" | "off" | "role">,
	path: CanvasPath | undefined,
): NodeLook["tone"] {
	if (!onPath(node.id, path)) return "dimmed";
	return node.off || node.role === "end" ? "off" : "rest";
}

function nodeSurface(
	node: Pick<CanvasNode, "id" | "off" | "role">,
	path: CanvasPath | undefined,
): Surface {
	if (!onPath(node.id, path)) return "dimmed";
	return node.off ? "off" : ROLE_SURFACE[node.role ?? "step"];
}

function lineShows(
	node: Pick<CanvasNode, "off" | "problem">,
): NodeLook["shows"] {
	if (node.off) return "off";
	return node.problem ? "problem" : "line";
}

export function nodeLook(
	node: Pick<CanvasNode, "id" | "off" | "problem" | "status" | "role">,
	selected: string | undefined,
	path?: CanvasPath,
): NodeLook {
	return {
		state: boxState(node, selected, path),
		tone: nodeTone(node, path),
		role: node.role ?? "step",
		surface: nodeSurface(node, path),
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
