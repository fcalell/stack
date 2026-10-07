import { cn } from "@fcalell/ui-core/cn";
import type { Act } from "@fcalell/ui-core/descriptors";
import { CANVAS_ZOOM } from "@fcalell/ui-core/variants";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { IconButtonBase } from "../icon-button/base.tsx";
import type { Box } from "./geometry.ts";
import { EXTENT, useViewportValue, type Viewport } from "./viewport.ts";

const STACK = "absolute bottom-page left-page flex flex-col";
const FOOT =
	"absolute bottom-page inset-x-0 flex justify-center pointer-events-none";
const ACT = "pointer-events-auto";

// Zoom in, zoom out and fit, stacked at the bottom left, then arrange when the
// canvas can move nodes. A press here starts no pan. A zoom is unavailable at
// its end of the scale; the button keeps focus, as a disabled icon act does.
export function ZoomStack({
	viewport,
	bounds,
	onArrange,
}: {
	viewport: Viewport;
	bounds: Box;
	onArrange?: () => void;
}) {
	const words = useWords();
	const [low, high] = EXTENT;
	const atMax = useViewportValue(viewport, (view) => view.k >= high);
	const atMin = useViewportValue(viewport, (view) => view.k <= low);
	return (
		<div data-no-pan className={cn(CANVAS_ZOOM, STACK)}>
			<IconButtonBase
				icon="ZoomIn"
				fit="body"
				label={words.zoomIn}
				disabled={atMax}
				onClick={() => viewport.zoomIn()}
			/>
			<IconButtonBase
				icon="ZoomOut"
				fit="body"
				label={words.zoomOut}
				disabled={atMin}
				onClick={() => viewport.zoomOut()}
			/>
			<IconButtonBase
				icon="Maximize"
				fit="body"
				label={words.fit}
				onClick={() => viewport.fit(bounds)}
			/>
			{onArrange ? (
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

// The canvas's act, at the foot's centre. It adds, never removes, so its
// `destructive` and `quiet` flags are not read.
export function ActFoot({ act }: { act: Act }) {
	return (
		<div data-no-pan className={FOOT}>
			<div className={cn(CANVAS_ZOOM, ACT)}>
				<Button
					act="quiet"
					fit="body"
					label={act.label}
					onAct={act.onAct}
					blocked={act.blocked}
					loading={act.loading}
				/>
			</div>
		</div>
	);
}
