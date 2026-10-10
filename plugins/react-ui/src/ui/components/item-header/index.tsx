import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type {
	IconAct,
	MenuItem,
	OptionPick,
	Part,
	Route,
	StatusState,
} from "@fcalell/ui-core/descriptors";
import {
	ITEM_FACT,
	ITEM_FACTS,
	ITEM_HEADER,
	ITEM_HEADER_ACTS,
	ITEM_HEADER_LINE,
	lineBox,
	SKELETON_LINES,
	skeleton,
	skeletonRow,
	text,
	WORD_ACT,
} from "@fcalell/ui-core/variants";
import { use, useRef } from "react";
import type { Closed } from "../../lib/closed.ts";
import { OverThread } from "../../lib/frame.ts";
import { HeadingContext } from "../../lib/heading.ts";
import { useTouch } from "../../lib/media.ts";
import { follow } from "../../lib/navigate.ts";
import { joinParts, META_CUT, partText } from "../../lib/parts.ts";
import { useWords } from "../../lib/words.tsx";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { Menu } from "../menu/index.tsx";
import { PickerBase } from "../picker/base.tsx";
import { Status } from "../status/index.tsx";
import { COLUMN_FILLED } from "../thread/fill.ts";

const HEAD = "flex flex-col";
const OVERLINE = "truncate";
// The first line holds the acts at its end: the line's text takes the rest.
const LINE = "flex items-center";
const LINE_TEXT = "min-w-0 grow";
const ACTS = "flex items-center shrink-0";
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
// Where the facts wrap to a second line (a window under `tablet`) the
// loading head reserves it.
const WRAP_WAIT = "hidden max-tablet:flex items-center h-lh";
const FACTS_WAIT = "flex flex-col";
const FACTS_LINE_WAIT = "flex items-center";
// The waiting count is a bar one figure wide, set by an unseen figure.
const COUNT_WAIT = "inline-flex shrink-0 items-center";
const FIGURE_WAIT = "opacity-0 tabular-nums";

/** One fact under the title: words, a status, words that open a sheet or go to a route, a status that moves (a pick whose options carry states), a count beside its word, or the state of a save that runs as the record is typed, a failed one with its retry (each string a short phrase; the facts line wraps between facts, a `Quoted` part is cut at 40 characters). */
export type Fact<V extends string | null = string> =
	| Part
	| { status: StatusState; label?: string }
	| { label: Part; onOpen: () => void }
	| { label: Part; href: Route; onOpen?: never }
	| { pick: OptionPick<V> }
	| { count: number; label: string }
	| { save: "saving" | "saved" | "failed"; onRetry: () => void };

/** A record's head. */
export interface ItemHeaderProps<V extends string | null = string>
	extends Closed {
	/** The parts that place the record (its project, key, cycle), joined by a middle dot over the title (each a short phrase; one line, truncates). */
	overline?: readonly Part[];
	/** The record's name (a short phrase; wraps in full). */
	title: Part;
	/** The facts in a wrapping line under the title. */
	facts?: readonly Fact<V>[];
	/** The record's icon acts, in order, at the end of the head's first line (the overline's, else the title's), at every width: below `tablet` they stay here and the Place's strip or top bar holds none of them (for a record in a Split's main; a pushed `Screen` has its own). */
	actions?: IconAct[];
	/** The acts past the actions, in a menu under the more act after them. */
	more?: MenuItem[];
	/** Bars in each line's box stand in for the head, at its height. No acts draw while it stands. */
	loading?: boolean;
}

function factKey<V extends string | null>(fact: Fact<V>): string {
	if (typeof fact === "object" && "pick" in fact) return fact.pick.label;
	if (typeof fact === "object" && ("onOpen" in fact || "href" in fact))
		return partText(fact.label);
	if (typeof fact === "object" && "status" in fact)
		return `${fact.status} ${fact.label ?? ""}`;
	if (typeof fact === "object" && "count" in fact)
		return `${fact.count} ${fact.label}`;
	if (typeof fact === "object" && "save" in fact) return "save";
	return partText(fact);
}

