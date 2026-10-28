import { Button as BaseButton } from "@base-ui/react/button";
import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	OptionPick,
	Route,
	Run,
	Runs,
	Tone,
} from "@fcalell/ui-core/descriptors";
import {
	BLOCK_IN,
	chip,
	FIGURES,
	ITEM_HEADER,
	ITEM_PILL,
	ITEM_PILL_ACT,
	ITEM_PILL_GLYPH,
	ITEM_PILL_HIT,
	ITEM_PILLS,
	TITLE_CODE,
	text,
} from "@fcalell/ui-core/variants";
import { Fragment, type Ref, useState } from "react";
import { useArrivals } from "../../lib/arrive.ts";
import { RunText } from "../../lib/code.tsx";
import { useTouch } from "../../lib/media.ts";
import { follow } from "../../lib/navigate.ts";
import { Painted } from "../../lib/paint.tsx";
import {
	filled,
	isCode,
	META_CUT,
	partRuns,
	partText,
} from "../../lib/parts.ts";
import { useWords } from "../../lib/words.tsx";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import { HeldPicker } from "../picker/base.tsx";
import { StatusBase } from "../status/base.tsx";
import { Status } from "../status/index.tsx";

const HEAD = "flex flex-col";
// The overline is one line on the desktop, cut at its end; on touch, where
// the bar no longer holds the place and the line is short, it wraps between
// its parts' words, so no part is cut to a few letters while the name has room.
const OVERLINE = "truncate touch:whitespace-normal";
// The name draws whole: it wraps between its words.
const NAME = "min-w-0";
const FACTS = "flex flex-wrap items-center";
const DESCRIPTION = "max-w-measure";
// A fact is a pill; the box a fact that opens draws around its pill is its hit
// area (`ITEM_PILL_HIT`), the pill inside it carrying the washes.
const PILL = "inline-flex items-center min-w-0 max-w-full";
// A plain fact (words, a counted word) does nothing and moves no state: the
// neutral chip's pill, its words on the grey soft ground with no edge and no
// dot, so beside the outlined pills that act it never reads as a button.
const PLAIN = cn(
	text({ role: "caption" }),
	chip({ trailing: "none", ground: "soft" }),
	PILL,
);
const HIT = "inline-flex items-center min-w-0 max-w-full";
const WORDS = cn("truncate", FIGURES);
// A pick is its own control and its own pill (the picker's `round`): one box,
// the state pill itself where the chosen option carries a state, never a pill
// inside a pill.
const PICK = "inline-flex min-w-0 max-w-full";

/** One fact in the head's facts line: words, a status, words that open a sheet or go to a route, a status that moves (a pick whose options carry states), a count beside its word (each string a short phrase; the facts line wraps between facts, a `{ quoted }` part is cut at 40 characters). */
export type Fact<V extends string | null = string> =
	| Run
	| { status: Tone; label?: string }
	| { label: Run; onOpen: () => void }
	| { label: Run; href: Route; onOpen?: never }
	| { pick: OptionPick<V> }
	| { count: number; label: string };

/** What a record's head holds besides its name: the parts that place the record and its facts. */
export interface ItemHeaderParts<V extends string | null = string> {
	/** The parts that place the record (its project, key, cycle), joined by a middle dot (each a short phrase; one line, truncates). A part that is a selection paints, and the head is inert, until its read lands. */
	overline?: readonly Datum<Run>[];
	/** The facts in a wrapping line under the overline. A fact that is a selection paints in its place (a status or a pick keeps its form, any other is a word), and the head is inert, until its read lands. */
	facts?: readonly Datum<Fact<V>>[];
	/** The record's description, under the facts at the reading measure (a sentence or a short paragraph; wraps): plain text, or runs of one text, so a machine name inside it is a `{ code }` run boxed in the mono (`["The server at ", { code: "10.0.0.4:8790" }, " lists verbs that differ."]`). A selection paints a line in its place, and the head is inert, until its read lands; absent or empty, nothing is drawn. */
	description?: Datum<Run | Runs>;
}

