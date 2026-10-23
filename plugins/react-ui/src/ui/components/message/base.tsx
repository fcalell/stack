import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "@fcalell/ui-core/cn";
import type { Message, MessageDetail } from "@fcalell/ui-core/descriptors";
import { closeOpenRuns } from "@fcalell/ui-core/streaming";
import {
	CARD,
	FIGURES,
	MESSAGE_BUBBLE,
	MESSAGE_CODE,
	MESSAGE_ENTRY,
	MESSAGE_FOLD,
	MESSAGE_HEAD,
	MESSAGE_LINE,
	MESSAGE_OPEN,
	message,
	STREAM_IN,
	text,
	textStrong,
} from "@fcalell/ui-core/variants";
import { memo, type ReactNode, useId, useState } from "react";
import { RunText } from "../../lib/code.tsx";
import { moment } from "../../lib/moment.ts";
import { Painted } from "../../lib/paint.tsx";
import { filled, joinParts, META_CUT } from "../../lib/parts.ts";
import { Turn } from "../../lib/turn.tsx";
import { Icon } from "../icon/index.tsx";
import { Prose } from "../prose/index.tsx";
import { PaintedProse } from "../prose/painted.tsx";
import { RowBase } from "../row/index.tsx";
import { Attachments } from "./attachments.tsx";

const STACK = "flex flex-col";
const YOURS = "flex flex-col items-end";
// The line centred; a free act's code or an open fold's lines under it
// start-aligned across the column.
const SYSTEM = "flex flex-col items-center justify-center text-center";
// Each wraps at its spaces, breaking a token only when it outruns the line.
const DETAIL = "self-stretch text-start whitespace-pre-wrap";
const FRAMED = "flex flex-col overflow-hidden";
const LINE_TEXT = "inline-flex flex-wrap justify-center min-w-0";
const OPEN =
	"inline-flex items-center min-w-0 hover:bg-wash-hover active:bg-wash-press";
const HEAD = "flex items-baseline";
const BUBBLE = "max-w-4/5";
// A token too long for the line (a link, a hash) breaks anywhere.
const BODY = "whitespace-pre-wrap";
const WORDS = "min-w-0";
const TRAIL_END = "max-w-4/5 text-end";
// A time reads as one unit: it never shrinks or breaks beside a long line.
const TIME = "shrink-0 whitespace-nowrap";

// A system line and its detail: the fold's toggle over its lines, or the line
// (an act with `onOpen`) over the code, the line centred and the detail
// start-aligned across the column; a row's hairline card stands under them.
function SystemMessage(props: {
	body: string;
	time: ReactNode;
	onOpen?: () => void;
	detail?: MessageDetail;
	arrives?: boolean;
}) {
	const { body, time, onOpen, detail, arrives } = props;
	const [open, setOpen] = useState(false);
	const linesId = useId();
	// The fold opens and closes as a block: the lines come in or go and what
	// follows moves with them.
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
				<Turn name="ChevronDown" fit="meta" turned={!open} by="quarter" />
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
		<div
			className={cn(
				message({ author: "system" }),
				SYSTEM,
				arrives && !detail?.row && STREAM_IN,
			)}
		>
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
		<div className={cn(MESSAGE_ENTRY, STACK, arrives && STREAM_IN)}>
			{centred}
			<div className={cn(CARD, FRAMED)}>
				<RowBase {...detail.row} />
			</div>
		</div>
	);
}

/** One turn as every Message draws it: a thread's `Message`, or `painted` (the other author's reply while a thread's items are not here: the name's filler when `name` is set and a paragraph of filler, inert). `arrives` is a turn that came to the end of a log on its own, which rises in (`STREAM_IN`). Memoised on its props: a thread's re-render skips each message whose author, body and time are unchanged. Outside the package's exports. */
export const MessageBase = memo(function MessageBase(
	props:
		| (Message & { arrives?: boolean })
		| { painted: true; name?: boolean; at?: number },
) {
	if ("painted" in props)
		return (
			<article inert className={cn(message({ author: "other" }), STACK)}>
				{props.name ? (
					<p className={cn(MESSAGE_HEAD, HEAD)}>
						<span
							className={cn(
								text({ role: "body" }),
								textStrong({ role: "body" }),
							)}
						>
							<Painted role="name" at={props.at} />
						</span>
					</p>
				) : null}
				<PaintedProse rows={1} at={props.at} />
			</article>
		);
	const { author, body, at } = props;
	const time = at ? (
		<time dateTime={at} className={cn(text({ role: "meta" }), FIGURES, TIME)}>
			{moment(at)}
		</time>
	) : null;
	if (author === "system")
		return (
			<SystemMessage
				body={body}
				time={time}
				onOpen={props.onOpen}
				detail={props.detail}
				arrives={props.arrives}
			/>
		);
	const { name, attachments, meta } = props;
	const attached = attachments?.length ? (
		<Attachments attachments={attachments} end={author === "you"} />
	) : null;
	// The provenance leads the time, one unit that wraps at its dots.
	const line = meta?.some(filled) ? (
		<span
			className={cn(
				text({ role: "meta" }),
				WORDS,
				author === "you" && TRAIL_END,
			)}
		>
			<RunText runs={joinParts(meta, META_CUT)} />
			{time ? " · " : null}
			{time}
		</span>
	) : (
		time
	);
	if (author === "you")
		return (
			<article
				className={cn(message({ author }), YOURS, props.arrives && STREAM_IN)}
			>
				{attached}
				{body ? (
					<div className={cn(MESSAGE_BUBBLE, BUBBLE)}>
						<p className={cn(text({ role: "body" }), BODY)}>{body}</p>
					</div>
				) : null}
				{line}
			</article>
		);
	return (
		<article
			className={cn(message({ author }), STACK, props.arrives && STREAM_IN)}
		>
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
			{body ? (
				<Prose markdown={props.streaming ? closeOpenRuns(body) : body} />
			) : null}
		</article>
	);
});
