import type { Run, Runs } from "@fcalell/ui-core/descriptors";

// A quoted part in a meta line is cut at 40 characters; a title wraps whole.
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

// A row's trailing value (an age, a count) joins the meta line as one more
// part, but a short one: its dot binds to the word before it and to the value
// after it, so the value wraps with that word and a line never starts or ends
// on the dot (a dot the line could break at would leave a short value alone on
// a line of its own).
export const META_TAIL = "\u00A0·\u00A0";

// A meta line's parts, each as the runs it draws: an empty part dropped, a
// `{ quoted }` run as its quoted text cut at `cut`, and a string's own ` · `
// parting it into parts of its own, so every separator on the line is the
// line's own (`PartsLine`), which no line break leaves at a line's end or start.
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
