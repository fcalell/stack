import { cn } from "@fcalell/ui-core/cn";
import type { Act } from "@fcalell/ui-core/descriptors";
import { CANVAS_ZOOM } from "@fcalell/ui-core/variants";
import { useWords } from "../../lib/words.tsx";
import { ButtonBase } from "../button/base.tsx";
import { IconButtonBase } from "../icon-button/base.tsx";
import { EXTENT } from "./view.ts";
import { useViewportValue, type Viewport } from "./viewport.ts";

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
				fit="body"
				label={words.zoomIn}
				disabled={atMax}
				onClick={onZoomIn}
			/>
			<IconButtonBase
				icon="ZoomOut"
				fit="body"
				label={words.zoomOut}
				disabled={atMin}
				onClick={onZoomOut}
			/>
			<IconButtonBase
				icon="Maximize"
				fit="body"
				label={words.fit}
				onClick={onFit}
			/>
			{arrange ? (
				<IconButtonBase
					icon="Network"
					fit="body"
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
}: {
	viewport: Viewport;
	onFit: () => void;
	minZoom: number;
	onArrange?: () => void;
}) {
	const atMax = useViewportValue(viewport, (view) => view.k >= EXTENT[1]);
	const atMin = useViewportValue(viewport, (view) => view.k <= minZoom);
	return (
		<ZoomButtons
			atMax={atMax}
			atMin={atMin}
			arrange={onArrange !== undefined}
			onZoomIn={() => viewport.zoomIn()}
			onZoomOut={() => viewport.zoomOut()}
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
export function ActFoot({ act }: { act: Act }) {
	return (
		<div data-no-pan className={FOOT}>
			<div data-clear="bottom" className={cn(CANVAS_ZOOM, ACT)}>
				<ButtonBase
					act="quiet"
					fit="body"
					label={act.label}
					onAct={act.onAct}
					blocked={act.blocked}
				/>
			</div>
		</div>
	);
}
