import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import type { DiffLine, Hunk } from "@fcalell/ui-core/descriptors";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import {
	CONTENT_FRAME,
	DIFF_CODE,
	DIFF_GUTTER,
	DIFF_HUNK,
	DIFF_MARK,
	diffLine,
} from "@fcalell/ui-core/variants";
import { structuredPatch } from "diff";
import { useMemo } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { inertProps, Painted } from "../../lib/paint";

const FRAME = "min-w-0 overflow-hidden";
// A line's cells stand from its top, the numbers on its first line.
const ROW = "flex-row items-start";
const GUTTER = "text-right";
const CODE = "flex-1 min-w-0";
// The marker a line's kind reads by without its ground's hue.
const MARKS: Record<DiffLine["kind"], string> = {
	context: " ",
	added: "+",
	removed: "−",
};

interface DiffBase extends Closed {
	/** What the diff shows (the file's path), the name of its lines (a short phrase; read aloud, never drawn). */
	label: string;
}

// A unified diff, as hunks, or as the two texts it compares, diffed here by
// line.
export type DiffProps =
	| (DiffBase & {
			/** The hunks, each a header over its lines. A selection paints a hunk header over `PAINT_ROWS` lines until its read lands. */
			hunks: Datum<readonly Hunk[]>;
			before?: never;
			after?: never;
	  })
	| (DiffBase & {
			hunks?: never;
			before: Datum<string>;
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
		indent.replaceAll(" ", " ").replaceAll("\t", "  "),
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

// The number columns and the marker. A Text inherits nothing from the row it
// stands in, so each cell takes the line's role and ink.
function Gutters(props: { line?: DiffLine; numbers: Numbers }) {
	const { line, numbers } = props;
	const kind = diffLine({ kind: line?.kind ?? "context" });
	return (
		<>
			{numbers.before ? (
				<RNText className={cn(kind, DIFF_GUTTER, GUTTER)}>
					{line?.before}
				</RNText>
			) : null}
			{numbers.after ? (
				<RNText className={cn(kind, DIFF_GUTTER, GUTTER)}>{line?.after}</RNText>
			) : null}
			<RNText className={cn(kind, DIFF_MARK)}>
				{MARKS[line?.kind ?? "context"]}
			</RNText>
		</>
	);
}

// A unified diff at the code role in the frame Code shares: each hunk's
// header on the group ground in the meta ink, then its lines, added on
// ok-soft and removed on danger-soft, the whole row, each with its line
// numbers (the old and the new, or the one side a diff that only adds or only
// removes has) and its `+` or `−` marker. A long line wraps under itself at the
// line's start: React Native has no text indent, so a wrapped line does not
// hang. The frame is a list named by `label`, the phone having no table.
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
			<View {...inertProps(true)} className={cn(CONTENT_FRAME, FRAME)}>
				<View className={diffLine({ kind: "header" })}>
					<RNText className={cn(diffLine({ kind: "header" }), DIFF_HUNK)}>
						<Painted role="phrase" />
					</RNText>
				</View>
				{Array.from({ length: PAINT_ROWS }, (_, at) => (
					<View
						// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
						key={at}
						className={cn(diffLine({ kind: "context" }), ROW)}
					>
						<Gutters numbers={BOTH} />
						<RNText
							className={cn(diffLine({ kind: "context" }), DIFF_CODE, CODE)}
						>
							<Painted role="sentence" at={at} />
						</RNText>
					</View>
				))}
			</View>
		);
	return (
		<View
			accessibilityRole="list"
			accessibilityLabel={label}
			className={cn(CONTENT_FRAME, FRAME)}
		>
			{shown.map((hunk) => [
				<View key={hunkKey(hunk)} className={diffLine({ kind: "header" })}>
					<RNText className={cn(diffLine({ kind: "header" }), DIFF_HUNK)}>
						{hunk.header}
					</RNText>
				</View>,
				...hunk.lines.map((line) => (
					<View
						key={`${hunkKey(hunk)}/${lineKey(line)}`}
						className={cn(diffLine({ kind: line.kind }), ROW)}
					>
						<Gutters line={line} numbers={numbers} />
						<RNText
							className={cn(diffLine({ kind: line.kind }), DIFF_CODE, CODE)}
						>
							{held(line.text)}
						</RNText>
					</View>
				)),
			])}
		</View>
	);
}
