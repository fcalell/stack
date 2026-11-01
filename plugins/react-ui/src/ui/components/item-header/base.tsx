import { Button as BaseButton } from "@base-ui/react/button";
import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	OptionPick,
	RecordFact,
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
import {
	BADGE_LINE,
	BLOCK_IN,
	FIGURES,
	ITEM_FACT_HIT,
	ITEM_HEADER,
	ITEM_PILL,
	ITEM_PILL_ACT,
	ITEM_PILL_GLYPH,
	TITLE_CODE,
	text,
} from "@fcalell/ui-core/variants";
import { useState } from "react";
import { useArrivals } from "../../lib/arrive.ts";
import { RunText } from "../../lib/code.tsx";
import { useTouch } from "../../lib/media.ts";
import { follow } from "../../lib/navigate.ts";
import { Painted } from "../../lib/paint.tsx";
import {
	factParts,
	filled,
	isCode,
	META_CUT,
	partRuns,
	partText,
} from "../../lib/parts.ts";
import { PartsLine } from "../../lib/parts-line.tsx";
import { useWords } from "../../lib/words.tsx";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import { HeldPicker } from "../picker/base.tsx";
import {
	Badge,
	ChipBadge,
	MarkBadge,
	StatusBadge,
	WarningBadge,
	WordsBadge,
} from "../row/badges.tsx";
import { EndMark, says, wordless } from "../row/marks.tsx";

const HEAD = "flex flex-col";
// The overline is a text line: one line at every density, cut at its end with
// an ellipsis, its parts a middle dot apart (`PartsLine`'s `flow`), on touch as
// on the desktop.
const OVERLINE = "truncate";
// The name draws whole: it wraps between its words.
const NAME = "min-w-0";
// A quiet fact (a mark with no words) stands at the end of the name's first
// line, as a row's stands in its end group: the name's row is a flex row of the
// name and the glyphs, each glyph in a box of the name's line height so it
// stays on the first line of a wrapped name, and it takes no line of the
// facts, whatever the facts hold.
const NAME_ROW = "flex items-start gap-gap";
const ASIDE = "flex items-center shrink-0 h-lh";
// The name names a view timeline on the body that scrolls it, which the Pane's
// bar reads to stand its own name once this one has scrolled up under the bar
// (`record-name` in globals.css).
const NAME_TIMELINE = "record-name";
const FACTS = "flex flex-wrap items-center";
const DESCRIPTION = "max-w-measure";
// A fact is a badge (`Badge`), one box that never breaks inside, a gap apart
// on the line (`BADGE_LINE`). A fact that acts keeps its own control: a pick is
// its picker's pill, and a fact that opens a sheet is the outlined pill with its
// chevron, so nothing outlined in the head is inert. A fact that links is a
// badge whose words are underlined, inside the hit box (`ITEM_FACT_HIT`) the
// target floor needs, the badge inside it carrying the washes.
const PILL = "inline-flex items-center min-w-0 max-w-full";
const HIT = "inline-flex items-center min-w-0 max-w-full";
const WORDS = cn("truncate", FIGURES);
// A pick is its own control and its own pill (the picker's `round`): one box,
// the state pill itself where the chosen option carries a state, never a pill
// inside a pill.
const PICK = "inline-flex min-w-0 max-w-full";

