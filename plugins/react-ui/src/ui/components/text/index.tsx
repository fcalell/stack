import { cn } from "@fcalell/ui-core/cn";
import { type TextRole, text, textStrong } from "@fcalell/ui-core/variants";
import { createContext, type ReactNode, use } from "react";
import type { Closed } from "../../lib/closed.ts";

const MEASURE = "max-w-measure";

// The role of the paragraph a Text sits in, unset outside one.
const Line = createContext<TextRole | undefined>(undefined);

/** A line of text in a type role, or a run inside one. */
export interface TextProps extends Closed {
	/** The type role: a primary line (`body`, the default) or a secondary one (`meta`). */
	role?: TextRole;
	/** Emphasis at weight 500, never a size change. */
	strong?: boolean;
	/** The text (text; wraps). */
	children?: ReactNode;
}

/** A paragraph in the body or meta role; ink and family ride with the role. A Text inside another is a run of its line. */
export function Text({ role, strong, children }: TextProps) {
	const line = use(Line);
	// A nested Text takes its line's role and inherits its look, adding only the weight.
	const drawn = line ?? role ?? "body";
	const weight = strong ? textStrong({ role: drawn }) : undefined;
	if (line) return <span className={weight}>{children}</span>;
	// A paragraph, never a span: a line inside a row is drawn by the row's own
	// cells, so a Text stands on its own and holds the measure.
	return (
		<Line value={drawn}>
			<p className={cn(text({ role: drawn }), weight, MEASURE)}>{children}</p>
		</Line>
	);
}
