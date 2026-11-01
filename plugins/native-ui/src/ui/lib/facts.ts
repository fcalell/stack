import type {
	IconName,
	RowMark,
	Run,
	Runs,
} from "@fcalell/ui-core/descriptors";
import {
	isChipFact,
	isMarkFact,
	isStatusFact,
	isWarningFact,
} from "@fcalell/ui-core/list-state";
import type { ChipFamily, Tone } from "@fcalell/ui-core/tokens";

// The words of a line of facts and the badges a list of facts draws, free of
// any view so a test holds the structure of what is drawn (`facts.test.ts`):
// no import here is relative, since a consumer's type-check follows this source
// and a `.ts` specifier fails it.

// A quoted part in a line of facts is cut at 40 characters; in a title it wraps
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
// at either end. It joins the parts of a sentence that is text (`flowRuns`: a
// record head's overline, a message's provenance and time) and a row's trailing
// age to its `beside`; a row's facts are badges and take no separator.
export const META_TAIL = "\u00A0·\u00A0";

// A line's parts, each as the runs it draws: an empty part dropped and a
// `{ quoted }` run as its quoted text cut at `cut`. One element is one part, a
// middle dot inside a string no more than its text: every separator on the
// line is the line's own, which no line break leaves at a line's end or start.
export function factParts(parts: Runs, cut?: number): Runs[] {
	return parts.filter(filled).map((part) => partRuns(part, cut));
}

// Parts as the runs of one text a middle dot apart (`flow`), the dot bound to
// the words beside it (`META_TAIL`): the text breaks only between a part's
// words, never at a dot, for a text cut at its first or second line or set to
// its end, where a part that wraps whole would leave a line short.
export function flowRuns(parts: readonly Runs[]): Run[] {
	return parts.flatMap((runs, at) => (at === 0 ? runs : [META_TAIL, ...runs]));
}

// A list of facts as the badges a line draws: the one reading of the list the
// row, the record head and the picker's option draw from, free of any view so
// a test holds its structure (`badges.test.ts`). Each fact is one badge, in the
// order given; the badge says what it draws (`kind`), the words it reads as
// (`name`, the accessible name, which is also the full text a cut badge keeps)
// and, where it is painted, no words at all.

/** What a badge draws: a status's tone mark, a warning, a lock, a chip's family dot, the required ring, a flag, a count's figure, or words alone, each with its words. */
export type BadgeKind =
	| "status"
	| "warning"
	| "lock"
	| "chip"
	| "ring"
	| "flag"
	| "count"
	| "words";

/** One badge of a facts line. */
export interface BadgeSpec {
	kind: BadgeKind;
	/** The badge's accessible name: its words (a status's tone word where it draws none), the full text a badge cut with an ellipsis keeps. */
	name: string;
	/** The words the badge draws, as runs: a `{ code }` run stands in the mono, a `{ quoted }` one is cut at `META_CUT`. Empty while `painted`, and for a status with no word of its own. */
	runs: Runs;
	/** A status's tone, which its tone mark draws. */
	tone?: Tone;
	/** A chip's family: its dot, none for neutral. */
	family?: ChipFamily;
	/** A flag's glyph. */
	icon?: IconName;
	/** A lock's route: the badge is a link and takes the press itself. */
	href?: string;
	/** A count's figure, after its word. */
	count?: number;
	/** The badge is its filler: the loaded badge's box and glyph, its words a filler. */
	painted?: boolean;
}

/** What a list of facts draws, in the row's one reading. */
export interface Badges {
	/** The badges of the facts line, in the order given. */
	badges: BadgeSpec[];
	/** The boolean marks that draw no words (`words: false`): their glyphs stand in the end group, each named by its label, and no badge of the line. */
	quiet: RowMark[];
}

