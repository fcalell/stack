import { cn } from "@fcalell/ui-core/cn";
import type { Runs } from "@fcalell/ui-core/descriptors";
import { valueCut } from "@fcalell/ui-core/list-state";
import {
	CODE_NAME,
	PROSE_CODESPAN,
	textStrong,
} from "@fcalell/ui-core/variants";
import { Fragment, type ReactNode } from "react";
import { boundPieces } from "./bound.ts";

// A whole value of code in the room its box leaves: the stem truncates to it
// and the tail stands whole (`valueCut`).
const CUT = "flex min-w-0";
const STEM = "min-w-0 truncate";
const TAIL = "shrink-0";
// A code run in a line of text is one box (drawn or bare): it moves whole to
// the next line and is cut with an ellipsis only where it alone is wider than
// the line, never broken inside its word. In a text read whole (a row's `wrap`,
// a field's error) it is cut nowhere: it moves whole to the next line as a word
// does, and one wider than the line wraps at its path or URL separators
// (`CodeWhole`), breaking inside a segment only where that segment alone is
// wider than the line. A bare run (a name) flows as text there; a boxed one is
// an atom (`ATOM`), so its box is one box, never drawn again on each line.
const SPAN = "inline-block max-w-full align-bottom truncate";
const SPAN_WHOLE = "wrap-anywhere box-decoration-clone";
// Where a whole value of code may break before it breaks anywhere: after a run
// of a path's or a URL's separators (a slash, the query signs `?`, `&`, `=`
// and the fragment's `#`), which only a long path or URL carries, never inside
// a run of them (`../`, `://`) nor before a space, which breaks already. A
// name's dot, colon, underscore, hyphen, comma or semicolon offers none, so a
// short machine name in a sentence (`connection_timeout`) moves whole to the next
// line, as a word does, and breaks inside only where it alone is wider than
// the line.
const SEPARATED = /(?<=[/?&=#])(?=[^/?&=#\s])/;
// A hyphen that leads a word binds to the word after it: a flag (`--bg`) is one
// unbreakable piece, no wider than that word, and a line still breaks before
// it. A hyphen inside a word is the browser's own break, after the hyphen and
// never before it (`boundPieces`).
const PIECE = "whitespace-nowrap";

// An address (a word holding an `@`) breaks after its `@` and after each of its
// dots, so a name that wraps in a narrow row breaks between its parts
// (`reader.one@` / `example.com`), never inside one where its last letter would
// stand alone. A dot between digits or in a sentence's stop is no address's.
const ADDRESS = /\S*@\S*/g;
const PARTS = /(?<=[@.])(?=[^@.])/;

/** Text whose addresses carry a break opportunity after each `@` and dot (`<wbr>`, which adds no character to a copy or a selection); text with no address is returned as it is. Outside the package's exports. */
export function Soft({ text }: { text: string }): ReactNode {
	if (!text.includes("@")) return text;
	const out: ReactNode[] = [];
	let at = 0;
	for (const found of text.matchAll(ADDRESS)) {
		out.push(text.slice(at, found.index));
		found[0].split(PARTS).forEach((part, n) => {
			// biome-ignore lint/suspicious/noArrayIndexKey: a break is its place in the address
			if (n > 0) out.push(<wbr key={`${found.index}-${n}`} />);
			out.push(part);
		});
		at = found.index + found[0].length;
	}
	out.push(text.slice(at));
	return out;
}

/** A text whose leading hyphens bind to the word after them (`--bg` never breaks after its hyphens); a hyphen inside a word breaks after it, as a browser's does, and a line never starts on one. Adds no character to a copy or a selection. Outside the package's exports. */
export function CodeBound(props: { code: string; wraps?: boolean }) {
	return boundPieces(props.code).map((part, at) =>
		at % 2 === 1 ? (
			// biome-ignore lint/suspicious/noArrayIndexKey: a piece is its position
			<span key={at} className={PIECE}>
				{part}
			</span>
		) : props.wraps ? (
			// biome-ignore lint/suspicious/noArrayIndexKey: a piece is its position
			<Soft key={at} text={part} />
		) : (
			part
		),
	);
}

/** A whole value of code with a break opportunity after each run of its path and URL separators (`<wbr>`, which adds no character to a copy or a selection), so a path or a URL wider than its line breaks between segments and a short name moves whole; its box's `wrap-anywhere` breaks inside a segment only where that segment alone is wider than the line, never before a hyphen (`CodeBound`). Outside the package's exports. */
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

// A boxed code run in a sentence is one box, never two: it stands as an atom
// on its line (`inline-block`), moving whole to the next line while it fits and
// wrapping inside its own box only where it alone is wider than the line, at
// its path's or URL's separators (`CodeWhole`). Prose's inline code stands the
// same way.
const ATOM = "inline-block max-w-full";
const ATOM_WHOLE = "wrap-anywhere";
// Punctuation that opens or closes around a run (`(`, `)`, `.`) stays with it:
// the run and its marks are one atom whose marks take their own width, the
// opening one at the run's first line, the closing one at its last, so a long
// run never leaves a bracket alone on the line above or below. Only marks that
// touch the run: a space parts them.
const OPENS = /[([{“‘«]$/;
const CLOSES = /^[)\]}”’».,;:!?]+(?=\s|$)/;
const MARK = "shrink-0";
const MARK_LAST = "shrink-0 self-baseline-last";
const GLUED = "inline-flex max-w-full items-baseline";
const FLEX_CODE = "min-w-0";

/** Runs as one text: words, a `{ quoted }` run in typographic quotes, a `{ strong }` run at strong weight in the meta role, a `{ code }` run in the mono, which never cuts in its middle: boxed in the inline code style inside a sentence (`fit` `span`, the default), bare where the runs are a name, a crumb or a row's line (`fit` `name`, voice 7); `whole` (a text read whole) wraps a code run inside its one box at its separators (`CodeWhole`) instead of cutting it at its end, and the brackets and the stop that touch a boxed run stay on its line with it. Outside the package's exports. */
export function RunText(props: {
	runs: Runs;
	whole?: boolean;
	fit?: "span" | "name";
	/** A flag in the words keeps its leading hyphens bound (`CodeBound`), and a hyphenated word breaks after a hyphen, never before one, so a title that wraps never starts a line on a hyphen. */
	bound?: boolean;
	/** A string in the words carries a break opportunity after each `@` and dot of an address (`Soft`): for a text that wraps (a title, a name); a text a bar or a badge truncates passes none, so its own cut takes it at its end. */
	wraps?: boolean;
}) {
	const { runs, whole, bound, wraps } = props;
	const boxed = props.fit !== "name";
	const look = boxed ? PROSE_CODESPAN : CODE_NAME;
	// A boxed run is an atom of its line; a bare one flows as text.
	const span = boxed
		? whole
			? cn(ATOM, ATOM_WHOLE)
			: SPAN
		: whole
			? SPAN_WHOLE
			: SPAN;
	// The marks a boxed run takes from the strings around it.
	const marks = runs.map((run, at) => {
		const before = runs[at - 1];
		const after = runs[at + 1];
		if (!boxed || typeof run === "string" || !("code" in run))
			return { open: "", close: "" };
		return {
			open: (typeof before === "string" && OPENS.exec(before)?.[0]) || "",
			close: (typeof after === "string" && CLOSES.exec(after)?.[0]) || "",
		};
	});
	return runs.map((run, at) => {
		if (typeof run === "string") {
			// The marks the code run before it and after it took are theirs.
			const cut = marks[at - 1]?.close.length ?? 0;
			const end = run.length - (marks[at + 1]?.open.length ?? 0);
			const kept = run.slice(cut, end);
			if (bound)
				return (
					// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
					<Fragment key={at}>
						<CodeBound code={kept} wraps={wraps} />
					</Fragment>
				);
			// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
			return wraps ? <Soft key={at} text={kept} /> : kept;
		}
		if ("quoted" in run) return `“${run.quoted}”`;
		if ("code" in run) {
			const { open, close } = marks[at] ?? { open: "", close: "" };
			const text = whole ? <CodeWhole code={run.code} /> : run.code;
			if (!open && !close)
				return (
					// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
					<code key={at} className={cn(look, span)}>
						{text}
					</code>
				);
			return (
				// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
				<span key={at} className={GLUED}>
					{open ? <span className={MARK}>{open}</span> : null}
					<code className={cn(look, span, FLEX_CODE)}>{text}</code>
					{close ? <span className={MARK_LAST}>{close}</span> : null}
				</span>
			);
		}
		return (
			// biome-ignore lint/suspicious/noArrayIndexKey: a run is its position
			<span key={at} className={textStrong({ role: "meta" })}>
				{run.strong}
			</span>
		);
	});
}
