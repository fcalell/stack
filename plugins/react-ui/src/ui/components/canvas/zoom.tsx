import { cn } from "@fcalell/ui-core/cn";
import type { LinkAct } from "@fcalell/ui-core/descriptors";
import { CANVAS_ZOOM } from "@fcalell/ui-core/variants";
import type { Act } from "../../lib/act.ts";
import { useWords } from "../../lib/words.tsx";
import { ActFace } from "../button/face.tsx";
import { IconButtonBase } from "../button/glyph.tsx";
import { EXTENT } from "./view.ts";
import { type About, useViewportValue, type Viewport } from "./viewport.ts";

const STACK = "absolute bottom-page left-page flex flex-col";
const FOOT =
	"absolute bottom-page inset-x-0 flex justify-center pointer-events-none";
const ACT = "pointer-events-auto";

// The buttons of the zoom stack, stacked at the bottom left: zoom in, zoom out,
// fit, then arrange when the canvas can move nodes. A press here starts no pan.
// A zoom is unavailable at its end of the scale (`atMax`, `atMin`); the button
// keeps focus, as a disabled icon act does. A fit stays clear of the stack,
// which `data-clear` names to the viewport. A waiting canvas draws them with no
// act, inside its inert region.
function ZoomButtons({
	atMax = false,
	atMin = false,
	arrange,
	onZoomIn,
	onZoomOut,
	onFit,
	onArrange,
}: {
	atMax?: boolean;
	atMin?: boolean;
	arrange: boolean;
	onZoomIn?: () => void;
	onZoomOut?: () => void;
	onFit?: () => void;
	onArrange?: () => void;
}) {
	const words = useWords();
	return (
		<div data-no-pan data-clear="left" className={cn(CANVAS_ZOOM, STACK)}>
			<IconButtonBase
				icon="ZoomIn"
				label={words.zoomIn}
				disabled={atMax}
				onClick={onZoomIn}
			/>
			<IconButtonBase
				icon="ZoomOut"
				label={words.zoomOut}
				disabled={atMin}
				onClick={onZoomOut}
			/>
			<IconButtonBase icon="Maximize" label={words.fit} onClick={onFit} />
			{arrange ? (
				<IconButtonBase
					icon="Network"
					label={words.arrange}
					onClick={onArrange}
				/>
			) : null}
		</div>
	);
}

// The stack of a loaded canvas, its ends of the scale read from the viewport.
export function ZoomStack({
	viewport,
	onFit,
	minZoom,
	onArrange,
	anchor,
}: {
	viewport: Viewport;
	onFit: () => void;
	minZoom: number;
	onArrange?: () => void;
	// What the buttons zoom about: the focused node, else nothing, which is the
	// pane's centre.
	anchor: () => About | undefined;
}) {
	const atMax = useViewportValue(viewport, (view) => view.k >= EXTENT[1]);
	const atMin = useViewportValue(viewport, (view) => view.k <= minZoom);
	return (
		<ZoomButtons
			atMax={atMax}
			atMin={atMin}
			arrange={onArrange !== undefined}
			onZoomIn={() => viewport.zoomIn(anchor())}
			onZoomOut={() => viewport.zoomOut(anchor())}
			onFit={onFit}
			onArrange={onArrange}
		/>
	);
}

// The stack a waiting canvas draws: the loaded stack's buttons, with `arrange`
// where the canvas can move nodes, so nothing changes when the graph arrives.
export function ZoomPainted({ arrange }: { arrange: boolean }) {
	return <ZoomButtons arrange={arrange} />;
}

// The canvas's act, at the foot's centre. It adds, never removes, so its
// `destructive` and `quiet` flags are not read. A fit stays clear of it
// (`data-clear`).
export function ActFoot({ act }: { act: Act | LinkAct }) {
	return (
		<div data-no-pan className={FOOT}>
			<div data-clear="bottom" className={cn(CANVAS_ZOOM, ACT)}>
				<ActFace
					act={act}
					kind="quiet"
					blocked={"blocked" in act ? act.blocked : undefined}
				/>
			</div>
		</div>
	);
}
