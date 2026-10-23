import {
	type Datum,
	isSelection,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { DiffLine, Hunk } from "@fcalell/ui-core/descriptors";
import {
	BOTH,
	held,
	hunkKey,
	lineHunks,
	lineKey,
	type Numbers,
	numbersOf,
} from "@fcalell/ui-core/line-diff";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import {
	CARD,
	DIFF_CODE,
	DIFF_GUTTER,
	DIFF_HANG,
	DIFF_HUNK,
	DIFF_MARK,
	diffLine,
} from "@fcalell/ui-core/variants";
import { useMemo } from "react";
import type { Closed } from "../../lib/closed.ts";
import { Painted } from "../../lib/paint.tsx";
import { FrameBody, FrameLine, stillOf, useFrame } from "../../lib/read.tsx";
import { WordDiff } from "./word.tsx";

const FRAME = "flex flex-col shrink-0 min-w-0 overflow-hidden";
const TABLE = "w-full border-collapse";
// A wrapped line hangs one inset under its first visual line, which the
// negative indent pulls back to the cell's start.
const HANG = "-indent-pad whitespace-pre-wrap";
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
			/** The hunks, each a header over its lines. A selection paints a hunk header over `PAINT_ROWS` lines until its read lands, and is the diff's own frame: it holds its read and draws the failed, missing and empty forms in its own box whatever stands above it. */
			hunks: Datum<readonly Hunk[]>;
			before?: never;
			after?: never;
			by?: never;
	  })
	| (DiffBase & {
			hunks?: never;
			/** How the two texts are compared: by line (the default), as a unified diff of code, or by word, as body text with its edit marked in place, a removed run struck through and an added run underlined, in a card at the measure. */
			by?: "line" | "word";
			/** The text before the change (text; its lines wrap). */
			before: Datum<string>;
			/** The text after it (text; its lines wrap). */
			after: Datum<string>;
	  });

// A hunk's header spans the number columns, the marker and the code.
function span(numbers: Numbers): number {
	return 2 + Number(numbers.before) + Number(numbers.after);
}

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

/** A unified diff at the code role in the frame Code shares: each hunk's header on the group ground in the meta ink, then its lines, added on ok-soft and removed on danger-soft, the whole row, each with its line numbers (the old and the new, or the one side a diff that only adds or only removes has) and its `+` or `−` marker. A long line wraps under itself at every width, hung one inset, its numbers on its first line. Given hunks by a selection it is a frame of them: the failed form with Retry, the missing form and the empty form stand in its box with the generic sentence, and the stale and paused line over it while it holds its read. */
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
					<tr className={diffLine({ kind: "header" })}>
						<td colSpan={span(BOTH)} className={DIFF_HUNK}>
							<div className={cn(DIFF_HANG, HANG)}>
								<Painted role="phrase" />
							</div>
						</td>
					</tr>
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
					{shown.map((hunk) => [
						<tr key={hunkKey(hunk)} className={diffLine({ kind: "header" })}>
							<td colSpan={span(numbers)} className={DIFF_HUNK}>
								<div className={cn(DIFF_HANG, HANG)}>{hunk.header}</div>
							</td>
						</tr>,
						...hunk.lines.map((line) => (
							<tr
								key={`${hunkKey(hunk)}/${lineKey(line)}`}
								className={diffLine({ kind: line.kind })}
							>
								<Gutters line={line} numbers={numbers} />
								<td className={cn(DIFF_CODE, DIFF_HANG, CODE, HANG)}>
									{held(line.text)}
								</td>
							</tr>
						)),
					])}
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
