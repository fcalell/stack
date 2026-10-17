import { Button as BaseButton } from "@base-ui/react/button";
import {
	type Datum,
	paints,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	OptionPick,
	Part,
	Route,
	StatusState,
} from "@fcalell/ui-core/descriptors";
import {
	ITEM_FACT,
	ITEM_FACTS,
	ITEM_HEADER,
	text,
	WORD_ACT,
} from "@fcalell/ui-core/variants";
import { Fragment, use } from "react";
import type { Closed } from "../../lib/closed.ts";
import { PaneOverline } from "../../lib/frame.ts";
import { follow } from "../../lib/navigate.ts";
import { Painted } from "../../lib/paint.tsx";
import { META_CUT, partText } from "../../lib/parts.ts";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import { HeldPicker } from "../picker/base.tsx";
import { StatusBase } from "../status/base.tsx";
import { Status } from "../status/index.tsx";

const HEAD = "flex flex-col";
// A fact that acts keeps its target-height hit box and reaches past the facts
// line's text line above and below it (`factReach`), so the line holds the
// meta line's height whichever kinds of fact it carries. Its own meta leading
// is the `lh` it reads.
const REACH = "leading-meta -my-[calc((var(--spacing-target)-1lh)/2)]";
const OVERLINE = "truncate";
const FACTS = "flex flex-wrap items-center";
const FACT = "inline-flex items-center min-w-0 max-w-full";
// A pick in the facts line pulls back at its start as well as its end, so its
// dot and word sit where a plain fact's would.
const PICK = cn("inline-flex max-w-full -ms-inside", REACH);
// A fact that acts washes at the pointer, its words in the meta ink; one that
// opens pulls back at its start as a pick does.
const ACT =
	"inline-flex items-center text-ink-meta hover:bg-wash-hover active:bg-wash-press";
const OPEN = cn(ACT, "-ms-inside", REACH);

/** One fact in the head's facts line: words, a status, words that open a sheet or go to a route, a status that moves (a pick whose options carry states), a count beside its word (each string a short phrase; the facts line wraps between facts, a `Quoted` part is cut at 40 characters). */
export type Fact<V extends string | null = string> =
	| Part
	| { status: StatusState; label?: string }
	| { label: Part; onOpen: () => void }
	| { label: Part; href: Route; onOpen?: never }
	| { pick: OptionPick<V> }
	| { count: number; label: string };

/** A record's place and facts under the Pane's bar, which holds the record's name and acts. */
export interface ItemHeaderProps<V extends string | null = string>
	extends Closed {
	/** The parts that place the record (its project, key, cycle), joined by a middle dot (each a short phrase; one line, truncates). A part that is a selection paints, and the head is inert, until its read lands. */
	overline?: readonly Datum<Part>[];
	/** The facts in a wrapping line under the overline. A fact that is a selection paints in its place (a status or a pick keeps its form, any other is a word), and the head is inert, until its read lands. */
	facts?: readonly Datum<Fact<V>>[];
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

function FactPart<V extends string | null>({ fact }: { fact: Fact<V> }) {
	if (typeof fact === "object" && "href" in fact)
		return (
			<a
				href={fact.href}
				onClick={follow}
				className={cn(WORD_ACT, ITEM_FACT, OPEN)}
			>
				<span className={text({ role: "meta" })}>
					{partText(fact.label, META_CUT)}
				</span>
				<Icon name="ChevronRight" fit="meta" />
			</a>
		);
	if (typeof fact === "object" && "onOpen" in fact)
		return (
			<BaseButton
				onClick={fact.onOpen}
				aria-haspopup="dialog"
				className={cn(WORD_ACT, ITEM_FACT, OPEN)}
			>
				<span className={text({ role: "meta" })}>
					{partText(fact.label, META_CUT)}
				</span>
				<Icon name="ChevronRight" fit="meta" />
			</BaseButton>
		);
	if (typeof fact === "object" && "pick" in fact)
		return (
			<span className={PICK}>
				<HeldPicker {...fact.pick} fit="row" />
			</span>
		);
	if (typeof fact === "object" && "status" in fact)
		return <Status state={fact.status} label={fact.label} />;
	if (typeof fact === "object" && "count" in fact)
		return (
			<span className={cn(ITEM_FACT, FACT)}>
				<span className={text({ role: "meta" })}>{fact.label}</span>
				<Count value={fact.count} />
			</span>
		);
	return (
		<span className={text({ role: "meta" })}>{partText(fact, META_CUT)}</span>
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
				<HeldPicker {...(fact.pick as OptionPick)} fit="row" painted />
			</span>
		);
	return (
		<span className={text({ role: "meta" })}>
			<Painted role="word" at={at} />
		</span>
	);
}

/** The record's place (the overline) and its facts, a pair apart, under the Pane's bar: the bar holds the record's name and acts, so the head holds neither. A part or a fact that is a selection paints in its place, and the head takes no press, until its read lands. */
export function ItemHeader<V extends string | null = string>({
	overline = [],
	facts = [],
}: ItemHeaderProps<V>) {
	const overlineId = use(PaneOverline);
	const drawn = useSelections([...overline, ...facts]);
	// A part or a fact whose read ended draws nothing; the frame that holds the
	// read says why.
	const draws = (each: (typeof drawn)[number]) => !each.painted || paints(each);
	const placed = drawn.slice(0, overline.length).filter(draws);
	const stood = drawn.slice(overline.length).filter(draws);
	const painted = drawn.some(paints);
	return (
		<div inert={painted || undefined} className={cn(ITEM_HEADER, HEAD)}>
			{placed.length > 0 ? (
				<p id={overlineId} className={cn(text({ role: "meta" }), OVERLINE)}>
					{placed.map((part, at) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: the parts are a fixed list, in order
						<Fragment key={at}>
							{at === 0 ? null : " · "}
							{part.painted ? (
								<Painted role="word" at={at} />
							) : (
								partText(part.value as Part, META_CUT)
							)}
						</Fragment>
					))}
				</p>
			) : null}
			{stood.length > 0 ? (
				<div className={cn(ITEM_FACTS, FACTS)}>
					{stood.map((fact, at) =>
						fact.painted ? (
							// biome-ignore lint/suspicious/noArrayIndexKey: a painted fact has no text to key by
							<PaintedFact key={at} fact={fact.value} at={at} />
						) : (
							<FactPart
								key={factKey(fact.value as Fact<V>)}
								fact={fact.value as Fact<V>}
							/>
						),
					)}
				</div>
			) : null}
		</div>
	);
}
