import { cn } from "@fcalell/ui-core/cn";
import { type PaintRole, paintText } from "@fcalell/ui-core/paint";
import { paint } from "@fcalell/ui-core/variants";

// The paint fades in after `--wait-delay` (`globals.css`), so a read the
// server answers at once paints nothing a viewer sees.
const FADE = "animate-paint";
const GLYPHS = cn(
	paint({ kind: "glyphs" }),
	"box-decoration-clone select-none",
	FADE,
);

/** The paint of a part's own box (a mark, a block): its fill, content not drawn. */
export const PAINT_BOX = cn(paint({ kind: "box" }), FADE);

/** The paint of a control: its own box filled, its content invisible; the control is also `inert`. */
export const PAINT_CONTROL = cn(paint({ kind: "control" }), FADE);

/** A text slot's paint, set inside the slot's own text element (no wrapper box): each line box a bar. It clips where a loaded text ellipsizes (`globals.css`). */
export function Painted({ role, at = 0 }: { role: PaintRole; at?: number }) {
	return (
		<span aria-hidden data-painted="" className={GLYPHS}>
			{paintText(role, at)}
		</span>
	);
}
