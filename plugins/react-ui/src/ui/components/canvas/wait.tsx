import { cn } from "@fcalell/ui-core/cn";
import {
	canvasNode,
	lineBox,
	skeleton,
	skeletonLane,
} from "@fcalell/ui-core/variants";
import { GROUND, Grid, useBleed } from "./ground.tsx";

const STAND =
	"absolute inset-0 flex flex-col items-center justify-center gap-sections";
const NODE = "flex items-center";
const COLUMN = "flex flex-col flex-1 min-w-0";
const LINE = "flex items-center h-lh";
const GLYPH = "shrink-0";
const NODES = ["a", "b", "c"];

/** A Canvas waiting: its ground and grid, and three node-shaped cards (an icon, a title bar and a line bar) stacked as the canvas places a path, with no zoom stack, act or handler. Outside the package's exports. */
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
			<div aria-hidden className={STAND}>
				{NODES.map((key) => (
					<div key={key} className={cn(canvasNode({ state: "rest" }), NODE)}>
						<span className={cn(skeleton({ kind: "icon" }), GLYPH)} />
						<span className={COLUMN}>
							<span
								className={cn(
									skeletonLane({ role: "body" }),
									lineBox({ role: "body" }),
									LINE,
								)}
							>
								<span className={cn(skeleton({ kind: "line" }), "w-2/3")} />
							</span>
							<span
								className={cn(
									skeletonLane({ role: "meta" }),
									lineBox({ role: "meta" }),
									LINE,
								)}
							>
								<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
							</span>
						</span>
					</div>
				))}
			</div>
		</section>
	);
}