function factKey<V extends string | null>(fact: Fact<V>): string {
	if (typeof fact === "object" && "pick" in fact) return fact.pick.label;
	if (typeof fact === "object" && ("onOpen" in fact || "href" in fact))
		return partText(fact.label);
	if (typeof fact === "object" && "status" in fact)
		return `${fact.status} ${fact.label ?? ""}`;
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
	fact: Fact<V>;
	arrived: boolean;
}) {
	const [fades] = useState(arrived);
	const words = useWords();
	if (typeof fact === "object" && "href" in fact)
		return (
			<a
				href={fact.href}
				onClick={follow}
				className={cn(ITEM_PILL_HIT, HIT, fades && BLOCK_IN)}
			>
				<OpenPill label={fact.label} />
			</a>
		);
	if (typeof fact === "object" && "onOpen" in fact)
		return (
			<BaseButton
				onClick={fact.onOpen}
				aria-haspopup="dialog"
				className={cn(ITEM_PILL_HIT, HIT, fades && BLOCK_IN)}
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
	// A status is a state chip, a pill of its own, worded by its state where
	// it brings no word.
	if (typeof fact === "object" && "status" in fact)
		return (
			<Status tone={fact.status} label={fact.label ?? words[fact.status]} />
		);
	if (typeof fact === "object" && "count" in fact)
		return (
			<span className={cn(PLAIN, fades && BLOCK_IN)}>
				<span className={WORDS}>{fact.label}</span>
				<Count value={fact.count} />
			</span>
		);
	return (
		<span className={cn(PLAIN, fades && BLOCK_IN)}>
			<span className={WORDS}>
				<RunText runs={partRuns(fact, META_CUT)} fit="name" />
			</span>
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
	if (typeof fact === "object" && fact !== null && "status" in fact)
		return <StatusBase painted />;
	if (typeof fact === "object" && fact !== null && "pick" in fact)
		return (
			<span className={PICK}>
				<HeldPicker {...(fact.pick as OptionPick)} fit="row" round painted />
			</span>
		);
	return (
		<span className={PLAIN}>
			<Painted role="word" at={at} />
		</span>
	);
}

/** A record's head: its place (the overline, led on touch by where the record lives, which the bar holds on the desktop), its name and its facts, a pair apart; the bar holds the acts, so the head holds none. The name is the Pane's title, drawn whole and wrapping as the heading that names the Pane, the page's `h1` on the last Pane of a Place and an `h2` on one with another after it, its filler inside it while its read waits; given none, the head is the overline and the facts. A name, a part or a fact that is a selection paints in its place, and the facts take no press, until its read lands. Outside the package's exports: a Pane draws it for its `record`, and `ItemHeader` is the head with no name. */
export function ItemHeaderBase<V extends string | null = string>({
	name: title,
	nameId,
	level = 1,
	nameRef,
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
	/** The name's heading level: the Pane's, 1 on the last Pane of its Place. */
	level?: 1 | 2;
	/** The name's heading, which the Pane's bar watches on touch. */
	nameRef?: Ref<HTMLHeadingElement>;
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
					filled(each.value as Run)),
		);
	const painted = drawn.some(paints) || paints(name) || paints(about);
	const arrived = useArrivals(
		stood.flatMap((fact) =>
			fact.painted ? [] : [factKey(fact.value as Fact<V>)],
		),
		!painted,
	);
	// The name is the Pane's heading in every form it draws: a waiting name
	// paints inside it, named by the waiting word since its filler is hidden,
	// so the page keeps its heading while the record loads.
	const Name = `h${level}` as const;
	const words = useWords();
	return (
		<div className={cn(ITEM_HEADER, HEAD)}>
			{placed.length > 0 ? (
				<p className={cn(text({ role: "meta" }), OVERLINE)}>
					{placed.map((part, at) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: the parts are a fixed list, in order
						<Fragment key={at}>
							{at === 0 ? null : " · "}
							{part.painted ? (
								<Painted role="word" at={at} />
							) : (
								<RunText
									runs={partRuns(part.value as Run, META_CUT)}
									fit="name"
								/>
							)}
						</Fragment>
					))}
				</p>
			) : null}
			{title !== undefined && (!name.painted || paints(name)) ? (
				<Name
					ref={nameRef}
					id={nameId}
					aria-label={name.painted ? words.waiting : undefined}
					className={cn(text({ role: "title" }), NAME)}
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
			) : null}
			{stood.length > 0 ? (
				// Only the facts take a press: none does until the head lands.
				<div inert={painted || undefined} className={cn(ITEM_PILLS, FACTS)}>
					{stood.map((fact, at) =>
						fact.painted ? (
							// biome-ignore lint/suspicious/noArrayIndexKey: a painted fact has no text to key by
							<PaintedFact key={at} fact={fact.value} at={at} />
						) : (
							<FactPart
								key={factKey(fact.value as Fact<V>)}
								fact={fact.value as Fact<V>}
								arrived={arrived.has(factKey(fact.value as Fact<V>))}
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
					<RunText runs={partRuns(about.value as Run | Runs)} />
				</p>
			) : null}
		</div>
	);
}
