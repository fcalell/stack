import type { Run, Runs } from "@fcalell/ui-core/descriptors";
import type { ReactNode } from "react";
import { Text as RNText, View } from "react-native";
import { cn } from "./cn";
import { RunText } from "./code";
import { tokenPx } from "./frame";
import { useCSSVariable } from "./theme";

// A quoted part in a `meta` line is cut at 40 characters; in a title it wraps
// to two lines instead, so a title passes no cut.
export const META_CUT = 40;

const several = (part: Run | Runs): part is Runs => Array.isArray(part);

/** A part as runs: one run alone is a run of one. */
export const runsOf = (part: Run | Runs): Runs =>
	several(part) ? part : [part];

/** Whether a part is one `{ code }` run, which a row cuts in its middle. */
export function isCode(part: Run | Runs): part is { code: string } {
	return typeof part === "object" && "code" in part;
}

function runText(run: Run, cut?: number): string {
	if (typeof run === "string") return run;
	if ("quoted" in run) {
		const inner =
			cut !== undefined && run.quoted.length > cut
				? `${run.quoted.slice(0, cut - 1)}…`
				: run.quoted;
		return `“${inner}”`;
	}
	if ("code" in run) return run.code;
	return run.strong;
}

export function partText(part: Run | Runs, cut?: number): string {
	if (several(part)) return part.map((run) => runText(run, cut)).join("");
	return runText(part, cut);
}

/** A part as runs ready to draw: a `{ quoted }` run as its quoted text, cut at `cut`, the other kinds as they are. */
export function partRuns(part: Run | Runs, cut?: number): Runs {
	return runsOf(part).map((run) =>
		typeof run === "object" && "quoted" in run ? runText(run, cut) : run,
	);
}

// A loaded part with no text (an empty string, an empty quote, span of code or
// strong run) says nothing, so a line drops it before it joins: a separator
// beside it would dangle.
export function filled(part: Run): boolean {
	return partText(part) !== "";
}

// A middle dot bound to the word on each side by a no-break space, so a line
// never breaks at it: a line that breaks between two parts shows no separator
// at either end. A row's trailing value (an age, a count) joins its line by
// it, and so do the parts of one text (`flowRuns`).
export const META_TAIL = "\u00A0·\u00A0";

// A meta line's parts, each as the runs it draws: an empty part dropped, a
// `{ quoted }` run as its quoted text cut at `cut`, and a string's own ` · `
// parting it into parts of its own, so every separator on the line is the
// line's own, which no line break leaves at a line's end or start.
export function metaParts(parts: Runs, cut?: number): Runs[] {
	return parts.filter(filled).flatMap((part) =>
		typeof part === "string"
			? part
					.split(" · ")
					.filter((piece) => piece !== "")
					.map((piece) => [piece])
			: [partRuns(part, cut)],
	);
}

// Parts as the runs of one text a middle dot apart (`flow`), the dot bound to
// the words beside it (`META_TAIL`): the text breaks only between a part's
// words, never at a dot, for a text cut at its first or second line or set to
// its end, where a part that wraps whole would leave a line short.
export function flowRuns(parts: readonly Runs[]): Run[] {
	return parts.flatMap((runs, at) => (at === 0 ? runs : [META_TAIL, ...runs]));
}

// Parts that each wrap whole (`items`): each part after the first, or every
// part after the line's other items (`led`, a row's marks), is led by its
// middle dot in a box a gap and a half wide, pulled into the gap before it by
// a negative start margin as wide as that box; the line (`PARTS_LINE`, its
// column gap the same box, `usePartsGap`) clips its edges, so the dot of a
// part that starts a line stands past the line's start and is clipped away. A
// part longer than the line wraps by its words beside its dot, its later lines
// under its first word.
export const PARTS_LINE = "flex-row flex-wrap min-w-0 overflow-hidden";
const PART = "flex-row shrink min-w-0";
const PART_TEXT = "shrink";
const SEPARATOR = "text-center";

/** The width of a parts line's separator box, which is its column gap: a gap and a half. Outside the package's exports. */
export function usePartsGap(): number {
	return tokenPx(useCSSVariable("--spacing-gap")) * 1.5;
}

/** One item of a `PARTS_LINE` whose column gap is `gap` (`usePartsGap`): its text, led by its middle dot where `led`, pulled into the gap before it. `className` is the dot's text role. Outside the package's exports. */
export function PartItem(props: {
	gap: number;
	led: boolean;
	className?: string;
	children: ReactNode;
}) {
	const { gap, led, className, children } = props;
	return (
		<View
			pointerEvents="none"
			style={led ? { marginStart: -gap } : undefined}
			className={PART}
		>
			{led ? (
				<RNText
					importantForAccessibility="no"
					accessibilityElementsHidden
					style={{ width: gap }}
					className={cn(className, SEPARATOR)}
				>
					·
				</RNText>
			) : null}
			{children}
		</View>
	);
}

/** Parts that each wrap whole, a middle dot apart, as the items of a `PARTS_LINE` whose column gap is `gap` (`usePartsGap`); `led` gives the first part its dot too, after the line's other items. `className` is each part's text role. Outside the package's exports. */
export function PartItems(props: {
	parts: readonly Runs[];
	gap: number;
	led?: boolean;
	className?: string;
}) {
	const { parts, gap, led = false, className } = props;
	return parts.map((runs, at) => (
		<PartItem
			// biome-ignore lint/suspicious/noArrayIndexKey: the parts are one line, in order; a part is its position
			key={at}
			gap={gap}
			led={led || at > 0}
			className={className}
		>
			<RNText className={cn(className, PART_TEXT)}>
				<RunText runs={runs} fit="name" />
			</RNText>
		</PartItem>
	));
}
