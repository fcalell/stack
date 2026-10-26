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
// A code run in a line of text is one box (drawn or bare): it moves whole to
// the next line and is cut with an ellipsis only where it alone is wider than
// the line, never broken inside its word. In a text read whole (a row's `wrap`)
// it is cut nowhere: it wraps inside its box, breaking anywhere, a drawn box
// drawn again on each line.
const SPAN = "inline-block max-w-full align-bottom truncate";
const SPAN_WHOLE = "wrap-anywhere box-decoration-clone";

/** A span of code that is a whole title or meta part of a row: one value in the mono, bare (a machine name in a row is never boxed), cut in its middle to keep its start and its end (`valueCut`: a value with a space is words, cut at its end). Outside the package's exports. */
export function CodeCut(props: { code: string }) {
	const { stem, tail } = valueCut(props.code);
	return (
		<code className={cn(CODE_NAME, CUT)}>
			<span className={STEM}>{stem}</span>
			{tail ? <span className={TAIL}>{tail}</span> : null}
		</code>
	);
}

/** Runs as one text: words, a `{ quoted }` run in typographic quotes, a `{ strong }` run at strong weight in the meta role, a `{ code }` run in the mono, which never cuts in its middle: boxed in the inline code style inside a sentence (`fit` `span`, the default), bare where the runs are a name, a crumb or a row's line (`fit` `name`, voice 7); `whole` (a text read whole) wraps a code run inside its box instead of cutting it at its end. Outside the package's exports. */
export function RunText(props: {
	runs: Runs;
	whole?: boolean;
	fit?: "span" | "name";
}) {
	const span = props.whole ? SPAN_WHOLE : SPAN;
	const look = props.fit === "name" ? CODE_NAME : PROSE_CODESPAN;
	return props.runs.map((run, at) => {
		if (typeof run === "string") return run;
		if ("quoted" in run) return `“${run.quoted}”`;
		if ("code" in run)
			return (
				// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
				<code key={at} className={cn(look, span)}>
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
