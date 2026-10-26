import {
	type Datum,
	isSelection,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import type { DiffLine, Hunk } from "@fcalell/ui-core/descriptors";
import {
	BOTH,
	type Elision,
	elidedBefore,
	hunkContext,
	hunkKey,
	indented,
	lineHunks,
	lineKey,
	type Numbers,
	numbersAt,
	numbersOf,
	tokenParts,
} from "@fcalell/ui-core/line-diff";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import { counted } from "@fcalell/ui-core/tokens";
import {
	CARD,
	DIFF_CODE,
	DIFF_GUTTER,
	DIFF_HUNK,
	DIFF_MARK,
	diffLine,
} from "@fcalell/ui-core/variants";
import { Fragment, useMemo } from "react";
import { Text as RNText, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { inertProps, Painted, PaintText } from "../../lib/paint";
import { FrameBody, FrameLine, useFrame } from "../../lib/read";
import { useWords } from "../../lib/words";
import { WordDiff } from "./word";

const FRAME = "min-w-0 overflow-hidden";
// A line's cells stand from its top, the numbers on its first line.
const ROW = "flex-row items-start";
const GUTTER = "text-right";
const CODE = "flex-1 min-w-0";
// A line stands its indent and then the rest beside it (`indented`), so a
// wrapped line stands under itself at its own indent, never left of the key
// it continues.
const LINE = "flex-1 min-w-0 flex-row";
const INDENT = "shrink-0";
// The elided band's words (how many lines go unshown, then the enclosing
// function) stand on one line.
const CONTEXT = "flex-1 min-w-0";
// The mark of lines a diff does not show, in the marker's column: a broken
// rule, a glyph no act wears.
const ELIDED = "\u2506";
// A break opportunity between tokens: React Native has no <wbr>, so a line
// takes a zero-width space where it may break, never mid-token.
const BREAK = "\u200b";
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

// A line's code: its indent, then the rest beside it with a break
// opportunity between tokens. A Text inherits nothing, so each takes the
// line's role and ink.
function Code(props: { kind: DiffLine["kind"]; text: string }) {
	const kind = diffLine({ kind: props.kind });
	const { indent, rest } = indented(props.text);
	return (
		<View className={cn(DIFF_CODE, LINE)}>
			{indent === "" ? null : (
				<RNText className={cn(kind, INDENT)}>{indent}</RNText>
			)}
			<RNText className={cn(kind, CODE)}>{tokenParts(rest).join(BREAK)}</RNText>
		</View>
	);
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
	const kind = diffLine({ kind: "elided" });
	const said =
		elision.lines === undefined
			? words.linesUnshown
			: counted(words.unshownLines, elision.lines);
	return (
		<View className={cn(kind, ROW)}>
			{numbers.before ? <RNText className={cn(kind, DIFF_GUTTER)} /> : null}
			{numbers.after ? <RNText className={cn(kind, DIFF_GUTTER)} /> : null}
			<RNText
				importantForAccessibility="no"
				accessibilityElementsHidden
				className={cn(kind, DIFF_MARK, DIFF_HUNK)}
			>
				{ELIDED}
			</RNText>
			<RNText
				numberOfLines={1}
				className={cn(kind, DIFF_CODE, DIFF_HUNK, CONTEXT)}
			>
				{context === undefined ? said : `${said} · ${context}`}
			</RNText>
		</View>
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

// A unified diff at the code role in the frame Code shares: its lines, added
// on ok-soft and removed on danger-soft, the whole row, each with its line
// numbers (the old and the new, or the one side a diff that only adds or only
// removes has) and its `+` or `−` marker. No hunk header's ranges are drawn:
// where lines go unshown (before a first hunk that starts past line 1, between
// two hunks) an elided band stands on the group ground, its mark (`┆`) in the
// marker's column and in the code's the words that say so ("12 lines not
// shown" where the numbers count them, else "Lines not shown"), then the
// function git names after the ranges, a middle dot apart. The phone draws
// one number column, the new side or the only one (`numbersAt`). A long
// line wraps at its spaces and between tokens, under itself at its own
// indent: React Native has no text indent, so a wrapped line hangs no further. The frame is a list named by `label`, the phone having no table. Given
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
	const numbers = numbersAt(numbersOf(shown), true);
	const body = painted ? (
		<View {...inertProps(true)} className={cn(CARD, FRAME)}>
			{Array.from({ length: PAINT_ROWS }, (_, at) => (
				<View
					// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
					key={at}
					className={cn(diffLine({ kind: "context" }), ROW)}
				>
					<Gutters numbers={numbersAt(BOTH, true)} />
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
			{shown.map((hunk, at) => (
				<Fragment key={hunkKey(hunk, at)}>
					<ElidedBefore hunks={shown} at={at} numbers={numbers} />
					{hunk.lines.map((line) => (
						<View
							key={lineKey(line)}
							className={cn(diffLine({ kind: line.kind }), ROW)}
						>
							<Gutters line={line} numbers={numbers} />
							<Code kind={line.kind} text={line.text} />
						</View>
					))}
				</Fragment>
			))}
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
