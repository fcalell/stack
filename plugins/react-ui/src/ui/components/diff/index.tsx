import {
	type Datum,
	isSelection,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { DiffLine, Hunk } from "@fcalell/ui-core/descriptors";
import {
	BOTH,
	type Elision,
	elidedBefore,
	held,
	hunkContext,
	hunkKey,
	lineHunks,
	lineKey,
	type Numbers,
	numbersOf,
	tokenParts,
} from "@fcalell/ui-core/line-diff";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import { counted } from "@fcalell/ui-core/tokens";
import {
	CARD,
	DIFF_CODE,
	DIFF_GUTTER,
	DIFF_HANG,
	DIFF_HUNK,
	DIFF_MARK,
	diffLine,
} from "@fcalell/ui-core/variants";
import { Fragment, useMemo } from "react";
import type { Closed } from "../../lib/closed.ts";
import { Painted } from "../../lib/paint.tsx";
import { FrameBody, FrameLine, stillOf, useFrame } from "../../lib/read.tsx";
import { useWords } from "../../lib/words.tsx";
import { WordDiff } from "./word.tsx";

const FRAME = "flex flex-col shrink-0 min-w-0 overflow-hidden";
const TABLE = "w-full border-collapse";
// A wrapped line hangs one inset under its first visual line, which the
// negative indent pulls back to the cell's start. It wraps at its spaces and
// between tokens (`tokenParts`), so a name is never broken; only a run with no
// place to break that is wider than the line itself breaks inside it.
const HANG = "-indent-pad whitespace-pre-wrap";
// The elided band's words (how many lines go unshown, then the enclosing
// function) stand on one line.
const CONTEXT = "truncate";
// The mark of lines a diff does not show, in the marker's column: a broken
// rule, a glyph no act wears.
const ELIDED = "\u2506";
const GUTTER = "text-end align-top";
const MARK = "align-top";
const CODE = "w-full align-top";
// The marker a line's kind reads by without its ground's hue.
const MARKS: Record<DiffLine["kind"], string> = {
	context: " ",
	added: "+",
	removed: "−",
};

interface DiffBase extends Closed {
	/** What the diff shows (the file's path), its table's accessible name (a short phrase; read aloud, never drawn). */
	label: string;
}

/** A unified diff, as hunks, or as the two texts it compares, diffed here by line or by word. */
export type DiffProps =
	| (DiffBase & {
			/** The hunks, each its lines (a `header`'s ranges are never drawn: an elided mark parts two hunks, and stands before a first that starts past line 1, with the function git names after the ranges). A selection paints `PAINT_ROWS` lines until its read lands, and is the diff's own frame: it holds its read and draws the failed, missing and empty forms in its own box whatever stands above it. */
			hunks: Datum<readonly Hunk[]>;
			before?: never;
			after?: never;
			by?: never;
	  })
	| (DiffBase & {
			hunks?: never;
			/** How the two texts are compared: by line (the default), as a unified diff of code, or by word, as body text with its edit marked in place, a removed run struck through and an added run underlined dotted in the `ok` ink (a cue besides its ground's hue, never a link's line), in a card at the measure. */
			by?: "line" | "word";
			/** The text before the change (text; its lines wrap). */
			before: Datum<string>;
			/** The text after it (text; its lines wrap). */
			after: Datum<string>;
	  });

// Painted, a line's gutters are empty cells.
function Gutters(props: { line?: DiffLine; numbers: Numbers }) {
	return (
		<>
			{props.numbers.before ? (
				<td className={cn(DIFF_GUTTER, GUTTER)}>{props.line?.before}</td>
			) : null}
			{props.numbers.after ? (
				<td className={cn(DIFF_GUTTER, GUTTER)}>{props.line?.after}</td>
			) : null}
			<td className={cn(DIFF_MARK, MARK)}>
				{MARKS[props.line?.kind ?? "context"]}
			</td>
		</>
	);
}

// A line's code, its break opportunities between tokens.
function Code(props: { text: string }) {
	return tokenParts(held(props.text)).map((part, at) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: a part is its position in the line
		<Fragment key={at}>
			{at > 0 ? <wbr /> : null}
			{part}
		</Fragment>
	));
}

