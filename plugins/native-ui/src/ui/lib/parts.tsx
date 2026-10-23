import type { Run, Runs } from "@fcalell/ui-core/descriptors";

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

// Parts joined by a middle dot, a span of code or a strong run its own run.
export function joinParts(parts: Runs, cut?: number): Run[] {
	return parts
		.filter(filled)
		.flatMap((part, at) => [
			...(at === 0 ? [] : [" · "]),
			...partRuns(part, cut),
		]);
}

// A middle dot bound to the word before it by a no-break space, the line
// breaking after it.
const DOT = "\u00A0· ";

// Parts as the runs of one text with a middle dot between them, a span of
// code or a strong run its own run so it draws in its style. The dot is bound
// to the part before it, so a wrapped line never starts on a dot, a part's own
// ` · ` included.
export function metaRuns(parts: Runs, cut?: number): Run[] {
	const runs: Run[] = [];
	parts.forEach((part, at) => {
		const sep = at === 0 ? "" : DOT;
		if (typeof part === "object" && ("code" in part || "strong" in part))
			runs.push(sep, part);
		else runs.push(`${sep}${partText(part, cut).replaceAll(" · ", DOT)}`);
	});
	return runs;
}
