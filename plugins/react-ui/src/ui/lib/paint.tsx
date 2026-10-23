import { cn } from "@fcalell/ui-core/cn";
import { type PaintRole, paintText, scrambled } from "@fcalell/ui-core/paint";
import { PULSE, paint } from "@fcalell/ui-core/variants";
import { ScrambledGlyphs } from "./scramble.tsx";

// One breath for the page. Each painted fill starts its `pulse-fill` animation
// when it mounts, so fills mounted a moment apart would breathe out of step, a
// ripple across the page. Every pulse animation instead takes the document
// timeline's zero as its start, so its phase is the timeline's and all fills
// share one. Listening at the document in the capture phase sees every
// animation as it starts, whatever mounted it, with nothing per fill; this
// module evaluates once, so any page that can paint is aligned.
if (typeof document !== "undefined") {
	document.addEventListener(
		"animationstart",
		(event) => {
			if (event.animationName !== "pulse-fill") return;
			const target = event.target;
			if (!(target instanceof Element)) return;
			for (const one of target.getAnimations()) {
				if (one instanceof CSSAnimation && one.animationName === "pulse-fill") {
					one.startTime = 0;
				}
			}
		},
		true,
	);
}

// A paint fades in after `--wait-delay` and then breathes on its fill's alpha,
// every fill in one phase (`PULSE`, `globals.css`), so a read
// the server answers at once paints nothing a viewer sees.
const GLYPHS = cn(
	paint({ kind: "glyphs" }),
	"box-decoration-clone select-none",
	PULSE,
);

/** The paint of a part's own box (a mark, a block): its fill, content not drawn. */
export const PAINT_BOX = cn(paint({ kind: "box" }), PULSE);

/** The paint of a control: its own box filled, its content invisible; the control is also `inert`. */
export const PAINT_CONTROL = cn(paint({ kind: "control" }), PULSE);

/** A text slot's paint, set inside the slot's own text element (no wrapper box): each line box a bar, or, where the theme scrambles the slot's kind (`theme.loading`) and the slot is one line, the scramble over the same box. It clips where a loaded text ellipsizes (`globals.css`). */
export function Painted({ role, at = 0 }: { role: PaintRole; at?: number }) {
	if (scrambled(role)) return <ScrambledGlyphs role={role} at={at} />;
	return (
		<span aria-hidden data-painted="" className={GLYPHS}>
			{paintText(role, at)}
		</span>
	);
}
