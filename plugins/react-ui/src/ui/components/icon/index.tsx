import { cn } from "@fcalell/ui-core/cn";
import type { IconName } from "@fcalell/ui-core/descriptors";
import { ICON_STROKE, type IconStroke } from "@fcalell/ui-core/tokens";
import { type IconFit, icon } from "@fcalell/ui-core/variants";
import * as lucide from "lucide-react";
import type { Closed } from "../../lib/closed.ts";
import { PAINT_BOX } from "../../lib/paint.tsx";

const GLYPH = "shrink-0";

// Every Lucide name to its glyph; the annotation fails the build when the
// package lacks a name ui-core's `lucide` carries.
export const GLYPHS: Record<IconName, lucide.LucideIcon> = lucide;

/** A Lucide glyph. */
export interface IconProps extends Closed {
	/** The glyph's Lucide name. */
	name: IconName;
	/** What it sits beside, which picks its size: `meta` text, `body` text (the default), or the inside of a `control`. */
	fit?: IconFit;
}

/** What every icon draws: the public `Icon` at the line weight, or a mark that carries meaning (a change mark) at the mark weight. `painted` is the glyph's box while its data is not here, nothing drawn in it. Outside the package's exports. */
export function IconBase({
	name,
	fit,
	stroke,
	painted,
}: IconProps & { stroke: IconStroke; painted?: boolean }) {
	const Glyph = GLYPHS[name];
	if (painted)
		return (
			<span
				aria-hidden
				className={cn(icon({ fit: fit ?? "body" }), GLYPH, PAINT_BOX)}
			/>
		);
	// Decorative: the text beside it or the control around it names it.
	return (
		<Glyph
			className={cn(icon({ fit: fit ?? "body" }), GLYPH)}
			strokeWidth={ICON_STROKE[stroke]}
			aria-hidden
		/>
	);
}

/** A glyph in the ink of its place (currentColor), at the size of what it sits beside. */
export function Icon({ name, fit }: IconProps) {
	return <IconBase name={name} fit={fit} stroke="line" />;
}
