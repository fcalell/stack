import { cn } from "@fcalell/ui-core/cn";
import type { CanvasNode } from "@fcalell/ui-core/descriptors";
import { canvasNode, canvasNodeText } from "@fcalell/ui-core/variants";
import { type FocusEvent, useLayoutEffect, useState } from "react";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import type { Box, Size } from "./geometry.ts";
import type { NodeLook } from "./look.ts";

// The glyph draws in the node's own ink: it would else take the ink the page
// resolved before the mode scope it stands in.
const BOX = "absolute flex items-center text-start text-ink-body";
const SELECTED = "outline-1 outline-selected-outline";
const HOVERED = "hover:border-edge-hover";
const FOCUSED = "focus-visible:outline-2 focus-visible:outline-ring";
const COLUMN = "flex flex-col flex-1 min-w-0";
const LINE = "truncate";
const TRAILING = "flex flex-col items-end shrink-0";

// Reports the element's layout size: the border box, which the layer's scale
// does not change. The callback only records it, so it cannot loop.
function useSize(id: string, report: (id: string, size: Size) => void) {
	const [element, setElement] = useState<HTMLElement | null>(null);
	useLayoutEffect(() => {
		if (!element) return;
		const watch = new ResizeObserver(([entry]) => {
			const box = entry?.borderBoxSize[0];
			if (box) report(id, { width: box.inlineSize, height: box.blockSize });
		});
		watch.observe(element);
		return () => watch.disconnect();
	}, [element, id, report]);
	return setElement;
}

// A node: its glyph, its text column and its trailing figure, placed in flow
// coordinates. With `onSelect` it is one button named by its visible text;
// without, the same box, drawn and not operated. This is the one place a
// node's pointer handlers live.
export function NodeView({
	node,
	look,
	box,
	onSelect,
	onSize,
	onFocusVisible,
}: {
	node: CanvasNode;
	look: NodeLook;
	// Where it stands, and how large once measured.
	box: Pick<Box, "x" | "y">;
	onSelect?: (id: string | null) => void;
	onSize: (id: string, size: Size) => void;
	// A keyboard focus brings the node into view.
	onFocusVisible: (id: string) => void;
}) {
	const measure = useSize(node.id, onSize);
	const figure = node.number ?? node.count;
	const line = (part: "overline" | "title" | "line", text: string) => (
		<span className={cn(canvasNodeText({ part, tone: look.tone }), LINE)}>
			{text}
		</span>
	);
	const classes = cn(
		canvasNode({ state: look.state }),
		BOX,
		look.state === "selected" && SELECTED,
		onSelect && look.state === "rest" && HOVERED,
		onSelect && FOCUSED,
	);
	// A node's place is a coordinate of the flow, known at run time.
	const place = { left: box.x, top: box.y };
	const content = (
		<>
			<Icon name={node.icon} fit="meta" />
			<span className={COLUMN}>
				{node.overline ? line("overline", node.overline) : null}
				{line("title", node.title)}
				{node.line ? line("line", node.line) : null}
			</span>
			{figure === undefined ? null : (
				<span className={TRAILING}>
					<Count value={figure} />
				</span>
			)}
		</>
	);
	if (!onSelect)
		return (
			<div ref={measure} style={place} className={classes}>
				{content}
			</div>
		);
	// A press focuses the button too, and panning then would move a node out from
	// under the pointer: only a keyboard focus pans.
	const focused = (event: FocusEvent<HTMLButtonElement>) => {
		if (event.currentTarget.matches(":focus-visible")) onFocusVisible(node.id);
	};
	return (
		<button
			type="button"
			ref={measure}
			style={place}
			onClick={() => onSelect(node.id)}
			onFocus={focused}
			className={classes}
		>
			{content}
		</button>
	);
}