/** What a record's head holds besides its name: the parts that place the record and its facts. */
export interface ItemHeaderParts<V extends string | null = string> {
	/** The parts that place the record (its project, key, cycle), a text line, not badges, joined by a middle dot (each a short phrase, a dot inside one no more than its text; one line, cut at its end with an ellipsis on touch as on the desktop). A part that is a selection paints, and the head is inert, until its read lands. */
	overline?: readonly Datum<Run>[];
	/** The facts in a wrapping line of badges under the overline, each one fact (`RecordFact`: words, a status, a chip, what is wrong as `{ warning }`, a boolean mark, words that go to a route (a linked badge), words that open a sheet (an outlined pill with its chevron, since it acts), a status that moves as a pick whose options carry states (its own control pill), a count beside its word; a boolean mark with `words: false` is its glyph alone, named by the label and, on a pointer, its tooltip, standing at the end of the name's first line, so a quiet fact such as where the content came from takes no width and no line of the facts) (each string a short phrase; the facts line wraps between badges, none breaking inside, a fact too long for the line cut with an ellipsis inside its badge, a `{ quoted }` part cut at 40 characters, a `{ code }` run in the mono). A status is a badge with its tone's mark inside, before its word. A fact that is a selection paints in its place (a status or a pick keeps its form, any other is a badge's filler), and the head is inert, until its read lands. */
	facts?: readonly Datum<RecordFact<V>>[];
	/** The record's description, under the facts at the reading measure (a sentence or a short paragraph; wraps): plain text, or runs of one text, so a machine name inside it is a `{ code }` run boxed in the mono (`["The server at ", { code: "10.0.0.4:8790" }, " lists verbs that differ."]`). A selection paints a line in its place, and the head is inert, until its read lands; absent or empty, nothing is drawn. */
	description?: Datum<Run | Runs>;
}

// A mark that does not hold (a ring that is false) says no fact.
const isMark = isMarkFact;

function factKey<V extends string | null>(fact: RecordFact<V>): string {
	if (typeof fact === "object" && "pick" in fact) return fact.pick.label;
	if (typeof fact === "object" && ("onOpen" in fact || "href" in fact))
		return partText(fact.label);
	if (isStatusFact(fact)) return `${fact.tone} ${fact.label ?? ""}`;
	if (isWarningFact(fact)) return `warning ${fact.warning}`;
	if (isChipFact(fact)) return `${fact.family} ${fact.label}`;
	if (isMarkFact(fact)) return `mark ${fact.label}`;
	if (typeof fact === "object" && "count" in fact)
		return `${fact.count} ${fact.label}`;
	return partText(fact);
}

// A fact is a block of the line, fading in if it came on its own once the
// header was drawn, held from the first render. A status is the Status's own.
function FactPart<V extends string | null>({
	fact,
	arrived,
}: {
	fact: RecordFact<V>;
	arrived: boolean;
}) {
	const [fades] = useState(arrived);
	// A fact that goes to a route is a linked badge: its words underlined, in the
	// hit box that gives it the target's size.
	if (typeof fact === "object" && "href" in fact)
		return (
			<a
				href={fact.href}
				onClick={follow}
				className={cn(ITEM_FACT_HIT, HIT, fades && BLOCK_IN)}
			>
				<Badge underlined className={ITEM_PILL_ACT}>
					<RunText runs={partRuns(fact.label, META_CUT)} fit="name" />
				</Badge>
			</a>
		);
	if (typeof fact === "object" && "onOpen" in fact)
		return (
			<BaseButton
				onClick={fact.onOpen}
				aria-haspopup="dialog"
				className={cn(ITEM_FACT_HIT, HIT, fades && BLOCK_IN)}
			>
				<OpenPill label={fact.label} />
			</BaseButton>
		);
	if (typeof fact === "object" && "pick" in fact)
		return (
			<span className={cn(PICK, fades && BLOCK_IN)}>
				<HeldPicker {...fact.pick} fit="row" round />
			</span>
		);
	// A status is a badge: its tone's mark inside, then its word, the tone's
	// where it brings none.
	if (isStatusFact(fact))
		return (
			<span className={cn(PICK, fades && BLOCK_IN)}>
				<StatusBadge status={fact} />
			</span>
		);
	// What is wrong: the warn glyph and its phrase, a badge.
	if (isWarningFact(fact))
		return (
			<span className={cn(PICK, fades && BLOCK_IN)}>
				<WarningBadge warning={fact.warning} />
			</span>
		);
	// A data value's tag: the family's dot (none for neutral) and its value.
	if (isChipFact(fact))
		return (
			<span className={cn(PICK, fades && BLOCK_IN)}>
				<ChipBadge chip={fact} />
			</span>
		);
	// A count is a badge: its word and its figure.
	if (typeof fact === "object" && "count" in fact)
		return (
			<span className={cn(PICK, fades && BLOCK_IN)}>
				<Badge>
					{fact.label} <Count value={fact.count} />
				</Badge>
			</span>
		);
	if (isMarkFact(fact))
		return (
			<span className={cn(PICK, fades && BLOCK_IN)}>
				{fact.words === false ? (
					<Badge glyph={<EndMark mark={fact} />} />
				) : (
					<MarkBadge mark={fact} />
				)}
			</span>
		);
	return (
		<span className={cn(PICK, fades && BLOCK_IN)}>
			<WordsBadge fact={fact as Run} />
		</span>
	);
}

