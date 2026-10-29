import { cn } from "@fcalell/ui-core/cn";
import type { Runs } from "@fcalell/ui-core/descriptors";
import { valueCut } from "@fcalell/ui-core/list-state";
import {
	CODE_NAME,
	PROSE_CODESPAN,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Fragment } from "react";

// A whole value of code in the room its box leaves: the stem truncates to it
// and the tail stands whole (`valueCut`).
const CUT = "flex min-w-0";
const STEM = "min-w-0 truncate";
const TAIL = "shrink-0";
// A code run in a line of text is one box (drawn or bare): it moves whole to
// the next line and is cut with an ellipsis only where it alone is wider than
// the line, never broken inside its word. In a text read whole (a row's `wrap`,
// a field's error) it is cut nowhere: it moves whole to the next line as a word
// does, and one wider than the line wraps inside its box at its path or URL
// separators (`CodeWhole`), breaking inside a segment only where that segment
// alone is wider than the line, a drawn box drawn again on each line.
const SPAN = "inline-block max-w-full align-bottom truncate";
const SPAN_WHOLE = "wrap-anywhere box-decoration-clone";
// Where a whole value of code may break before it breaks anywhere: after a run
// of a path's or a URL's separators (a slash, the query signs `?`, `&`, `=`
// and the fragment's `#`), which only a long path or URL carries, never inside
// a run of them (`../`, `://`) nor before a space, which breaks already. A
// name's dot, colon, underscore, hyphen, comma or semicolon offers none, so a
// short machine name in a sentence (`carbon_monoxide`) moves whole to the next
// line, as a word does, and breaks inside only where it alone is wider than
// the line.
const SEPARATED = /(?<=[/?&=#])(?=[^/?&=#\s])/;
// A hyphen binds to the word after it: a browser breaks after a hyphen, which
// in code splits a flag (`--` / `bg`) or a hyphenated name into what reads as
// two words. Each hyphen run and the word it leads is one unbreakable piece,
// no wider than that word; a line still breaks before it.
const BOUND = /(-+[^\s-]+)/;
const PIECE = "whitespace-nowrap";

/** A text of code whose hyphens bind to the word after them (`--bg` never breaks after its hyphens); adds no character to a copy or a selection. Outside the package's exports. */
export function CodeBound(props: { code: string }) {
	return props.code.split(BOUND).map((part, at) =>
		at % 2 === 1 ? (
			// biome-ignore lint/suspicious/noArrayIndexKey: a piece is its position
			<span key={at} className={PIECE}>
				{part}
			</span>
		) : (
			part
		),
	);
}

/** A whole value of code with a break opportunity after each run of its path and URL separators (`<wbr>`, which adds no character to a copy or a selection), so a path or a URL wider than its line breaks between segments and a short name moves whole; its box's `wrap-anywhere` breaks inside a segment only where that segment alone is wider than the line, never after a hyphen (`CodeBound`). Outside the package's exports. */
export function CodeWhole(props: { code: string }) {
	return props.code.split(SEPARATED).map((part, at) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: a segment is its position
		<Fragment key={at}>
			{at > 0 ? <wbr /> : null}
			<CodeBound code={part} />
		</Fragment>
	));
}

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

/** Runs as one text: words, a `{ quoted }` run in typographic quotes, a `{ strong }` run at strong weight in the meta role, a `{ code }` run in the mono, which never cuts in its middle: boxed in the inline code style inside a sentence (`fit` `span`, the default), bare where the runs are a name, a crumb or a row's line (`fit` `name`, voice 7); `whole` (a text read whole) wraps a code run inside its box at its separators (`CodeWhole`) instead of cutting it at its end. Outside the package's exports. */
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
					{props.whole ? <CodeWhole code={run.code} /> : run.code}
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
