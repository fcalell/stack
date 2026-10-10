import { cn } from "@fcalell/ui-core/cn";
import {
	canvasNode,
	canvasNodeText,
	skeleton,
	skeletonLane,
} from "@fcalell/ui-core/variants";
import { spacing } from "../../lib/media.ts";
import { layerGap } from "./elk.ts";
import { GROUND, Grid, useBleed } from "./ground.tsx";

const STAND = "absolute inset-0 flex flex-col items-center justify-center";
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

/** A Canvas waiting: its ground and grid, and three node-shaped cards (an icon beside an overline, a title and a line bar) stacked at the gap a loaded path keeps, with no zoom stack, act or handler. Outside the package's exports. */
export function CanvasWait({ label }: { label: string }) {
	const bleed = useBleed();
	return (
		<section
			aria-label={label}
			aria-busy
			data-fill
			className={cn(GROUND, bleed)}
		>
			<Grid />
			<div
				aria-hidden
				// The layer gap is a run-time size of the page's tokens, the loaded path's own.
				style={{ gap: layerGap(spacing("sections"), 0, spacing("pair")) }}
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