// A quiet fact beside the name: the glyph alone, fading in if it came on its
// own once the header was drawn, held from the first render.
function AsideMark({ mark, arrived }: { mark: RowMark; arrived: boolean }) {
	const [fades] = useState(arrived);
	return (
		<span className={cn(fades && BLOCK_IN)}>
			<EndMark mark={mark} />
		</span>
	);
}

// The pill of a fact that opens or links: its words, then a chevron at its end;
// the hover wash and the ring are the pill's, the hit box around it the caller's.
function OpenPill({ label }: { label: Run }) {
	return (
		<span
			className={cn(text({ role: "caption" }), ITEM_PILL, ITEM_PILL_ACT, PILL)}
		>
			<span className={WORDS}>
				<RunText runs={partRuns(label, META_CUT)} fit="name" />
			</span>
			<span className={ITEM_PILL_GLYPH}>
				<Icon name="ChevronRight" fit="meta" />
			</span>
		</span>
	);
}

// A fact that is not here, in the form its selection's shape says: the
// placeholder is no object, so a selection that gives the fact whole paints as
// a word.
function PaintedFact({ fact, at }: { fact: unknown; at: number }) {
	if (isStatusFact(fact))
		return (
			<span className={PICK}>
				<StatusBadge status={fact} painted />
			</span>
		);
	if (typeof fact === "object" && fact !== null && "pick" in fact)
		return (
			<span className={PICK}>
				<HeldPicker {...(fact.pick as OptionPick)} fit="row" round painted />
			</span>
		);
	return (
		<span className={PICK}>
			<Badge painted paint={{ role: "word", at }} />
		</span>
	);
}