/** What the facts are drawn with. */
export interface BadgeInput {
	/** The facts, in the order given, each one fact; a placeholder (a fact that waits) is words. */
	facts: readonly unknown[];
	/** The word of a tone (`words[tone]`), for a status that gives none and the name of one that draws none. */
	word: (tone: Tone) => string;
	/** The row's lock reason; its badge follows the status, or leads the line where there is none. */
	lock?: string;
	/** The lock's route: a linked badge. */
	href?: string;
	/** A tick's blocked reason: the first badge, plain. */
	blocked?: string;
	/** The words are fillers (a fact waits): one painted badge per words fact, loaded or not. */
	fillers?: boolean;
	/** The whole row is painted: its status, warning and lock are boxes with fillers, and its chips and boolean marks, which the painted form cannot know, are not drawn. */
	painted?: boolean;
}

/** Whether a boolean mark says a fact: a ring says one only while it holds. */
export function says(mark: RowMark): boolean {
	return !("ring" in mark) || mark.ring;
}

/** Whether a boolean mark draws no words: its glyph stands in the row's end group, its label the name. */
export function wordless(mark: RowMark): boolean {
	return mark.words === false;
}

const NONE: Runs = [];

const words = (runs: Runs): BadgeSpec => ({
	kind: "words",
	name: partText(runs),
	runs,
});

const filler = (kind: BadgeKind, spec: Partial<BadgeSpec> = {}): BadgeSpec => ({
	kind,
	name: "",
	runs: NONE,
	painted: true,
	...spec,
});

/** A list of facts as its badges, in the order given: a status (the first leads the list and the row's lock follows it; a further one is a badge of its own, its tone mark before its word), a warning, a chip, a boolean mark with words and each words fact one badge, a tick's blocked reason first. A fact with no text and a ring that does not hold draw nothing. */
export function badgesOf(input: BadgeInput): Badges {
	const { facts, word, lock, href, blocked, fillers, painted } = input;
	const badges: BadgeSpec[] = [];
	const quiet: RowMark[] = [];
	let status = -1;
	for (const fact of facts) {
		if (fact === undefined || fact === null || fact === false) continue;
		if (isStatusFact(fact)) {
			if (status < 0) status = badges.length;
			// A status with no word of its own (`label: ""`) is its mark alone.
			const said = fact.label ?? word(fact.tone);
			badges.push(
				painted
					? filler("status", { tone: "done" })
					: {
							kind: "status",
							tone: fact.tone,
							name: said || word(fact.tone),
							runs: said === "" ? NONE : [said],
						},
			);
		} else if (isWarningFact(fact)) {
			badges.push(
				painted
					? filler("warning")
					: { kind: "warning", name: fact.warning, runs: [fact.warning] },
			);
		} else if (isChipFact(fact)) {
			if (painted) continue;
			badges.push({
				kind: "chip",
				family: fact.family,
				name: fact.label,
				runs: [fact.label],
			});
		} else if (isMarkFact(fact)) {
			if (painted || !says(fact)) continue;
			if (wordless(fact)) {
				quiet.push(fact);
				continue;
			}
			badges.push(
				"ring" in fact
					? { kind: "ring", name: fact.label, runs: [fact.label] }
					: {
							kind: "flag",
							icon: fact.flag,
							name: fact.label,
							runs: [fact.label],
						},
			);
		} else if (fillers) {
			badges.push(filler("words"));
		} else if (filled(fact as Run)) {
			badges.push(words(partRuns(fact as Run, META_CUT)));
		}
	}
	if (lock !== undefined) {
		const at = status >= 0 ? status + 1 : 0;
		badges.splice(
			at,
			0,
			painted
				? filler("lock")
				: { kind: "lock", name: lock, runs: [lock], href },
		);
	}
	if (blocked !== undefined) badges.unshift(words([blocked]));
	return { badges, quiet };
}

/** The code a list of badges is when it is one lone `{ code }` run: a row's value in the mono, cut in its middle, no badge. */
export function loneCode(badges: readonly BadgeSpec[]): string | undefined {
	const [only] = badges;
	if (badges.length !== 1 || !only || only.kind !== "words" || only.painted)
		return undefined;
	const [run] = only.runs;
	return only.runs.length === 1 && run !== undefined && isCode(run)
		? run.code
		: undefined;
}
