import { cn } from "@fcalell/ui-core/cn";
import { type TextRole, text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";

const MEASURE = "max-w-measure";

/** A paragraph of text in a type role. */
export interface TextProps extends Closed {
	/** The type role: a primary line (`body`, the default) or a secondary one (`meta`). */
	role?: TextRole;
	/** The text (text; wraps), with `Strong` runs and links inside it. */
	children?: ReactNode;
}

/** A paragraph in the body or meta role; ink and family ride with the role. A run of emphasis inside it is a `Strong`. */
export function Text({ role, children }: TextProps) {
	// A paragraph, never a span: a line inside a row is drawn by the row's own
	// cells, so a Text stands on its own and holds the measure.
	return (
		<p className={cn(text({ role: role ?? "body" }), MEASURE)}>{children}</p>
	);
}
