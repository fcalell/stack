import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Attachment,
	MessageDetail,
	Part,
} from "@fcalell/ui-core/descriptors";
import {
	lineBox,
	MESSAGE_BUBBLE,
	MESSAGE_CARD,
	MESSAGE_CODE,
	MESSAGE_ENTRY,
	MESSAGE_FOLD,
	MESSAGE_HEAD,
	MESSAGE_LINE,
	MESSAGE_OPEN,
	message,
	skeleton,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { memo, type ReactNode, useId, useState } from "react";
import type { Closed } from "../../lib/closed.ts";
import { GroundContext } from "../../lib/ground.ts";
import { moment } from "../../lib/moment.ts";
import { joinParts, META_CUT } from "../../lib/parts.ts";
import { Icon } from "../icon/index.tsx";
import { ListRow } from "../list-row/index.tsx";
import { Prose } from "../prose/index.tsx";
import { Attachments } from "./attachments.tsx";

const STACK = "flex flex-col";
const YOURS = "flex flex-col items-end";
// The line centred; a free act's code or an open fold's lines under it
// start-aligned across the column.
const SYSTEM = "flex flex-col items-center justify-center text-center";
// Each wraps at its spaces, breaking a token only when it outruns the line.
const DETAIL = "self-stretch text-start whitespace-pre-wrap wrap-break-word";
const FRAMED = "flex flex-col overflow-hidden";
const LINE_TEXT = "inline-flex flex-wrap justify-center min-w-0";
const OPEN =
	"inline-flex items-center min-w-0 hover:bg-wash-hover active:bg-wash-press";
const HEAD = "flex items-baseline";
const BUBBLE = "max-w-4/5";
// A token too long for the line (a link, a hash) breaks anywhere.
const BODY = "whitespace-pre-wrap wrap-anywhere";
const WORDS = "min-w-0 wrap-anywhere";
const TRAIL_END = "max-w-4/5 text-end";
const LINE = "flex items-center h-lh";
const BAR = "w-full";
// A time reads as one unit: it never shrinks or breaks beside a long line.
const TIME = "shrink-0 whitespace-nowrap";
// A loading reply: one paragraph of three lines, each bar at its line's length.
const REPLY_BARS = ["w-full", "w-full", "w-2/3"] as const;
// A loading time: four figures, as the time it stands in for.
const TIME_BAR = "w-figures";

interface MessageBase extends Closed {
	/** What was said (text; wraps): plain text for `you` and `system`, markdown for `other`. */
	body: string;
	/** When it was said, an ISO moment: drawn as the time today, else the date and time. */
	at?: string;
	/** The message waits: its author's form as bars in their line boxes. */
	loading?: boolean;
}

/** One turn of a thread, by its author. */
export type MessageProps =
	| (MessageBase & {
			/** `you`, a bubble at the column's end; `other`, a reply read as Prose under its name. */
			author: "you" | "other";
			/** Who said it: drawn over `other`'s reply; yours draws none (a short phrase; wraps). */
			name?: string;
			/** What came with it, one row over the bubble (yours at the column's end) or the reply: an attachment with `src` a thumbnail that opens full size, one without a chip of its name. */
			attachments?: readonly Attachment[];
			/** Where it came from ("by voice", "Kitchen"), joined by a middle dot before the time (each a short phrase; the line wraps at its dots). */
			meta?: readonly Part[];
			onOpen?: never;
			detail?: never;
	  })
	| (MessageBase & {
			/** `system`, one meta line centred in the thread. */
			author: "system";
			/** Opens what the line names: the line becomes the act, a chevron after it. */
			onOpen?: () => void;
			/** What stands under the line, one of three: a row in a hairline card that opens its record, a free act's arguments in the code role, or lines the line opens in place (it takes no `onOpen` then). */
			detail?: MessageDetail;
			name?: never;
			attachments?: never;
			meta?: never;
	  });

// A system line and its detail: the fold's toggle over its lines, or the line
// (an act with `onOpen`) over the code, the line centred and the detail
// start-aligned across the column; a row's hairline card stands under them.
function SystemMessage(props: {
	body: string;
	time: ReactNode;
	onOpen?: () => void;
	detail?: MessageDetail;
}) {
	const { body, time, onOpen, detail } = props;
	const [open, setOpen] = useState(false);
	const linesId = useId();
	const words = (
		<span className={cn(text({ role: "meta" }), WORDS)}>{body}</span>
	);
	let line = (
		<p className={cn(MESSAGE_LINE, LINE_TEXT)}>
			{words}
			{time}
		</p>
	);
	if (detail?.fold !== undefined)
		line = (
			<BaseButton
				aria-expanded={open}
				aria-controls={linesId}
				onClick={() => setOpen(!open)}
				className={cn(MESSAGE_OPEN, OPEN)}
			>
				{words}
				{time}
				<Icon name={open ? "ChevronDown" : "ChevronRight"} fit="meta" />
			</BaseButton>
		);
	else if (onOpen)
		line = (
			<BaseButton onClick={onOpen} className={cn(MESSAGE_OPEN, OPEN)}>
				{words}
				{time}
				<Icon name="ChevronRight" fit="meta" />
			</BaseButton>
		);
	const centred = (
		<div className={cn(message({ author: "system" }), SYSTEM)}>
			{line}
			{detail?.code === undefined ? null : (
				<code className={cn(text({ role: "code" }), MESSAGE_CODE, DETAIL)}>
					{detail.code}
				</code>
			)}
			{detail?.fold === undefined ? null : (
				<p
					id={linesId}
					hidden={!open}
					className={cn(text({ role: "meta" }), MESSAGE_FOLD, DETAIL)}
				>
					{detail.fold}
				</p>
			)}
		</div>
	);
	if (detail?.row === undefined) return centred;
	return (
		<div className={cn(MESSAGE_ENTRY, STACK)}>
			{centred}
			<div className={cn(MESSAGE_CARD, FRAMED)}>
				<GroundContext value="group">
					<ListRow {...detail.row} />
				</GroundContext>
			</div>
		</div>
	);
}

// Memoised on its props: a thread's re-render skips each message whose
// author, body and time are unchanged.
/** Yours a bubble on the group ground at the column's end, its attachments in one row over it, its provenance line and the time under it; another's the name at body 500 beside the provenance and the time over its attachments and the reply as Prose; a system line one meta line centred in a row at the target height, its time beside it, its detail under it: a free act's code in the meta ink or a fold's meta lines once its chevron opens them, each start-aligned across the column, or a hairline card holding one row. */
export const Message = memo(function Message(props: MessageProps) {
	const { author, body, at, loading } = props;
	const time = at ? (
		<time dateTime={at} className={cn(text({ role: "meta" }), TIME)}>
			{moment(at)}
		</time>
	) : null;
	if (author === "system") {
		if (loading)
			return (
				<div aria-busy className={cn(message({ author }), SYSTEM)}>
					<span className={cn(lineBox({ role: "meta" }), LINE, "w-1/3")}>
						<span className={cn(skeleton({ kind: "line" }), BAR)} />
					</span>
				</div>
			);
		return (
			<SystemMessage
				body={body}
				time={time}
				onOpen={props.onOpen}
				detail={props.detail}
			/>
		);
	}
	const { name, attachments, meta } = props;
	const attached = attachments?.length ? (
		<Attachments attachments={attachments} end={author === "you"} />
	) : null;
	// The provenance leads the time, one unit that wraps at its dots.
	const line = meta?.length ? (
		<span
			className={cn(
				text({ role: "meta" }),
				WORDS,
				author === "you" && TRAIL_END,
			)}
		>
			{joinParts(meta, META_CUT)}
			{time ? " · " : null}
			{time}
		</span>
	) : (
		time
	);
	if (author === "you") {
		if (loading)
			return (
				<article aria-busy className={cn(message({ author }), YOURS)}>
					<div className={cn(MESSAGE_BUBBLE, "w-1/2")}>
						<span className={cn(lineBox({ role: "body" }), LINE)}>
							<span className={cn(skeleton({ kind: "line" }), BAR)} />
						</span>
					</div>
					<span className={cn(lineBox({ role: "meta" }), LINE)}>
						<span className={cn(skeleton({ kind: "line" }), TIME_BAR)} />
					</span>
				</article>
			);
		return (
			<article className={cn(message({ author }), YOURS)}>
				{attached}
				{body ? (
					<div className={cn(MESSAGE_BUBBLE, BUBBLE)}>
						<p className={cn(text({ role: "body" }), BODY)}>{body}</p>
					</div>
				) : null}
				{line}
			</article>
		);
	}
	if (loading)
		return (
			<article aria-busy className={cn(message({ author }), STACK)}>
				<span className={cn(lineBox({ role: "body" }), LINE)}>
					<span className={cn(skeleton({ kind: "line" }), "w-1/5")} />
				</span>
				<div className={STACK}>
					{REPLY_BARS.map((width, line) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: the lines are fixed stand-ins
							key={line}
							className={cn(lineBox({ role: "body" }), LINE)}
						>
							<span className={cn(skeleton({ kind: "line" }), width)} />
						</span>
					))}
				</div>
			</article>
		);
	return (
		<article className={cn(message({ author }), STACK)}>
			{name || line ? (
				<p className={cn(MESSAGE_HEAD, HEAD)}>
					{name ? (
						<span
							className={cn(
								text({ role: "body" }),
								textStrong({ role: "body" }),
							)}
						>
							{name}
						</span>
					) : null}
					{line}
				</p>
			) : null}
			{attached}
			{body ? <Prose markdown={body} /> : null}
		</article>
	);
});
