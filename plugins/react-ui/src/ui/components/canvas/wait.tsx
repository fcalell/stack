import { cn } from "@fcalell/ui-core/cn";
import { canvasNode, canvasNodeText } from "@fcalell/ui-core/variants";
import { useLayoutEffect, useRef, useState } from "react";
import { spacing } from "../../lib/media.ts";
import { PAINT_BOX, Painted } from "../../lib/paint.tsx";
import { layerGap } from "./elk.ts";
import { GROUND, Grid } from "./ground.tsx";
import { fitTransform, type Transform, whole } from "./view.ts";
import { clearanceOf } from "./viewport.ts";
import { ZoomRoom } from "./zoom.tsx";

const STAND = "absolute left-0 top-0 flex flex-col";
const NODE = "flex items-center";
const COLUMN = "flex flex-col flex-1 min-w-0";
const LINE = "truncate";
const GLYPH = "size-icon shrink-0 rounded-full";
const NODES = ["a", "b", "c"];
// A node's lines as a loaded node draws them (an overline, its title, its
// line), each in that part's text, so the card is the loaded card's height.
const LINES = [
	{ part: "overline", role: "word" },
	{ part: "title", role: "name" },
	{ part: "line", role: "phrase" },
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

/** A Canvas whose graph is not here: its ground and grid, and three painted node cards (an icon beside an overline, a title and a line) stacked at the gap a loaded path keeps, standing where the loaded chain opens (the same opening view as Fit's, in the room the unseen zoom stack leaves), with no zoom stack, act or handler. Outside the package's exports. The one painted form that is a tree of its own, since a graph's layout has no geometry before its data. */
export function CanvasWait({ label }: { label: string }) {
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
		<section ref={region} aria-label={label} inert className={GROUND}>
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
						<span className={cn(PAINT_BOX, GLYPH)} />
						<span className={COLUMN}>
							{LINES.map(({ part, role }) => (
								<span key={part} className={cn(canvasNodeText({ part }), LINE)}>
									<Painted role={role} />
								</span>
							))}
						</span>
					</div>
				))}
			</div>
		</section>
	);
}
