import type { ReactNode } from "react";
import type { ShowcaseFrame } from "../cells.ts";

/** Whether the frame draws a `PAINT` cell: an atom's painted form beside its loaded one. */
export const isPaint = (frame: ShowcaseFrame) =>
	frame.cell.name.startsWith("PAINT.");

// The loaded part, then the same part painted, at rest: the painted state is
// no interaction, so the other states have no form for it. items-start, so the
// frame's column does not stretch the inline parts.
export function beside(
	frame: ShowcaseFrame,
	loaded: ReactNode,
	painted: ReactNode,
) {
	if (frame.state !== "rest") return undefined;
	return (
		<div className="flex flex-wrap items-center gap-sections">
			{loaded}
			{painted}
		</div>
	);
}
