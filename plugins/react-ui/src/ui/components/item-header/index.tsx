import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type {
	OptionPick,
	Part,
	StatusState,
} from "@fcalell/ui-core/descriptors";
import {
	ITEM_FACT,
	ITEM_FACTS,
	ITEM_HEADER,
	lineBox,
	PILL_ACT,
	SKELETON_LINES,
	skeleton,
	skeletonRow,
	text,
} from "@fcalell/ui-core/variants";
import { use, useRef } from "react";
import type { Closed } from "../../lib/closed.ts";
import { OverThread } from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { useTouch } from "../../lib/media.ts";
import { joinParts, META_CUT, partText } from "../../lib/parts.ts";
import { useWords } from "../../lib/words.tsx";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import { PickerBase } from "../picker/base.tsx";
import { Status } from "../status/index.tsx";
import { COLUMN_FILLED } from "../thread/fill.ts";

const HEAD = "flex flex-col";
const OVERLINE = "truncate";
const FACTS = "flex flex-wrap items-center";
const FACT = "inline-flex items-center";
// A pick in the facts line pulls back at its start as well as its end, so its
// dot and word sit where a plain fact's would.
const PICK = "inline-flex -ms-inside";
// A fact that acts washes at the pointer, its words in the meta ink; one that
// opens pulls back at its start as a pick does.
const ACT =
	"inline-flex items-center text-ink-meta hover:bg-wash-hover active:bg-wash-press";
const OPEN = cn(ACT, "-ms-inside");
// A loading line stands in its text's line box, so the loading head keeps
// the loaded head's height.
const LINE_WAIT = "flex items-center h-lh";
// On touch the facts wrap to a second line, which the loading head reserves.
const WRAP_WAIT = "hidden touch:flex items-center h-lh";
const FACTS_WAIT = "flex flex-col";
const FACTS_LINE_WAIT = "flex items-center";
const COUNT_WAIT = "inline-flex shrink-0";

/** One fact under the title: words, a status, words that open a sheet, a status that moves (a pick whose options carry states), a count beside its word, or the state of a save that runs as the record is typed, a failed one with its retry. */
export type Fact<V extends string | null = string> =
	| Part
	| { status: StatusState; label?: string }
	| { label: Part; onOpen: () => void }
	| { pick: OptionPick<V> }
	| { count: number; label: string }
	| { save: "saving" | "saved" | "failed"; onRetry: () => void };

/** A record's head. */
export interface ItemHeaderProps<V extends string | null = string>
	extends Closed {
	/** The parts that place the record (its project, key, cycle), joined by a middle dot over the title. */
	overline?: readonly Part[];
	/** The record's name, wrapping in full. */
	title: Part;
	/** The facts in a wrapping line under the title. */
	facts?: readonly Fact<V>[];
	/** Bars in each line's box stand in for the head, at its height. */
	loading?: boolean;
}

function factKey<V extends string | null>(fact: Fact<V>): string {
	if (typeof fact === "object" && "pick" in fact) return fact.pick.label;
	if (typeof fact === "object" && "onOpen" in fact) return partText(fact.label);
	if (typeof fact === "object" && "status" in fact)
		return `${fact.status} ${fact.label ?? ""}`;
	if (typeof fact === "object" && "count" in fact)
		return `${fact.count} ${fact.label}`;
	if (typeof fact === "object" && "save" in fact) return "save";
	return partText(fact);
}

// The region stands from the record's open, `saved` at rest, and stays mounted
// as the save moves between its states, so a screen reader announces each
// change, the first "Saving…" included. It holds the focus a pressed Retry
// leaves as that act gives way to the saving words.
function SaveFact({
	save,
	onRetry,
}: {
	save: "saving" | "saved" | "failed";
	onRetry: () => void;
}) {
	const words = useWords();
	const region = useRef<HTMLSpanElement>(null);
	const retry = () => {
		onRetry();
		region.current?.focus();
	};
	return (
		<span className={cn(ITEM_FACT, FACT)}>
			<span
				ref={region}
				tabIndex={-1}
				role="status"
				className={cn(ITEM_FACT, FACT)}
			>
				{save === "failed" ? (
					<Status state="failed" label={words.notSaved} />
				) : (
					<span className={text({ role: "meta" })}>{words[save]}</span>
				)}
			</span>
			{save === "failed" ? (
				<BaseButton onClick={retry} className={cn(PILL_ACT, ACT)}>
					<span className={text({ role: "meta" })}>{words.retry}</span>
				</BaseButton>
			) : null}
		</span>
	);
}

function FactPart<V extends string | null>({ fact }: { fact: Fact<V> }) {
	if (typeof fact === "object" && "onOpen" in fact)
		return (
			<BaseButton
				onClick={fact.onOpen}
				className={cn(PILL_ACT, ITEM_FACT, OPEN)}
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
				<PickerBase {...fact.pick} fit="row" align="start" />
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
	if (typeof fact === "object" && "save" in fact)
		return <SaveFact save={fact.save} onRetry={fact.onRetry} />;
	return (
		<span className={text({ role: "meta" })}>{partText(fact, META_CUT)}</span>
	);
}

/** The overline, the title at the heading role and the facts, a pair apart whether the title wraps or not. The title is a heading at the level where the header stands. Over a Thread filling a Split's main it stands in the Thread's column on the desktop. */
export function ItemHeader<V extends string | null = string>({
	overline,
	title,
	facts,
	loading,
}: ItemHeaderProps<V>) {
	const level = use(HeadingContext);
	const Heading = `h${level}` as const;
	// The column is a structure that follows density, as the Thread's is.
	const overThread = use(OverThread);
	const touch = useTouch();
	const column = overThread && !touch && COLUMN_FILLED;
	if (loading)
		return (
			<div aria-busy className={cn(ITEM_HEADER, HEAD, column)}>
				<span className={cn(lineBox({ role: "meta" }), LINE_WAIT)}>
					<span className={cn(skeleton({ kind: "line" }), "w-1/4")} />
				</span>
				<span className={cn(lineBox({ role: "heading" }), LINE_WAIT)}>
					<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
				</span>
				<span className={cn(SKELETON_LINES, FACTS_WAIT)}>
					<span className={cn(skeletonRow({ kind: "facts" }), FACTS_LINE_WAIT)}>
						<span className={cn(skeleton({ kind: "line" }), "w-1/3")} />
						<span className={cn(skeleton({ kind: "count" }), COUNT_WAIT)} />
					</span>
					<span className={cn(lineBox({ role: "meta" }), WRAP_WAIT)}>
						<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
					</span>
				</span>
			</div>
		);
	return (
		<header className={cn(ITEM_HEADER, HEAD, column)}>
			{overline && overline.length > 0 ? (
				<p className={cn(text({ role: "meta" }), OVERLINE)}>
					{joinParts(overline, META_CUT)}
				</p>
			) : null}
			<Heading className={text({ role: "heading" })}>{partText(title)}</Heading>
			{facts && facts.length > 0 ? (
				<div className={cn(ITEM_FACTS, FACTS)}>
					{facts.map((fact) => (
						<FactPart key={factKey(fact)} fact={fact} />
					))}
				</div>
			) : null}
		</header>
	);
}
