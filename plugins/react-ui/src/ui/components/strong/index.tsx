import { textStrong } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";

/** A run of emphasis inside a line. */
export interface StrongProps extends Closed {
	/** The words (text; wraps). */
	children?: ReactNode;
}

/** Words at weight 500 inside a `Text`, never a size change: the line's role, ink and family carry on. */
export function Strong({ children }: StrongProps) {
	// Body and meta share the weight, so the run reads the line's role from it.
	return <strong className={textStrong({ role: "body" })}>{children}</strong>;
}
