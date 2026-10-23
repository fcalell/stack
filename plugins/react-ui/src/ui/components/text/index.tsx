import { cn } from "@fcalell/ui-core/cn";
import type { Run, Runs } from "@fcalell/ui-core/descriptors";
import { type TextRole, text } from "@fcalell/ui-core/variants";
import type { ReactNode } from "react";
import type { Closed } from "../../lib/closed.ts";
import { RunText } from "../../lib/code.tsx";

const MEASURE = "max-w-measure";

/** A paragraph of text in a type role. */
export interface TextProps extends Closed {
	/** The type role: a primary line (`body`, the default) or a secondary one (`meta`). */
	role?: TextRole;
	/** The text (text; wraps): words and links, or runs, where a `{ strong }` run is words at weight 500 and a `{ code }` run a span of code. */
	children?: ReactNode | Run | Runs;
}

// Runs are strings and objects of one of the run kinds, which a React element
// never is.
const isRun = (part: unknown): part is Run =>
	typeof part === "string" ||
	(typeof part === "object" &&
		part !== null &&
		("strong" in part || "code" in part || "quoted" in part));

function runsIn(children: TextProps["children"]): Runs | undefined {
	if (Array.isArray(children) && children.every(isRun)) return children;
	return typeof children === "object" && isRun(children)
		? [children]
		: undefined;
}

/** A paragraph in the body or meta role; ink and family ride with the role. A run of emphasis inside it is a `{ strong }` run, at weight 500 and never a size change. */
export function Text({ role, children }: TextProps) {
	const runs = runsIn(children);
	// A paragraph, never a span: a line inside a row is drawn by the row's own
	// cells, so a Text stands on its own and holds the measure.
	return (
		<p className={cn(text({ role: role ?? "body" }), MEASURE)}>
			{runs ? <RunText runs={runs} /> : (children as ReactNode)}
		</p>
	);
}