// Where lines go unshown: the marker's column holds the mark, the code's the
// words that say so (how many, where the numbers count them) and the function
// git names, a middle dot apart, on the group ground in the meta ink. The row
// is named by those words.
function Elided(props: {
	numbers: Numbers;
	elision: Elision;
	context: string | undefined;
}) {
	const { numbers, elision, context } = props;
	const words = useWords();
	const said =
		elision.lines === undefined
			? words.linesUnshown
			: counted(words.unshownLines, elision.lines);
	return (
		<tr className={diffLine({ kind: "elided" })}>
			{numbers.before ? <td className={DIFF_GUTTER} /> : null}
			{numbers.after ? <td className={DIFF_GUTTER} /> : null}
			<td aria-hidden className={cn(DIFF_MARK, DIFF_HUNK, MARK)}>
				{ELIDED}
			</td>
			<td className={cn(DIFF_CODE, DIFF_HUNK, CODE)}>
				<div className={CONTEXT}>
					{context === undefined ? said : `${said} · ${context}`}
				</div>
			</td>
		</tr>
	);
}

// The elided band before the hunk at `at`, where lines go unshown there.
function ElidedBefore(props: {
	hunks: readonly Hunk[];
	at: number;
	numbers: Numbers;
}) {
	const elision = elidedBefore(props.hunks, props.at);
	const hunk = props.hunks[props.at];
	if (elision === undefined || hunk === undefined) return null;
	return (
		<Elided
			numbers={props.numbers}
			elision={elision}
			context={hunkContext(hunk)}
		/>
	);
}

/** A unified diff at the code role in the frame Code shares: its lines, added on ok-soft and removed on danger-soft, the whole row, each with its line numbers (the old and the new, or the one side a diff that only adds or only removes has) and its `+` or `−` marker. No hunk header's ranges are drawn: where lines go unshown (before a first hunk that starts past line 1, between two hunks) an elided band stands on the group ground, its mark (`┆`) in the marker's column and in the code's the words that say so ("12 lines not shown" where the numbers count them, else "Lines not shown": `words.unshownLines`, `words.linesUnshown`), then the function git names after the ranges, a middle dot apart. A long line wraps under itself at every width, at its spaces and between tokens, hung one inset, its numbers on its first line. Given hunks by a selection it is a frame of them: the failed form with Retry, the missing form and the empty form stand in its box with the generic sentence, and the stale and paused line over it while it holds its read. */
function LineDiff({ label, hunks, before, after }: DiffProps) {
	const [h, b, a] = useSelections([hunks, before, after] as const);
	// The hunks are the diff's frame: two texts are given plain or by a
	// frame above, and a diff of them is no read's empty.
	const frame = useFrame(isSelection(hunks) ? hunks : undefined);
	const painted = h.painted || b.painted || a.painted;
	// The hunks derive once per text pair, and not while the diff paints.
	const shown = useMemo(() => {
		if (painted) return [];
		const given = h.value as readonly Hunk[] | undefined;
		return given ?? lineHunks(b.value as string, a.value as string);
	}, [painted, h.value, b.value, a.value]);
	const numbers = numbersOf(shown);
	const body = painted ? (
		<div inert data-still={stillOf(frame)} className={cn(CARD, FRAME)}>
			<table className={TABLE}>
				<tbody>
					{Array.from({ length: PAINT_ROWS }, (_, at) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
						<tr key={at} className={diffLine({ kind: "context" })}>
							<Gutters numbers={BOTH} />
							<td className={cn(DIFF_CODE, DIFF_HANG, CODE, HANG)}>
								<Painted role="sentence" at={at} />
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	) : (
		<div className={cn(CARD, FRAME)}>
			<table aria-label={label} className={TABLE}>
				<tbody>
					{shown.map((hunk, at) => (
						<Fragment key={hunkKey(hunk, at)}>
							<ElidedBefore hunks={shown} at={at} numbers={numbers} />
							{hunk.lines.map((line) => (
								<tr
									key={lineKey(line)}
									className={diffLine({ kind: line.kind })}
								>
									<Gutters line={line} numbers={numbers} />
									<td className={cn(DIFF_CODE, DIFF_HANG, CODE, HANG)}>
										<Code text={line.text} />
									</td>
								</tr>
							))}
						</Fragment>
					))}
				</tbody>
			</table>
		</div>
	);
	return (
		<FrameBody frame={frame}>
			<FrameLine frame={frame} />
			{body}
		</FrameBody>
	);
}

/** A diff of hunks, or of two texts by line or by word. */
export function Diff(props: DiffProps) {
	return props.by === "word" ? (
		<WordDiff label={props.label} before={props.before} after={props.after} />
	) : (
		<LineDiff {...props} />
	);
}