/** A record's head: its place (the overline, led on touch by where the record lives, which the bar holds on the desktop), its name and its facts, a pair apart; the bar holds the acts, so the head holds none. The name is the Pane's title, drawn whole and wrapping as the `h2` that names the Pane, its filler inside it while its read waits; given none, the head is the overline and the facts. A name, a part or a fact that is a selection paints in its place, and the facts take no press, until its read lands. Outside the package's exports: a Pane draws it for its `record`, and `ItemHeader` is the head with no name. */
export function ItemHeaderBase<V extends string | null = string>({
	name: title,
	nameId,
	within,
	overline: given = [],
	facts = [],
	description,
}: ItemHeaderParts<V> & {
	/** Where the record lives (its Pane's `record.within`): on touch, where the bar holds the name alone, it leads the overline, so the place is given once and stands once at every density. */
	within?: Datum<Run>;
	/** The record's name: the Pane's title. */
	name?: Datum<Run>;
	/** The id the name carries, which names the Pane. */
	nameId?: string;
}) {
	const [name] = useSelections([title]);
	// On touch the bar drops the place for the name, so the overline leads with
	// it; a name whose read ended leaves the place in the bar.
	const touch = useTouch();
	const nameless = name.painted && !paints(name);
	const overline =
		touch && within !== undefined && !nameless ? [within, ...given] : given;
	const drawn = useSelections([...overline, ...facts]);
	const [about] = useSelections([description]);
	// A part or a fact whose read ended draws nothing; the frame that holds the
	// read says why.
	const draws = (each: (typeof drawn)[number]) => !each.painted || paints(each);
	// A loaded part with no text draws nothing, so no separator dangles after
	// the part before it.
	const placed = drawn
		.slice(0, overline.length)
		.filter(
			(each) => draws(each) && (each.painted || filled(each.value as Run)),
		);
	// An absent fact (a loaded part with no text) draws nothing: absence says
	// nothing.
	const stood = drawn
		.slice(overline.length)
		.filter(
			(each) =>
				draws(each) &&
				(each.painted ||
					typeof each.value !== "string" ||
					filled(each.value as Run)) &&
				(each.painted || !isMark(each.value) || says(each.value)),
		);
	const painted = drawn.some(paints) || paints(name) || paints(about);
	// A quiet fact stands beside the name where the head draws one; a head with
	// no name keeps it in the facts line.
	const named = title !== undefined && (!name.painted || paints(name));
	const aside = (each: (typeof stood)[number]) =>
		named &&
		!each.painted &&
		isMark(each.value) &&
		wordless(each.value as RowMark);
	const quiet = stood.filter(aside);
	const line = stood.filter((each) => !aside(each));
	const arrived = useArrivals(
		stood.flatMap((fact) =>
			fact.painted ? [] : [factKey(fact.value as RecordFact<V>)],
		),
		!painted,
	);
	// The name is the Pane's heading in every form it draws: a waiting name
	// paints inside it, named by the waiting word since its filler is hidden,
	// so the page keeps its heading while the record loads.
	const Name = "h2" as const;
	const words = useWords();
	const heading = named ? (
		<Name
			id={nameId}
			aria-label={name.painted ? words.waiting : undefined}
			className={cn(
				text({ role: "title" }),
				NAME,
				NAME_TIMELINE,
				quiet.length > 0 && "grow",
			)}
		>
			{name.painted ? (
				<Painted role="title" />
			) : isCode(name.value as Run) ? (
				<code className={TITLE_CODE}>
					{(name.value as { code: string }).code}
				</code>
			) : (
				<RunText runs={partRuns(name.value as Run)} fit="name" />
			)}
		</Name>
	) : null;
	return (
		<div className={cn(ITEM_HEADER, HEAD)}>
			{placed.length > 0 ? (
				<p className={cn(text({ role: "meta" }), OVERLINE)}>
					<PartsLine
						form="flow"
						parts={placed.flatMap((part, at) =>
							part.painted
								? [
										// biome-ignore lint/suspicious/noArrayIndexKey: the parts are a fixed list, in order
										<Painted key={at} role="word" at={at} />,
									]
								: // A part is one part, a dot inside its string text: every
									// separator is the line's.
									factParts([part.value as Run], META_CUT).map(
										(runs, within) => (
											<RunText
												// biome-ignore lint/suspicious/noArrayIndexKey: the parts are a fixed list, in order
												key={`${at}.${within}`}
												runs={runs}
												whole
												fit="name"
											/>
										),
									),
						)}
					/>
				</p>
			) : null}
			{quiet.length > 0 ? (
				<div className={NAME_ROW}>
					{heading}
					<span className={cn(text({ role: "title" }), ASIDE)}>
						{quiet.map((fact) => (
							<AsideMark
								key={factKey(fact.value as RecordFact<V>)}
								mark={fact.value as RowMark}
								arrived={arrived.has(factKey(fact.value as RecordFact<V>))}
							/>
						))}
					</span>
				</div>
			) : (
				heading
			)}
			{line.length > 0 ? (
				// Only the facts take a press: none does until the head lands.
				<div inert={painted || undefined} className={cn(BADGE_LINE, FACTS)}>
					{line.map((fact, at) =>
						fact.painted ? (
							// biome-ignore lint/suspicious/noArrayIndexKey: a painted fact has no text to key by
							<PaintedFact key={at} fact={fact.value} at={at} />
						) : (
							<FactPart
								key={factKey(fact.value as RecordFact<V>)}
								fact={fact.value as RecordFact<V>}
								arrived={arrived.has(factKey(fact.value as RecordFact<V>))}
							/>
						),
					)}
				</div>
			) : null}
			{paints(about) ? (
				<p className={cn(text({ role: "body" }), DESCRIPTION)}>
					<Painted role="sentence" />
				</p>
			) : !about.painted &&
				about.value !== undefined &&
				partText(about.value as Run | Runs) !== "" ? (
				<p className={cn(text({ role: "body" }), DESCRIPTION)}>
					<RunText runs={partRuns(about.value as Run | Runs)} whole />
				</p>
			) : null}
		</div>
	);
}
