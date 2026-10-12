import { cn } from "@fcalell/ui-core/cn";
import {
	canvasNode,
	canvasNodeText,
	skeleton,
	skeletonLane,
} from "@fcalell/ui-core/variants";
import { useLayoutEffect, useRef, useState } from "react";
import { spacing } from "../../lib/media.ts";
import { layerGap } from "./elk.ts";
import { GROUND, Grid, useBleed } from "./ground.tsx";
import { fitTransform, type Transform, whole } from "./view.ts";
import { clearanceOf } from "./viewport.ts";
import { ZoomRoom } from "./zoom.tsx";

const STAND = "absolute left-0 top-0 flex flex-col";
const NODE = "flex items-center";
const COLUMN = "flex flex-col flex-1 min-w-0";
const LINE = "flex items-center h-lh";
const GLYPH = "shrink-0";
const NODES = ["a", "b", "c"];
// A node's lines as a loaded node draws them (an overline, its title, its
// line): each lane takes that part's text, so the card is the loaded card's height.
const LINES = [
	{ part: "overline", bar: "w-1/3" },
	{ part: "title", bar: "w-2/3" },
	{ part: "line", bar: "w-1/2" },
] as const;

// Where a loaded canvas opens a graph of these bounds: the opening view of the
// layout (`fitTransform`), in the room the pane and the zoom stack leave.
function opening(region: HTMLElement, stand: HTMLElement): Transform {
	return whole(
		fitTransform(
			{ x: 0, y: 0, width: stand.offsetWidth, height: stand.offsetHeight },
			{ width: region.clientWidth, height: region.clientHeight },
			spacing("page"),
			clearanceOf(region),
		),
	);
}

/** A Canvas waiting: its ground and grid, and three node-shaped cards (an icon beside an overline, a title and a line bar) stacked at the gap a loaded path keeps, standing where the loaded chain opens (the same opening view as Fit's, in the room the unseen zoom stack leaves), with no zoom stack, act or handler. Outside the package's exports. */
export function CanvasWait({ label }: { label: string }) {
	const bleed = useBleed();
	const region = useRef<HTMLElement>(null);
	const stand = useRef<HTMLDivElement>(null);
	const [view, setView] = useState<Transform | null>(null);
	// The view is set before paint and again when the pane resizes.
	useLayoutEffect(() => {
		const pane = region.current;
		const column = stand.current;
		if (!pane || !column) return;
		const set = () => setView(opening(pane, column));
		set();
		const watch = new ResizeObserver(set);
		watch.observe(pane);
		return () => watch.disconnect();
	}, []);
	return (
		<section
			ref={region}
			aria-label={label}
			aria-busy
			data-fill
			className={cn(GROUND, bleed)}
		>
			<Grid />
			<ZoomRoom />
			<div
				ref={stand}
				aria-hidden
				style={{
					// The layer gap is a run-time size of the page's tokens, the loaded path's own.
					gap: layerGap(spacing("sections"), 0, spacing("pair")),
					transform: view ? `translate(${view.x}px, ${view.y}px)` : undefined,
				}}
				className={STAND}
			>
				{NODES.map((key) => (
					<div key={key} className={cn(canvasNode({ state: "rest" }), NODE)}>
						<span className={cn(skeleton({ kind: "icon" }), GLYPH)} />
						<span className={COLUMN}>
							{LINES.map(({ part, bar }) => (
								<span
									key={part}
									className={cn(
										skeletonLane({ role: "meta" }),
										canvasNodeText({ part }),
										LINE,
									)}
								>
									<span className={cn(skeleton({ kind: "line" }), bar)} />
								</span>
							))}
						</span>
					</div>
				))}
			</div>
		</section>
	);
}
