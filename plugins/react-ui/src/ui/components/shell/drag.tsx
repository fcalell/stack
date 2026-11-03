import { cn } from "@fcalell/ui-core/cn";
import { DRAG_GHOST, DROP_LINE } from "@fcalell/ui-core/variants";
import { use } from "react";
import { createPortal } from "react-dom";
import { useDrag } from "../../lib/drag.ts";
import { PortalContainer } from "../../lib/portal.ts";

// The label follows the pointer a step off it, so the drop under the pointer
// stays in view; both stand in the frame's popup container, a point at the
// viewport's origin, and take no pointer, so the drag's hit test sees through
// them.
const GHOST = "absolute top-0 left-0 pointer-events-none";
const LINE = "absolute -translate-y-1/2 pointer-events-none";
const OFFSET = 12;

/** The label that follows a drag's pointer and the line a reordered row lands at. Mounted by the frame host; draws nothing while no drag stands. Outside the package's exports. */
export function DragLayer() {
	const drag = useDrag();
	const container = use(PortalContainer);
	if (!drag || !container) return null;
	return createPortal(
		<>
			<div
				aria-hidden
				style={{
					transform: `translate(${drag.x + OFFSET}px, ${drag.y + OFFSET}px)`,
				}}
				className={cn(DRAG_GHOST, GHOST)}
			>
				{drag.label}
			</div>
			{drag.line ? (
				<div
					aria-hidden
					style={{
						left: drag.line.left,
						top: drag.line.top,
						width: drag.line.width,
					}}
					className={cn(DROP_LINE, LINE)}
				/>
			) : null}
		</>,
		container,
	);
}
