import { cn } from "@fcalell/ui-core/cn";
import type { IconName } from "@fcalell/ui-core/descriptors";
import { type IconFit, icon } from "@fcalell/ui-core/variants";
import * as lucide from "lucide-react";
import type { Closed } from "../../lib/closed.ts";

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

/** A glyph in the ink of its place (currentColor), at the size of what it sits beside. */
export function Icon({ name, fit }: IconProps) {
	const Glyph = GLYPHS[name];
	// Decorative: the text beside it or the control around it names it.
	return (
		<Glyph className={cn(icon({ fit: fit ?? "body" }), GLYPH)} aria-hidden />
	);
}
