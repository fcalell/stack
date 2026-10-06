import { HANDOFF_GLYPH } from "@fcalell/ui-core/canvas";
import { cn } from "@fcalell/ui-core/cn";
import { Chip } from "../chip/index.tsx";
import { Icon } from "../icon/index.tsx";
import type { Box } from "./geometry.ts";

const CHIP = "flex items-center gap-inside text-ink-meta";
const PLACED = "absolute pointer-events-none";

// An edge's chip: its label in a neutral `Chip`, a handoff edge's glyph before
// it. The layer draws it at `at` and the hidden probe draws it where it flows,
// so what the router places is what was measured.
export function EdgeLabel({
	label,
	handoff,
	at,
}: {
	label?: string;
	handoff: boolean;
	at?: Box;
}) {
	return (
		// The chip's place is a coordinate of the flow, known at run time.
		<div
			className={cn(CHIP, at && PLACED)}
			style={at && { left: at.x, top: at.y }}
		>
			{handoff ? <Icon name={HANDOFF_GLYPH} fit="meta" /> : null}
			{label ? <Chip label={label} family="neutral" /> : null}
		</div>
	);
}
