import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { DiffLine, Hunk } from "@fcalell/ui-core/descriptors";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import {
	CONTENT_FRAME,
	DIFF_CODE,
	DIFF_GUTTER,
	DIFF_HANG,
	DIFF_HUNK,
	DIFF_MARK,
	diffLine,
} from "@fcalell/ui-core/variants";
import { structuredPatch } from "diff";
import { useMemo } from "react";
import type { Closed } from "../../lib/closed.ts";
import { Painted } from "../../lib/paint.tsx";

const FRAME = "flex flex-col shrink-0 min-w-0 overflow-hidden";
const TABLE = "w-full border-collapse";
// A wrapped line hangs one inset under its first visual line, which the
// negative indent pulls back to the cell's start.
const HANG = "-indent-control-x whitespace-pre-wrap";
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

/** A unified diff, as hunks, or as the two texts it compares, diffed here by line. */
export type DiffProps =
	| (DiffBase & {
			/** The hunks, each a header over its lines. A selection paints a hunk header over `PAINT_ROWS` lines until its read lands. */
			hunks: Datum<readonly Hunk[]>;
			before?: never;
			after?: never;
	  })
	| (DiffBase & {
			hunks?: never;
			/** The text before the change (text; its lines wrap). */
			before: Datum<string>;
			/** The text after it (text; its lines wrap). */
			after: Datum<string>;
	  });

// The unified line diff of two texts as the hunks a `Diff` draws, three lines
// of context around each change, as git shows them.
function lineHunks(before: string, after: string): Hunk[] {
	const patch = structuredPatch("", "", before, after, undefined, undefined, {
		context: 3,
	});
	return patch.hunks.map((hunk) => {
		let old = hunk.oldStart;
		let next = hunk.newStart;
		const lines: DiffLine[] = [];
		for (const line of hunk.lines) {
			const text = line.slice(1);
			if (line.startsWith("+"))
				lines.push({ kind: "added", text, after: next++ });
			else if (line.startsWith("-"))
				lines.push({ kind: "removed", text, before: old++ });
			else if (line.startsWith(" "))
				lines.push({ kind: "context", text, before: old++, after: next++ });
			// A "\" line marks a missing final newline, which draws as nothing.
		}
		return {
			header: `@@ -${start(hunk.oldStart, hunk.oldLines)},${hunk.oldLines} +${start(hunk.newStart, hunk.newLines)},${hunk.newLines} @@`,
			lines,
		};
	});
}

// A side with no lines starts at 0 in the header, as git writes it.
function start(first: number, count: number): number {
	return count === 0 ? first - 1 : first;
}

// A line's indent in no-break spaces (a tab as two), so a wrapped line
// never breaks right after it.
function held(text: string): string {
	return text.replace(/^[ \t]+/, (indent) =>
		indent.replaceAll(" ", "\u00a0").replaceAll("\t", "\u00a0\u00a0"),
	);
}

// A hunk is keyed by its header and its first line numbers, which no two
// hunks of one diff share.
function hunkKey(hunk: Hunk): string {
	const first = hunk.lines[0];
	return `${hunk.header}:${first?.before ?? ""}:${first?.after ?? ""}`;
}

// A line is keyed by its numbers, which no two lines of one hunk share.
function lineKey(line: DiffLine): string {
	return `${line.kind}:${line.before ?? ""}:${line.after ?? ""}`;
}

// The number columns a diff draws: a side's column stands when a line of the
// diff carries its number, so a diff that only adds or only removes draws one.
interface Numbers {
	before: boolean;
	after: boolean;
}

const BOTH: Numbers = { before: true, after: true };

function numbersOf(hunks: readonly Hunk[]): Numbers {
	const lines = hunks.flatMap((hunk) => hunk.lines);
	return {
		before: lines.some((line) => line.before !== undefined),
		after: lines.some((line) => line.after !== undefined),
	};
}

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

/** A unified diff at the code role in the frame Code shares: each hunk's header on the group ground in the meta ink, then its lines, added on ok-soft and removed on danger-soft, the whole row, each with its line numbers (the old and the new, or the one side a diff that only adds or only removes has) and its `+` or `−` marker. A long line wraps under itself at every width, hung one inset, its numbers on its first line. */
export function Diff({ label, hunks, before, after }: DiffProps) {
	const [h, b, a] = useSelections([hunks, before, after] as const);
	const painted = h.painted || b.painted || a.painted;
	// The hunks derive once per text pair, and not while the diff paints.
	const shown = useMemo(() => {
		if (painted) return [];
		const given = h.value as readonly Hunk[] | undefined;
		return given ?? lineHunks(b.value as string, a.value as string);
	}, [painted, h.value, b.value, a.value]);
	const numbers = numbersOf(shown);
	if (painted)
		return (
			<div inert className={cn(CONTENT_FRAME, FRAME)}>
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
		);
	return (
		<div className={cn(CONTENT_FRAME, FRAME)}>
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
}
