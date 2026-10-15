import { Collapsible } from "@base-ui/react/collapsible";
import { type Datum, useSelections } from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Act,
	IconAct,
	MenuItem,
	Part,
} from "@fcalell/ui-core/descriptors";
import { paintText } from "@fcalell/ui-core/paint";
import {
	SECTION_ACTS,
	SECTION_BODY,
	SECTION_HEAD,
	SECTION_HEAD_ROW,
	SECTION_TITLE,
	SECTION_TOGGLE,
	text,
} from "@fcalell/ui-core/variants";
import { type ReactNode, use, useMemo } from "react";
import { HeadingContext } from "../../lib/heading.ts";
import { Painted } from "../../lib/paint.tsx";
import { partText } from "../../lib/parts.ts";
import {
	BusyMark,
	endedItems,
	endedReason,
	type Frame,
	FrameLine,
} from "../../lib/read.tsx";
import { ReasonHostContext, usePressed } from "../../lib/reason.ts";
import { useTouched } from "../../lib/touched.ts";
import { useWords } from "../../lib/words.tsx";
import { ButtonBase } from "../button/base.tsx";
import { Reason } from "../button/reason.tsx";
import { Count } from "../count/index.tsx";
import { Icon } from "../icon/index.tsx";
import { IconButton } from "../icon-button/index.tsx";
import { MenuBase } from "../menu/base.tsx";
import { Text } from "../text/index.tsx";

// A waiting description is one line, clipped where it ends: the loaded one is
// a short sentence, and a bar that wraps would be taller than it.
const PAINTED_LINE = "block overflow-hidden whitespace-nowrap";
const HEAD = "flex flex-col";
const HEAD_ROW = "flex items-center";
// On touch a labelled act that would squeeze the title column wraps under the
// title: the column's basis is its own width, so the row breaks once the
// title, its count and its description cannot stand beside the act.
const WRAP = "touch:flex-wrap";
const TITLE_BLOCK = "flex flex-col grow shrink-10000000 min-w-0";
const TITLE_LINE = "flex items-center min-w-0";
const TITLE_FOLD = "flex min-w-0";
const TITLE = "truncate";
// The chevron draws in the toggle's ink (currentColor), stepping to the body
// ink under the pointer.
const TOGGLE =
	"flex items-center grow min-w-0 -ms-inside text-start text-ink-meta hover:bg-wash-hover hover:text-ink-body active:bg-wash-press active:text-ink-body";
// The act and the more stand a row's act gap apart (`SECTION_ACTS`, as ListRow's).
const ACT_SLOT = "flex items-center min-w-0 max-w-full";

/** A Section's head: the heading with its count, its description, its act and more, the line of its read's state and a blocked act's reason. It subscribes to the description, the act and the more itself, so one of those reads landing renders the head and nothing under the Section's body. Outside the package's exports. */
export function SectionHead(props: {
	title: Part;
	/** The body's total, when the frame gives none. */
	count?: number;
	description?: Datum<string>;
	act?: Datum<Act | IconAct>;
	more?: Datum<readonly MenuItem[]>;
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
	const [said, shownAct, shownMore] = useSelections([description, act, more]);
	const { touched } = useTouched();
	const words = useWords();
	const given = shownAct.painted ? undefined : shownAct.value;
	// An act whose own read ended stands blocked with its sentence, never a
	// false yes.
	const ended = shownAct.painted
		? endedReason(words, shownAct.phase)
		: undefined;
	const blocked =
		ended ??
		(given !== undefined && "blocked" in given ? given.blocked : undefined);
	const [pressed, press] = usePressed(blocked);
	const host = useMemo(
		() => (blocked === undefined ? undefined : { press }),
		[blocked, press],
	);
	let sentence: ReactNode = null;
	if (said.painted)
		sentence = (
			<Text role="meta">
				<span className={PAINTED_LINE}>
					<Painted role="phrase" />
				</span>
			</Text>
		);
	else if (said.value) sentence = <Text role="meta">{said.value}</Text>;
	// A count is not drawn until its body has answered: a painted chip would
	// carry an unseen "0" for a number nobody knows yet, and the count arrives at
	// the title's end, where it moves nothing. A read of an array gives its length.
	const answered = frame.form === "ready" || frame.form === "empty";
	const total = answered ? (frame.count ?? count) : undefined;
	const tally =
		total !== undefined && total !== 0 ? <Count value={total} /> : null;
	// An act paints, inert, while its own datum waits; the frame's read is not
	// its concern. A selection's shape is unknown until it lands, so its paint is
	// a labelled act.
	const labelled =
		shownAct.painted || (given !== undefined && !("icon" in given));
	let actNode: ReactNode = null;
	if (shownAct.painted)
		actNode = (
			<ReasonHostContext value={host}>
				<ButtonBase
					act="secondary"
					fit="bar"
					label={ended ?? paintText("word")}
					blocked={ended}
					painted={ended === undefined}
				/>
			</ReasonHostContext>
		);
	else if (given !== undefined && "icon" in given)
		actNode = (
			<IconButton
				icon={given.icon}
				fit="bar"
				label={given.label}
				onAct={given.onAct}
				failed={given.failed}
			/>
		);
	else if (given !== undefined)
		actNode = (
			<ReasonHostContext value={host}>
				<ButtonBase
					act={given.destructive ? "destructive" : "secondary"}
					fit="bar"
					label={given.label}
					onAct={given.onAct}
					failed={given.failed}
					blocked={given.blocked}
				/>
			</ReasonHostContext>
		);
	const moreEnded = shownMore.painted
		? endedReason(words, shownMore.phase)
		: undefined;
	const items = moreEnded
		? endedItems(words, moreEnded)
		: shownMore.painted
			? []
			: (shownMore.value ?? []);
	const name = (
		<>
			<span className={cn(text({ role: "heading" }), TITLE)}>
				{partText(title)}
			</span>
			{tally}
			<BusyMark frame={frame} />
		</>
	);
	return (
		<div className={cn(SECTION_HEAD, HEAD)}>
			<div
				className={cn(
					SECTION_BODY,
					SECTION_HEAD_ROW,
					HEAD_ROW,
					labelled && WRAP,
				)}
			>
				<div className={TITLE_BLOCK}>
					{foldable ? (
						<Heading className={TITLE_FOLD}>
							<Collapsible.Trigger
								aria-controls={bodyId}
								className={cn(SECTION_TOGGLE, TOGGLE)}
							>
								{name}
								<Icon name={open ? "ChevronDown" : "ChevronRight"} />
							</Collapsible.Trigger>
						</Heading>
					) : (
						<Heading className={cn(SECTION_TITLE, TITLE_LINE)}>{name}</Heading>
					)}
					{sentence}
				</div>
				{actNode || shownMore.painted || items.length ? (
					<div className={cn(SECTION_ACTS, ACT_SLOT)}>
						{actNode}
						{shownMore.painted || items.length ? (
							<MenuBase
								label={`${words.more} ${partText(title)}`}
								title={partText(title)}
								items={items}
								painted={shownMore.painted && moreEnded === undefined}
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