// The save fact stands in one grid cell. Under `tablet`, where the facts wrap,
// it holds its widest form's room (the failed form, a status and a retry, drawn
// unseen under the live one), so the line wraps the same as the save moves
// between its states; from `tablet` it takes the live form's own width. Like
// the pick it pulls back at both ends by a control box's padding.
const SAVE = "inline-grid -mx-inside";
const SAVE_FORM = "col-start-1 row-start-1 inline-flex items-center";
const SAVE_ROOM =
	"col-start-1 row-start-1 items-center invisible hidden max-tablet:inline-flex";
const SAVE_WORDS = cn(WORD_ACT, ITEM_FACT, FACT);

function Retry() {
	const words = useWords();
	return (
		<>
			<Icon name="RotateCcw" fit="meta" />
			<span className={text({ role: "meta" })}>{words.retry}</span>
		</>
	);
}

// The region stands from the record's open, `saved` at rest, and stays mounted
// as the save moves between its states, and holds the focus a pressed Retry
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
		<span className={SAVE}>
			<span aria-hidden className={SAVE_ROOM}>
				<span className={SAVE_WORDS}>
					<Status state="failed" label={words.notSaved} />
				</span>
				<span className={cn(WORD_ACT, ITEM_FACT, ACT)}>
					<Retry />
				</span>
			</span>
			<span className={SAVE_FORM}>
				<span ref={region} tabIndex={-1} role="status" className={SAVE_WORDS}>
					{save === "failed" ? (
						<Status state="failed" label={words.notSaved} />
					) : (
						<span className={text({ role: "meta" })}>{words[save]}</span>
					)}
				</span>
				{save === "failed" ? (
					<BaseButton onClick={retry} className={cn(WORD_ACT, ITEM_FACT, ACT)}>
						<Retry />
					</BaseButton>
				) : null}
			</span>
		</span>
	);
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
				<PickerBase {...fact.pick} fit="row" />
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

/** The overline, the title at the title role and the facts, a pair apart whether the title wraps or not, and the record's acts and more at the end of the first line. The title is a heading at the level where the header stands. With no facts line it stands a pair, not a sections step, above what follows in a Split's main. Over a Thread filling a Split's main it stands in the Thread's column on the desktop. */
export function ItemHeader<V extends string | null = string>({
	overline,
	title,
	facts,
	actions,
	more,
	loading,
}: ItemHeaderProps<V>) {
	const words = useWords();
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
				<span className={cn(lineBox({ role: "title" }), LINE_WAIT)}>
					<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
				</span>
				<span className={cn(SKELETON_LINES, FACTS_WAIT)}>
					<span className={cn(skeletonRow({ kind: "facts" }), FACTS_LINE_WAIT)}>
						<span className={cn(skeleton({ kind: "line" }), "w-1/3")} />
						<span className={cn(skeleton({ kind: "count" }), COUNT_WAIT)}>
							<span className={cn(text({ role: "caption" }), FIGURE_WAIT)}>
								0
							</span>
						</span>
					</span>
					<span className={cn(lineBox({ role: "meta" }), WRAP_WAIT)}>
						<span className={cn(skeleton({ kind: "line" }), "w-1/2")} />
					</span>
				</span>
			</div>
		);
	const fit = touch ? "body" : "bar";
	const acts =
		(actions?.length ?? 0) > 0 || (more?.length ?? 0) > 0 ? (
			<div className={cn(ITEM_HEADER_ACTS, ACTS)}>
				{actions?.map((action) => (
					<IconButton key={action.label} {...action} fit={fit} />
				))}
				{more?.length ? <Menu label={words.more} items={more} /> : null}
			</div>
		) : null;
	const overlined = overline && overline.length > 0;
	const overlineLine = overlined ? (
		<p className={cn(text({ role: "meta" }), OVERLINE, acts && LINE_TEXT)}>
			{joinParts(overline, META_CUT)}
		</p>
	) : null;
	const heading = (
		<Heading
			className={cn(text({ role: "title" }), acts && !overlined && LINE_TEXT)}
		>
			{partText(title)}
		</Heading>
	);
	return (
		<header className={cn(ITEM_HEADER, HEAD, column)}>
			{acts ? (
				<div className={cn(ITEM_HEADER_LINE, LINE)}>
					{overlined ? overlineLine : heading}
					{acts}
				</div>
			) : (
				overlineLine
			)}
			{acts && !overlined ? null : heading}
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
