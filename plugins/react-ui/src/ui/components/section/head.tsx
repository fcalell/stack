import { Collapsible } from "@base-ui/react/collapsible";
import {
	type Datum,
	paints,
	useDrawsFailure,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type { IconLinkAct, Run } from "@fcalell/ui-core/descriptors";
import { endedReason } from "@fcalell/ui-core/read";
import {
	PAGE_TITLE_FLOOR,
	SECTION_ACTS,
	SECTION_HEAD,
	SECTION_HEAD_ROW,
	SECTION_LABEL,
	SECTION_TITLE,
	SECTION_TOGGLE,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useMemo } from "react";
import type { IconAct, MenuEntry } from "../../lib/act.ts";
import { RunText } from "../../lib/code.tsx";
import { HeadingContext } from "../../lib/heading.ts";
import { Painted } from "../../lib/paint.tsx";
import { partRuns, partText } from "../../lib/parts.ts";
import { BusyMark, type Frame, FrameLine, moreMenu } from "../../lib/read.tsx";
import { ReasonHostContext, usePressed } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { Turn } from "../../lib/turn.tsx";
import { useWords } from "../../lib/words.tsx";
import { IconActFace } from "../button/face.tsx";
import { IconButtonBase } from "../button/glyph.tsx";
import { Reason } from "../button/reason.tsx";
import { Count } from "../count/index.tsx";
import { MenuBase } from "../menu/base.tsx";
import { Text } from "../text/index.tsx";

// An ended act's press: it is blocked, so its reason stands instead.
const NOOP = () => {};

// A waiting description is one line, clipped where it ends: the loaded one is
// a short sentence, and a bar that wraps would be taller than it.
const PAINTED_LINE = "block overflow-hidden whitespace-nowrap";
const HEAD = "flex flex-col";
const HEAD_ROW = "flex items-center";
// The title keeps its floor (`PAGE_TITLE_FLOOR`) and its act is an icon, so
// nothing folds. On the desktop the head is one line and the title truncates;
// on touch, where the acts leave it a short line, the title wraps whole, so a
// short name is never cut to its first letters.
const TITLE_BLOCK = "flex flex-col grow min-w-0";
const TITLE_LINE = "flex items-center min-w-0";
const TITLE_FOLD = "flex min-w-0";
const TITLE = "truncate touch:whitespace-normal touch:break-words";
// The heading and its count stand on one baseline, the sizes differing; the
// busy mark and the chevron beside them stay centred on the line. The group
// is the heading's own line (`1lh` of the heading role), so a count that
// arrives, its smaller box hanging lower under the baseline, never grows the
// head; a wrapped title on touch grows it by its lines.
const NAME =
	"flex items-baseline min-w-0 h-[1lh] touch:h-auto touch:min-h-[1lh]";
// The chevron draws in the toggle's ink (currentColor), stepping to the body
// ink under the pointer. The toggle is a target tall, its label centred, and
// overhangs the label's line above and below by what the target has over it
// (`1lh` at the label's leading), so the head takes the line alone and a
// folding heading stands where a plain one does after the same gap.
const TOGGLE =
	"flex items-center grow min-w-0 -ms-gap leading-caption -my-[calc((var(--spacing-target)-1lh)*0.5)] text-start text-ink-meta hover:bg-wash-hover hover:text-ink-body active:bg-wash-press active:text-ink-body";
// The act and the more stand a row's act gap apart (`SECTION_ACTS`, as a list row's).
const ACTS = "relative flex items-center min-w-0 max-w-full";

/** A Section's head: the heading with its count, its description, its act and more, the line of its read's state and a blocked act's reason. It subscribes to the description, the act and the more itself, so one of those reads landing renders the head and nothing under the Section's body. Outside the package's exports. */
export function SectionHead(props: {
	title: Datum<Run>;
	/** The body is a list (`items` that are not facts alone): only a list's head counts, so a head over parts, or over a sheet whose every row has a label (a definition list), draws none whatever its frame's read holds. */
	list: boolean;
	/** The body's total, when the frame gives none. */
	count?: number;
	description?: Datum<string>;
	act?: Datum<IconAct | IconLinkAct>;
	more?: Datum<readonly MenuEntry[]>;
	/** The Section folds: the title is the toggle. */
	foldable: boolean;
	open: boolean;
	/** The id of the body the toggle controls. */
	bodyId: string;
	/** The Section's frame, whose count, busy mark and state line the head draws. */
	frame: Frame;
}) {
	const {
		title,
		list,
		count,
		description,
		act,
		more,
		foldable,
		open,
		bodyId,
		frame,
	} = props;
	const level = use(HeadingContext);
	const Heading = `h${level}` as const;
	const [named, said, shownAct, shownMore] = useSelections([
		title,
		description,
		act,
		more,
	]);
	// A title Datum is a selection of the read the Section holds, never a second
	// read; one whose read ended draws no text, and the frame says why.
	const heading = named.painted ? undefined : (named.value as Run);
	const label = heading === undefined ? "" : partText(heading);
	// A painted title is filler: its heading is hidden from assistive tech and
	// inert, as a painted description is, until the title lands.
	const waiting = paints(named) ? { "aria-hidden": true, inert: true } : {};
	useDrawsFailure([act, more]);
	const { touched } = useTouched();
	const words = useWords();
	// An act whose own read ended stands blocked with its sentence, never a
	// false yes: its glyph and name went with the read, so it is the alert
	// glyph named by the sentence, which a press stands on the head's line.
	const ended = shownAct.painted
		? endedReason(words, shownAct.phase)
		: undefined;
	const given: IconAct | IconLinkAct | undefined =
		ended !== undefined
			? { label: ended, icon: "CircleAlert", blocked: ended, onAct: NOOP }
			: shownAct.painted
				? undefined
				: shownAct.value;
	const blocked = ended ?? given?.blocked;
	const [pressed, press] = usePressed(blocked);
	// The act hands its blocked press here, so its reason stands on the head's
	// own line under the row.
	const host = useMemo(
		() => (blocked === undefined ? undefined : { press }),
		[blocked, press],
	);
	let sentence: ReactNode = null;
	if (paints(said))
		sentence = (
			<Text role="meta">
				<span className={PAINTED_LINE}>
					<Painted role="phrase" />
				</span>
			</Text>
		);
	else if (!said.painted && said.value)
		sentence = <Text role="meta">{said.value}</Text>;
	// A count is not drawn until its body has answered: a painted chip would
	// carry an unseen "0" for a number nobody knows yet, and the count arrives at
	// the title's end, where it moves nothing. A read of an array gives its length.
	// A count is a list's: over parts (cards, controls) or facts the head draws none.
	const answered = list && (frame.form === "ready" || frame.form === "empty");
	const total = answered ? (frame.count ?? count) : undefined;
	const tally =
		total !== undefined && total !== 0 ? <Count value={total} /> : null;
	// An act paints, inert, while its own datum waits; the frame's read is not
	// its concern. An act beside a heading is an icon act: its words are its
	// accessible name and its tooltip, never drawn beside the title.
	let actNode: ReactNode = null;
	if (shownAct.painted && ended === undefined)
		actNode = <IconButtonBase icon="Plus" label="" painted />;
	else if (given !== undefined)
		actNode = (
			<ReasonHostContext value={host}>
				<IconActFace act={given} />
			</ReasonHostContext>
		);
	const menu = moreMenu(words, shownMore);
	const shown = (
		<>
			<span
				className={cn(
					text({ role: "heading" }),
					SECTION_LABEL,
					SECTION_TITLE,
					NAME,
				)}
			>
				<span className={TITLE}>
					{heading !== undefined ? (
						<RunText runs={partRuns(heading)} fit="name" />
					) : paints(named) ? (
						<Painted role="title" />
					) : null}
				</span>
				{tally}
			</span>
			<BusyMark frame={frame} />
		</>
	);
	// A title whose read ended (failed or missing) draws no head: the Section's
	// failed or missing form stands alone in its place.
	if (named.painted && !paints(named)) return null;
	return (
		<div className={cn(SECTION_HEAD, HEAD)}>
			<div className={cn(SECTION_HEAD_ROW, HEAD_ROW)}>
				<div className={cn(TITLE_BLOCK, PAGE_TITLE_FLOOR)}>
					{foldable ? (
						<Heading className={TITLE_FOLD} {...waiting}>
							<Collapsible.Trigger
								aria-controls={bodyId}
								className={cn(SECTION_TOGGLE, TOGGLE)}
							>
								{shown}
								<Turn name="ChevronDown" turned={!open} by="quarter" />
							</Collapsible.Trigger>
						</Heading>
					) : (
						<Heading className={cn(SECTION_TITLE, TITLE_LINE)} {...waiting}>
							{shown}
						</Heading>
					)}
					{sentence}
				</div>
				{actNode || menu.painted || menu.items.length ? (
					<div className={cn(SECTION_ACTS, ACTS)}>
						{actNode}
						{menu.painted || menu.items.length ? (
							<MenuBase
								label={`${words.more} ${label}`}
								title={label}
								items={menu.items}
								painted={menu.painted}
							/>
						) : null}
					</div>
				) : null}
			</div>
			<FrameLine frame={frame} />
			{blocked === undefined ? null : (
				<Reason shown={pressed || touched} end>
					{blocked}
				</Reason>
			)}
		</div>
	);
}
