import type { DiffLine, Hunk } from "@fcalell/ui-core/descriptors";
import { structuredPatch } from "diff";

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
			header: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
			lines,
		};
	});
}
