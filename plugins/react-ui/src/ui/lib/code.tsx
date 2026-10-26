import { cn } from "@fcalell/ui-core/cn";
import type { Runs } from "@fcalell/ui-core/descriptors";
import { valueCut } from "@fcalell/ui-core/list-state";
import {
	CODE_NAME,
	PROSE_CODESPAN,
	textStrong,
} from "@fcalell/ui-core/variants";

// A whole value of code in the room its box leaves: the stem truncates to it
// and the tail stands whole (`valueCut`).
const CUT = "flex min-w-0";
const STEM = "min-w-0 truncate";
const TAIL = "shrink-0";
// A code run in a line of text is one box: it moves whole to the next line and
// is cut with an ellipsis only where it alone is wider than the line, never
// broken inside its word. In a text read whole (a row's `wrap`) it is cut
// nowhere: it wraps inside its box, breaking anywhere, the box drawn again on
// each line.
const SPAN = "inline-block max-w-full align-bottom truncate";
const SPAN_WHOLE = "wrap-anywhere box-decoration-clone";

/** A span of code that is a whole title or meta part: one value, cut in its middle to keep its start and its end. `fit` `name` draws it bare in the mono (a thing's name), `span` in the boxed inline code style (a value). Outside the package's exports. */
export function CodeCut(props: { code: string; fit?: "span" | "name" }) {
	const { stem, tail } = valueCut(props.code);
	return (
		<code
			className={cn(props.fit === "name" ? CODE_NAME : PROSE_CODESPAN, CUT)}
		>
			<span className={STEM}>{stem}</span>
			{tail ? <span className={TAIL}>{tail}</span> : null}
		</code>
	);
}

/** Runs as one text: words, a `{ quoted }` run in typographic quotes, a `{ strong }` run at strong weight in the meta role, a `{ code }` run in the inline code style, which never cuts in its middle; `whole` (a text read whole) wraps a code run inside its box instead of cutting it at its end. Outside the package's exports. */
export function RunText(props: { runs: Runs; whole?: boolean }) {
	const span = props.whole ? SPAN_WHOLE : SPAN;
	return props.runs.map((run, at) => {
		if (typeof run === "string") return run;
		if ("quoted" in run) return `“${run.quoted}”`;
		if ("code" in run)
			return (
				// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
				<code key={at} className={cn(PROSE_CODESPAN, span)}>
					{run.code}
				</code>
			);
		return (
			// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
			<span key={at} className={textStrong({ role: "meta" })}>
				{run.strong}
			</span>
		);
	});
}
