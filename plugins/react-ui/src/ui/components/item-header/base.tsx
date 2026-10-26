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
	Tone,
} from "@fcalell/ui-core/descriptors";
import {
	BLOCK_IN,
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
import { Fragment, useState } from "react";
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
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import { HeldPicker } from "../picker/base.tsx";
import { StatusBase } from "../status/base.tsx";
import { Status } from "../status/index.tsx";

const HEAD = "flex flex-col";
const OVERLINE = "truncate";
// The name draws whole: it wraps between its words.
const NAME = "min-w-0";
const FACTS = "flex flex-wrap items-center";
const DESCRIPTION = "max-w-measure";
// A fact is a pill; the box a fact that opens draws around its pill is its hit
// area (`ITEM_PILL_HIT`), the pill inside it carrying the washes.
const PILL = "inline-flex items-center min-w-0 max-w-full";
const HIT = "inline-flex items-center min-w-0 max-w-full";
const WORDS = cn("truncate", FIGURES);
// A pick is its own control: its pill holds no inset of its own, the trigger
// brings its inline inset and its target-height hit box, pulled back to the
// pill's height.
const PICK_PILL = "inline-flex items-center max-w-full px-0";
const PICK_HIT =
	"inline-flex max-w-full -my-[calc((var(--spacing-target)-var(--spacing-chip))/2)]";

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
	/** The record's description, plain text under the facts at the reading measure (a sentence or a short paragraph; wraps). A selection paints a line in its place, and the head is inert, until its read lands; absent or empty, nothing is drawn. */
	description?: Datum<string>;
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
			<span
				className={cn(
					text({ role: "caption" }),
					ITEM_PILL,
					PICK_PILL,
					fades && BLOCK_IN,
				)}
			>
				<span className={PICK_HIT}>
					<HeldPicker {...fact.pick} fit="row" round />
				</span>
			</span>
		);
	// A status given its word is a state chip, a pill of its own.
	if (typeof fact === "object" && "status" in fact && fact.label !== undefined)
		return <Status tone={fact.status} label={fact.label} />;
	if (typeof fact === "object" && "status" in fact)
		return (
			<span className={cn(text({ role: "caption" }), ITEM_PILL, PILL)}>
				<Status tone={fact.status} label={fact.label} />
			</span>
		);
	if (typeof fact === "object" && "count" in fact)
		return (
			<span
				className={cn(
					text({ role: "caption" }),
					ITEM_PILL,
					PILL,
					fades && BLOCK_IN,
				)}
			>
				<span className={WORDS}>{fact.label}</span>
				<Count value={fact.count} />
			</span>
		);
	return (
		<span
			className={cn(
				text({ role: "caption" }),
				ITEM_PILL,
				PILL,
				fades && BLOCK_IN,
			)}
		>
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
			<span className={cn(text({ role: "caption" }), ITEM_PILL, PICK_PILL)}>
				<span className={PICK_HIT}>
					<HeldPicker {...(fact.pick as OptionPick)} fit="row" painted />
				</span>
			</span>
		);
	return (
		<span className={cn(text({ role: "caption" }), ITEM_PILL, PILL)}>
			<Painted role="word" at={at} />
		</span>
	);
}

/** A record's head: its place (the overline, led on touch by where the record lives, which the bar holds on the desktop), its name and its facts, a pair apart; the bar holds the acts, so the head holds none. The name is the Pane's title, drawn whole and wrapping as the heading that names the Pane, the page's `h1` on the last Pane of a Place and an `h2` on one with another after it (a paragraph while its read waits); given none, the head is the overline and the facts. A name, a part or a fact that is a selection paints in its place, and the head takes no press, until its read lands. Outside the package's exports: a Pane draws it for its `record`, and `ItemHeader` is the head with no name. */
export function ItemHeaderBase<V extends string | null = string>({
	name: title,
	nameId,
	level = 1,
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
	// A painted name is filler, not a heading: it stands as a paragraph of the
	// heading's own look until the title lands.
	const Name = name.painted ? "p" : (`h${level}` as const);
	return (
		<div inert={painted || undefined} className={cn(ITEM_HEADER, HEAD)}>
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
				<Name id={nameId} className={cn(text({ role: "title" }), NAME)}>
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
				<div className={cn(ITEM_PILLS, FACTS)}>
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
			) : !about.painted && about.value ? (
				<p className={cn(text({ role: "body" }), DESCRIPTION)}>{about.value}</p>
			) : null}
		</div>
	);
}
