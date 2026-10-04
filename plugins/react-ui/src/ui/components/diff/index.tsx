import { cn } from "@fcalell/ui-core/cn";
import type { DiffLine, Hunk } from "@fcalell/ui-core/descriptors";
import {
	CONTENT_FRAME,
	DIFF_CODE,
	DIFF_GUTTER,
	DIFF_HANG,
	DIFF_HUNK,
	DIFF_MARK,
	diffLine,
	skeleton,
} from "@fcalell/ui-core/variants";
import { structuredPatch } from "diff";
import { useMemo } from "react";
import type { Closed } from "../../lib/closed.ts";

const FRAME = "flex flex-col min-w-0 overflow-hidden";
const TABLE = "w-full border-collapse";
// A wrapped line hangs one inset under its first visual line, which the
// negative indent pulls back to the cell's start.
const HANG = "-indent-control-x whitespace-pre-wrap wrap-anywhere";
const GUTTER = "text-end align-top";
const MARK = "align-top";
const CODE = "w-full align-top";
const LINE = "flex items-center h-lh";
// The loading form: the hunk header's bar, then each line's bar at the
// length of the line it stands in for.
const HEADER_BAR = "w-1/3";
const BARS = [
	"w-1/2",
	"w-1/3",
	"w-2/3",
	"w-1/2",
	"w-3/4",
	"w-1/4",
	"w-2/3",
	"w-1/2",
] as const;
// The marker a line's kind reads by without its ground's hue.
const MARKS: Record<DiffLine["kind"], string> = {
	context: " ",
	added: "+",
	removed: "−",
};

interface DiffBase extends Closed {
	/** What the diff shows (the file's path), its table's accessible name. */
	label: string;
	/** The lines wait: the hunk header's bar and eight lines' bars stand in for them, a fixed count, since the lines are unknown before the data. */
	loading?: boolean;
}

/** A unified diff, as hunks, or as the two texts it compares, diffed here by line. */
export type DiffProps =
	| (DiffBase & {
			/** The hunks, each a header over its lines. */
			hunks: readonly Hunk[];
			before?: never;
			after?: never;
	  })
	| (DiffBase & {
			hunks?: never;
			/** The text before the change. */
			before: string;
			/** The text after it. */
			after: string;
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

function Gutters(props: { line?: DiffLine }) {
	return (
		<>
			<td className={cn(DIFF_GUTTER, GUTTER)}>{props.line?.before}</td>
			<td className={cn(DIFF_GUTTER, GUTTER)}>{props.line?.after}</td>
			<td className={cn(DIFF_MARK, MARK)}>
				{MARKS[props.line?.kind ?? "context"]}
			</td>
		</>
	);
}

/** A unified diff at the code role in the frame Code shares: each hunk's header on the group ground in the meta ink, then its lines, added on ok-soft and removed on danger-soft, the whole row, each with its two line numbers and its `+` or `−` marker. A long line wraps under itself at every width, hung one inset, its numbers on its first line. */
export function Diff({ label, hunks, before, after, loading }: DiffProps) {
	// The hunks derive once per text pair, and not while the diff waits.
	const shown = useMemo(
		() => hunks ?? (loading ? [] : lineHunks(before ?? "", after ?? "")),
		[hunks, before, after, loading],
	);
	if (loading)
		return (
			<div aria-busy className={cn(CONTENT_FRAME, FRAME)}>
				<table className={TABLE}>
					<tbody>
						<tr className={diffLine({ kind: "header" })}>
							<td colSpan={4} className={DIFF_HUNK}>
								<span className={LINE}>
									<span
										className={cn(skeleton({ kind: "line" }), HEADER_BAR)}
									/>
								</span>
							</td>
						</tr>
						{BARS.map((width, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
							<tr key={index} className={diffLine({ kind: "context" })}>
								<Gutters />
								<td className={cn(DIFF_CODE, CODE)}>
									<span className={LINE}>
										<span className={cn(skeleton({ kind: "line" }), width)} />
									</span>
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
							<td colSpan={4} className={DIFF_HUNK}>
								<div className={cn(DIFF_HANG, HANG)}>{hunk.header}</div>
							</td>
						</tr>,
						...hunk.lines.map((line) => (
							<tr
								key={`${hunkKey(hunk)}/${lineKey(line)}`}
								className={diffLine({ kind: line.kind })}
							>
								<Gutters line={line} />
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
