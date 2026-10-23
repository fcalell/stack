import {
	type Datum,
	isSelection,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
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
	DIFF_HUNK,
	DIFF_MARK,
	diffLine,
} from "@fcalell/ui-core/variants";
import { useMemo } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { inertProps, Painted, PaintText } from "../../lib/paint";
import { FrameBody, FrameLine, useFrame } from "../../lib/read";
import { WordDiff } from "./word";

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
// line or by word.
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
			before: Datum<string>;
			after: Datum<string>;
	  });

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
// hang. The frame is a list named by `label`, the phone having no table. Given
// hunks by a selection it is a frame of them: the failed form with Retry, the
// missing form and the empty form stand in its box with the generic sentence,
// and the stale and paused line over it while it holds its read.
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
		<View {...inertProps(true)} className={cn(CARD, FRAME)}>
			<View className={diffLine({ kind: "header" })}>
				<PaintText
					fills="phrase"
					painted
					className={cn(diffLine({ kind: "header" }), DIFF_HUNK)}
				>
					<Painted role="phrase" />
				</PaintText>
			</View>
			{Array.from({ length: PAINT_ROWS }, (_, at) => (
				<View
					// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
					key={at}
					className={cn(diffLine({ kind: "context" }), ROW)}
				>
					<Gutters numbers={BOTH} />
					<PaintText
						painted
						className={cn(diffLine({ kind: "context" }), DIFF_CODE, CODE)}
					>
						<Painted role="sentence" at={at} />
					</PaintText>
				</View>
			))}
		</View>
	) : (
		<View
			accessibilityRole="list"
			accessibilityLabel={label}
			className={cn(CARD, FRAME)}
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
	return (
		<FrameBody frame={frame} fit="frame">
			<FrameLine frame={frame} />
			{body}
		</FrameBody>
	);
}

// A diff of hunks, or of two texts by line or by word.
export function Diff(props: DiffProps) {
	return props.by === "word" ? (
		<WordDiff label={props.label} before={props.before} after={props.after} />
	) : (
		<LineDiff {...props} />
	);
}
