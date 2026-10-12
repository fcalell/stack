import { cn } from "@fcalell/ui-core/cn";
import type { Act } from "@fcalell/ui-core/descriptors";
import { CANVAS_ZOOM } from "@fcalell/ui-core/variants";
import { useWords } from "../../lib/words.tsx";
import { Button } from "../button/index.tsx";
import { IconButtonBase } from "../icon-button/base.tsx";
import { EXTENT } from "./view.ts";
import { useViewportValue, type Viewport } from "./viewport.ts";

const STACK = "absolute bottom-page left-page flex flex-col";
const FOOT =
	"absolute bottom-page inset-x-0 flex justify-center pointer-events-none";
const ACT = "pointer-events-auto";

// Zoom in, zoom out and fit, stacked at the bottom left, then arrange when the
// canvas can move nodes. A press here starts no pan. A zoom is unavailable at
// its end of the scale (`minZoom` the lowest); the button keeps focus, as a
// disabled icon act does. A fit stays clear of the stack, which `data-clear`
// names to the viewport.
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
	const words = useWords();
	const atMax = useViewportValue(viewport, (view) => view.k >= EXTENT[1]);
	const atMin = useViewportValue(viewport, (view) => view.k <= minZoom);
	return (
		<div data-no-pan data-clear="left" className={cn(CANVAS_ZOOM, STACK)}>
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
				onClick={onFit}
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

// The room the zoom stack takes, held by a waiting canvas that draws none: the
// stack's frame around one icon act, `invisible` (unfocusable, out of the
// accessibility tree), so an opening view clears
// what a loaded canvas's clears and nothing moves when the graph arrives.
export function ZoomRoom() {
	return (
		<div
			aria-hidden
			data-clear="left"
			className={cn(CANVAS_ZOOM, STACK, "invisible")}
		>
			<IconButtonBase icon="ZoomIn" fit="body" label="" tabIndex={-1} />
		</div>
	);
}

// The canvas's act, at the foot's centre. It adds, never removes, so its
// `destructive` and `quiet` flags are not read. A fit stays clear of it
// (`data-clear`).
export function ActFoot({ act }: { act: Act }) {
	return (
		<div data-no-pan className={FOOT}>
			<div data-clear="bottom" className={cn(CANVAS_ZOOM, ACT)}>
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
