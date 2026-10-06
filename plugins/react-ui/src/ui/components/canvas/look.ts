import type { CanvasNode } from "@fcalell/ui-core/descriptors";

// What a node draws: the `CANVAS_NODE` state and the `CANVAS_NODE_TEXT` tone.
export interface NodeLook {
	state: "rest" | "selected";
	tone: "rest";
}

export function nodeLook(
	node: Pick<CanvasNode, "id">,
	selected: string | undefined,
): NodeLook {
	return { state: node.id === selected ? "selected" : "rest", tone: "rest" };
}
