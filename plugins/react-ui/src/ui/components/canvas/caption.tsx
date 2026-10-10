import { cn } from "@fcalell/ui-core/cn";
import { lineBox } from "@fcalell/ui-core/variants";
import { useLayoutEffect, useRef } from "react";
import { UNZOOM, UNZOOM_VAR } from "./floor.ts";
import type { Box } from "./geometry.ts";
import type { Viewport } from "./viewport.ts";

// A zero-width stand at the centre point: its flex item overflows both sides
// equally, so the text centres on the point at any width.
const STAND = "absolute w-0 flex justify-center pointer-events-none";
// The text wraps within the measure, and within the pane less a page inset on
// each side (`cqw` is the canvas region's width).
const TEXT =
	"shrink-0 w-max max-w-[min(var(--spacing-measure),calc(100cqw_-_2*var(--spacing-page)))] text-center text-ink-meta origin-top";

// The canvas's text, centred under the graph's bounds by a `gap` that holds on
// screen: it follows the pan and zoom with the layer and holds its own size and
// its own distance from the graph at any zoom, so it stays at the text floor
// and never closes on the node. It takes no pointer. Its size is reserved on the
// viewport, so a fit holds it whole in the pane with the graph.
export function Caption({
	id,
	text,
	bounds,
	gap,
	viewport,
}: {
	id: string;
	text: string;
	bounds: Box;
	gap: number;
	viewport: Viewport;
}) {
	const element = useRef<HTMLParagraphElement>(null);
	useLayoutEffect(() => {
		const paragraph = element.current;
		if (!paragraph) return;
		const reserve = () =>
			viewport.reserve({
				gap,
				height: paragraph.offsetHeight,
				width: paragraph.offsetWidth,
			});
		reserve();
		const watch = new ResizeObserver(reserve);
		watch.observe(paragraph);
		return () => {
			watch.disconnect();
			viewport.reserve(null);
		};
	}, [viewport, gap]);
	return (
		<div
			// Its place is a coordinate of the flow, known at run time; the gap is
			// screen pixels, so it is scaled by the zoom's inverse.
			style={{
				left: bounds.x + bounds.width / 2,
				top: `calc(${bounds.y + bounds.height}px + var(${UNZOOM_VAR}, 1) * ${gap}px)`,
			}}
			className={STAND}
		>
			<p
				ref={element}
				id={id}
				style={UNZOOM}
				className={cn(lineBox({ role: "meta" }), TEXT)}
			>
				{text}
			</p>
		</div>
	);
}
