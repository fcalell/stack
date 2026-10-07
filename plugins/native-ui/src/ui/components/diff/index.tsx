import type { DiffLine, Hunk } from "@fcalell/ui-core/descriptors";
import {
	CONTENT_FRAME,
	DIFF_CODE,
	DIFF_GUTTER,
	DIFF_HUNK,
	DIFF_MARK,
	diffLine,
	skeleton,
} from "@fcalell/ui-core/variants";
import { structuredPatch } from "diff";
import { useMemo } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { Strut } from "../../lib/strut";

const FRAME = "min-w-0 overflow-hidden";
// A line's cells stand from its top, the numbers on its first line.
const ROW = "flex-row items-start";
const GUTTER = "text-right";
const CODE = "flex-1 min-w-0";
// A line of the code role: a zero-width strut sets its height, the bar
// centred on it.
const LINE = "flex-row items-center";
const BAR_LINE = "flex-1 flex-row items-center";
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
	context: " ",
	added: "+",
	removed: "−",
};

interface DiffBase extends Closed {
	// What the diff shows (the file's path), the name of its lines.
	label: string;
	// The lines wait: the hunk header's bar and eight lines' bars stand in for
	// them, a fixed count, since the lines are unknown before the data.
	loading?: boolean;
}

// A unified diff, as hunks, or as the two texts it compares, diffed here by
// line.
export type DiffProps =
	| (DiffBase & { hunks: readonly Hunk[]; before?: never; after?: never })
	| (DiffBase & { hunks?: never; before: string; after: string });

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
export function Diff({ label, hunks, before, after, loading }: DiffProps) {
	// The hunks derive once per text pair, and not while the diff waits.
	const shown = useMemo(
		() => hunks ?? (loading ? [] : lineHunks(before ?? "", after ?? "")),
		[hunks, before, after, loading],
	);
	const numbers = numbersOf(shown);
	if (loading)
		return (
			<View
				accessibilityState={{ busy: true }}
				className={cn(CONTENT_FRAME, FRAME)}
			>
				<View className={diffLine({ kind: "header" })}>
					<View className={cn(DIFF_HUNK, LINE)}>
						<Strut role="code" />
						<View className={cn(skeleton({ kind: "line" }), HEADER_BAR)} />
					</View>
				</View>
				{BARS.map((width, index) => (
					<View
						// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
						key={index}
						className={cn(diffLine({ kind: "context" }), ROW)}
					>
						<Gutters numbers={BOTH} />
						<View className={cn(DIFF_CODE, BAR_LINE)}>
							<Strut role="code" />
							<View className={cn(skeleton({ kind: "line" }), width)} />
						</View>
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
