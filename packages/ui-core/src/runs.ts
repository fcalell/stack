import type { Run, Runs } from "./descriptors.ts";

// The words of a part and a line of parts, free of any view: both UI plugins
// draw a title, a fact, an overline and a sentence from these, so a test holds
// the structure of what is drawn once. A `{ quoted }` run is whole here; a
// badge, an overline or a line cuts it by its own CSS or line count, and the
// text, the accessible name and the cut tooltip hold all of it.

const several = (part: Run | Runs): part is Runs => Array.isArray(part);

/** A part as runs: one run alone is a run of one. */
export const runsOf = (part: Run | Runs): Runs =>
	several(part) ? part : [part];

/** Whether a part is one `{ code }` run, which a row cuts in its middle. */
export function isCode(part: Run | Runs): part is { code: string } {
	return typeof part === "object" && "code" in part;
}

function runText(run: Run): string {
	if (typeof run === "string") return run;
	if ("quoted" in run) return `“${run.quoted}”`;
	if ("code" in run) return run.code;
	return run.strong;
}

/** A part's text: its runs joined, a `{ quoted }` run in typographic quotes, whole. */
export function partText(part: Run | Runs): string {
	if (several(part)) return part.map(runText).join("");
	return runText(part);
}

/** A part as runs ready to draw: a `{ quoted }` run as its quoted text, whole, the other kinds as they are. */
export function partRuns(part: Run | Runs): Runs {
	return runsOf(part).map((run) =>
		typeof run === "object" && "quoted" in run ? runText(run) : run,
	);
}

/** Whether a part says anything: an empty string and an empty span of code or strong run say nothing, so a line drops them before it joins and no separator dangles beside one. */
export function filled(part: Run): boolean {
	return partText(part) !== "";
}

/** The middle dot a sentence of parts joins with, bound to the word on each side by a no-break space so a line never breaks at it: a line that breaks between two parts shows no separator at either end. It joins the parts of a sentence that is text (`flowRuns`) and a row's trailing age to its `beside`; a row's facts are badges and take no separator. */
export const META_TAIL = " · ";

/** A line's parts, each as the runs it draws: an empty part dropped and a `{ quoted }` run as its quoted text. One element is one part, a middle dot inside a string no more than its text: every separator on the line is the line's own, which no line break leaves at a line's end or start. */
export function factParts(parts: Runs): Runs[] {
	return parts.filter(filled).map((part) => partRuns(part));
}

/** Parts as the runs of one text a middle dot apart (`flow`), the dot bound to the words beside it (`META_TAIL`): the text breaks only between a part's words, never at a dot, for a text cut at its first or second line or set to its end, where a part that wraps whole would leave a line short. */
export function flowRuns(parts: readonly Runs[]): Run[] {
	return parts.flatMap((runs, at) => (at === 0 ? runs : [META_TAIL, ...runs]));
}
