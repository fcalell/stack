// The line diff of two texts and the numbers a `Diff` draws from its hunks, free of any framework: both platforms' `Diff` draw from it.

import { structuredPatch } from "diff";
import type { DiffLine, Hunk } from "./descriptors.ts";

// The unified line diff of two texts as the hunks a `Diff` draws, three lines
// of context around each change, as git shows them.
export function lineHunks(before: string, after: string): Hunk[] {
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
export function held(text: string): string {
	return text.replace(/^[ \t]+/, (indent) =>
		indent.replaceAll(" ", "\u00a0").replaceAll("\t", "\u00a0\u00a0"),
	);
}

// A hunk is keyed by its header and its first line numbers, which no two
// hunks of one diff share.
export function hunkKey(hunk: Hunk): string {
	const first = hunk.lines[0];
	return `${hunk.header}:${first?.before ?? ""}:${first?.after ?? ""}`;
}

// A line is keyed by its numbers, which no two lines of one hunk share.
export function lineKey(line: DiffLine): string {
	return `${line.kind}:${line.before ?? ""}:${line.after ?? ""}`;
}

// The number columns a diff draws: a side's column stands when a line of the
// diff carries its number, so a diff that only adds or only removes draws one.
export interface Numbers {
	before: boolean;
	after: boolean;
}

export const BOTH: Numbers = { before: true, after: true };

export function numbersOf(hunks: readonly Hunk[]): Numbers {
	const lines = hunks.flatMap((hunk) => hunk.lines);
	return {
		before: lines.some((line) => line.before !== undefined),
		after: lines.some((line) => line.after !== undefined),
	};
}
