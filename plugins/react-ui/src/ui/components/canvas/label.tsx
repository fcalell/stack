import { HANDOFF_GLYPH } from "@fcalell/ui-core/canvas";
import { cn } from "@fcalell/ui-core/cn";
import { PATH_TONE } from "@fcalell/ui-core/variants";
import { ChipBase } from "../chip/base.tsx";
import { Icon } from "../icon/index.tsx";
import type { Box } from "./geometry.ts";
import type { EdgeTone } from "./look.ts";

const CHIP = "flex items-center gap-gap";
const INK = "text-ink-meta";
// The handoff glyph, a graphic, dims to the mark ink (3:1); the chip's words
// step down to the meta ink, the quietest a word has (4.5:1), as a node off
// the path's do.
const DIM = "text-ink-mark";
const PLACED = "absolute pointer-events-none";
const HIDDEN = "invisible";

// An edge's chip: its label in a neutral `Chip`, a handoff edge's glyph before
// it. The layer draws it at `at` and the hidden probe draws it where it flows,
// so what the router places is what was measured. Under the text floor it keeps
// its place and draws nothing.
export function EdgeLabel({
	label,
	handoff,
	tone = "rest",
	at,
	below = false,
}: {
	label?: string;
	handoff: boolean;
	tone?: EdgeTone;
	at?: Box;
	below?: boolean;
}) {
	return (
		// The chip's place is a coordinate of the flow, known at run time.
		<div
			className={cn(
				CHIP,
				PATH_TONE,
				tone === "dimmed" ? DIM : INK,
				at && PLACED,
				below && HIDDEN,
			)}
			style={at && { left: at.x, top: at.y }}
		>
			{handoff ? <Icon name={HANDOFF_GLYPH} fit="meta" /> : null}
			{label ? (
				<ChipBase label={label} family="neutral" quiet={tone === "dimmed"} />
			) : null}
		</div>
	);
}
