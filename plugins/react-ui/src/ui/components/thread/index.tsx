import { NO_HOLDS } from "@fcalell/plugin-api/read";
import {
	type Datum,
	type Drawn,
	FrameHolds,
	type Selection,
	useFrameRead,
	useSelections,
} from "@fcalell/plugin-api/tanstack-query";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Attachment,
	MessageDetail,
	Part,
} from "@fcalell/ui-core/descriptors";
import { PAINT_ROWS } from "@fcalell/ui-core/paint";
import { turnOf } from "@fcalell/ui-core/read";
import { THREAD } from "@fcalell/ui-core/variants";
import {
	memo,
	type ReactElement,
	type ReactNode,
	type RefObject,
	use,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { useFootFocus } from "../../lib/focus.ts";
import { PageTitle, useFootRegion } from "../../lib/frame.ts";
import { StateLine } from "../../lib/read.tsx";
import { useScrolls } from "../../lib/scrolls.ts";
import { Scroller, useScroller, Window } from "../../lib/window.tsx";
import { useWords } from "../../lib/words.tsx";
import { MessageBase } from "../message/base.tsx";
import { Message } from "../message/index.tsx";
import { WaitingReply } from "../message/waiting.tsx";
import { SheetDocked } from "../sheet/docked.tsx";
import type { SheetProps } from "../sheet/index.tsx";
import { Latest } from "./latest.tsx";

const STACK = "flex flex-col";
// The thread fills what it stands in by plain flex: in a Pane's body, whose
// height is definite, it takes the free height and its log scrolls; among
// sections it stands at its content's height. The input stands a sections
// gap under the log. With a foot its measurement bounds a docked sheet's body.
const FILL = "flex flex-col grow min-h-0";
// The region over the foot: the log, and the Latest act floating at its foot.
// It clips its height, so where the foot leaves it no room nothing it holds
// paints over the foot or the head.
const REGION = "relative flex flex-col grow min-h-0 overflow-y-clip";
// The log rings inset; it takes a tab stop only while it scrolls.
const SCROLLS =
	"flex flex-col grow min-h-0 overflow-y-auto focus-visible:-outline-offset-2";
// What the foot holds shrinks to its bound, so a docked form scrolls inside it.
const FOOT = "flex flex-col shrink-0 min-h-0";
// The log is at its end while its last pixel shows; a reader who scrolled
// up keeps their place as a message arrives.
const AT_END = 1;

/** One function per `Message` slot, each called with a loaded item and reading only it: a message draws again only when its item changes. */
export interface MessageSlots<T> {
	/** The item's React key, unique in the thread. */
	key: (item: T) => string;
	/** Who said it: `you`, `other` or `system`. */
	author: (item: T) => "you" | "other" | "system";
	/** Who said it, by name: drawn over `other`'s reply, yours draws none; a system line takes none (a short phrase; wraps). */
	name?: (item: T) => string | undefined;
	/** What was said (text; wraps): plain text for `you` and `system`, markdown for `other`. */
	body: (item: T) => string;
	/** When it was said, an ISO moment. */
	at?: (item: T) => string | undefined;
	/** What came with a turn: its attachments, one row over its bubble or reply; a system line takes none. */
	attachments?: (item: T) => readonly Attachment[] | undefined;
	/** Where a turn came from ("by voice", "Kitchen"), before its time; a system line takes none (each a short phrase; the line wraps at its dots). */
	meta?: (item: T) => readonly Part[] | undefined;
	/** The reply is still arriving: an `other` turn whose open Markdown marker at its end draws in its own form (see `Message`); a turn of yours or a system line takes none. */
	streaming?: (item: T) => boolean | undefined;
	/** What a system line opens: the line becomes the act; a turn takes none. */
	onOpen?: (item: T) => (() => void) | undefined;
	/** What stands under a system line (a row, a free act's code, a fold); a turn takes none. */
	detail?: (item: T) => MessageDetail | undefined;
}

/** A conversation: its messages from items, over the input that adds to it. */
export type ThreadProps<T = unknown> = Closed & {
	/** The items the messages draw, oldest first: constants, or a selection, which paints `PAINT_ROWS` messages until its read lands. A selection stands in a frame (a Pane, Section, Sheet or Form given the read), which draws the thread's failed, missing and empty forms. */
	items: Datum<readonly T[]>;
	/** The `Message` slots. */
	message: MessageSlots<T>;
	/** The `MessageInput` under the messages. */
	foot?: ReactNode;
	/** A task over the input: while it is `open` it docks in the foot in the input's place, the log keeping two rows above it, and closing hands focus back to the input. */
	sheet?: SheetProps;
	/** A reply from the other author is on its way: the loaded log ends on one waiting message of theirs, until it is cleared. */
	replying?: boolean;
	/** The turn being written, a read the app declares (a stream: `read(options, { kind: "stream" })` over `streamedQuery`, or a slice of a channel read): it draws after the items from its own subscription, so a chunk renders only it. Waiting for the first chunk it is one waiting message of the other author; writing, the message with `streaming` set; written, the message. Held as a root read, a failed stream draws the partial message, if any, then "The reply stopped." with Retry, which runs the stream again. It hides once the last item has its key, so a history that catches up shows no second turn. `null` or `undefined` is no turn. */
	reply?: Selection<T | null | undefined>;
};

// One message from its item, its Message by its author: a system line takes
// `onOpen` and `detail`, a turn takes `name`. It renders again only when its
// item does: every slot reads the item, and a system line's acts call the
// thread's latest slots when pressed, so a thread's re-render (a keystroke in
// its input, a message arriving) skips every message already drawn.
function ThreadItemBase<T>({
	item,
	slots,
	streaming,
}: {
	item: T;
	slots: RefObject<MessageSlots<T>>;
	// The reply turn's own, which overrides the slot.
	streaming?: boolean;
}) {
	const read = slots.current;
	const author = read.author(item);
	const body = read.body(item);
	const at = read.at?.(item);
	if (author !== "system")
		return (
			<Message
				author={author}
				name={read.name?.(item)}
				body={body}
				at={at}
				attachments={read.attachments?.(item)}
				meta={read.meta?.(item)}
				streaming={
					author === "other" ? (streaming ?? read.streaming?.(item)) : undefined
				}
			/>
		);
	const opens = read.onOpen?.(item) !== undefined;
	let detail = read.detail?.(item);
	const row = detail?.row;
	if (row?.onOpen)
		detail = {
			row: {
				...row,
				onOpen: () => slots.current.detail?.(item)?.row?.onOpen?.(),
			},
		};
	return (
		<Message
			author="system"
			body={body}
			at={at}
			onOpen={opens ? () => slots.current.onOpen?.(item)?.() : undefined}
			detail={detail}
		/>
	);
}

// `memo` erases the generic its component takes, so the memoised item keeps
// the base's own type.
const ThreadItem = memo(ThreadItemBase) as typeof ThreadItemBase;

// The turn being written, from its own subscription to the reply: a chunk
// renders this and nothing else in the thread. A stream that failed keeps its
// partial message and says it stopped, with the frame's retry, which runs the
// stream again.
function ReplyTurn<T>(props: {
	reply: Selection<T | null | undefined>;
	slots: RefObject<MessageSlots<T>>;
	after: string | undefined;
}) {
	const { reply, slots, after } = props;
	const words = useWords();
	const {
		state: { form, value },
		retry,
	} = useFrameRead(reply, turnOf);
	if (form === "none") return null;
	if (form === "waiting") return <WaitingReply />;
	const item = value as T | null | undefined;
	// History holds the turn already: it draws it, so this one steps aside.
	if (item != null && slots.current.key(item) === after) return null;
	return (
		<>
			{item == null ? null : (
				<ThreadItem item={item} slots={slots} streaming={form === "writing"} />
			)}
			{form === "stopped" ? (
				<StateLine
					sentence={words.replyStopped}
					act={{ label: words.retry, onAct: retry }}
				/>
			) : null}
		</>
	);
}

// What the log's window holds, oldest first: the painted messages while the
// items are not here (the other author's, since an author is the item's), else
// one Message per item.
function messagesOf<T>(
	props: ThreadProps<T>,
	drawn: Drawn<readonly T[]>,
	slots: RefObject<MessageSlots<T>>,
): ReactElement[] {
	if (drawn.painted)
		return Array.from({ length: PAINT_ROWS }, (_, at) => (
			<MessageBase
				// biome-ignore lint/suspicious/noArrayIndexKey: the messages are fixed stand-ins
				key={at}
				painted
				name={props.message.name !== undefined}
				at={at}
			/>
		));
	return drawn.value.map((item) => (
		<ThreadItem key={props.message.key(item)} item={item} slots={slots} />
	));
}

// What follows the window: the waiting message and the turn being written,
// which grow outside it, so a chunk never reaches the rows.
function tailOf<T>(
	props: ThreadProps<T>,
	drawn: Drawn<readonly T[]>,
	slots: RefObject<MessageSlots<T>>,
): ReactNode {
	if (drawn.painted) return null;
	const last = drawn.value.at(-1);
	return (
		<>
			{props.replying ? <WaitingReply /> : null}
			{props.reply ? (
				<ReplyTurn
					reply={props.reply}
					slots={slots}
					after={last === undefined ? undefined : props.message.key(last)}
				/>
			) : null}
		</>
	);
}

/** The messages, a log region so an arriving one is announced, a sections gap apart, one rung above a reply's block gap, and the input a sections gap under them. It fills what it stands in by plain flex: in a Pane's body it takes the free height and the log scrolls, opening at the newest message and following each that arrives while the reader is at the end, the input under it, which a docked `sheet` takes the place of, its body scrolling past two fifths of the region and keeping three rows, the log keeping two rows of its own while the body can give and the foot's head and submit never giving; while the reader is scrolled up, a Latest act floats centred above the input and returns to the newest message. Among sections it stands at its content's height. It draws one Message per item, and with `replying` set one waiting Message of the other author after them, followed and pinned to as any message is, replaced in place when the reply's item arrives and `replying` clears; the `reply` read draws its turn after them the same way, from its own subscription. While the `items` selection's read waits, `PAINT_ROWS` messages of the other author stand in the log, painted and inert. The frame around it draws the rest: it holds the read and draws the failed form with Retry, the missing form saying it no longer exists with Back, and the empty form. */
export function Thread<T>(props: ThreadProps<T>) {
	const { sheet } = props;
	const [drawn] = useSelections([props.items] as const);
	// The latest slots, which each drawn message reads when its item changes
	// and its acts call when pressed.
	const slots = useRef(props.message);
	slots.current = props.message;
	const messages = messagesOf(props, drawn as Drawn<readonly T[]>, slots);
	const tail = tailOf(props, drawn as Drawn<readonly T[]>, slots);
	const title = use(PageTitle);
	const log = useRef<HTMLDivElement>(null);
	const scroll = useScroller(log);
	useScrolls(scroll.node);
	const content = useRef<HTMLDivElement>(null);
	const dock = useRef<HTMLDivElement>(null);
	useFootFocus(dock);
	const region = useFootRegion(dock, true);
	const foot = sheet?.open ? (
		<SheetDocked {...sheet} region={region.value} />
	) : (
		props.foot
	);
	const atEnd = useRef(true);
	// The log's box and content heights as the follow last saw them. A scroll
	// event that reads other heights came with a resize (the foot changed, a
	// message grew): the browser keeping its place, not the reader scrolling,
	// and the follow, which runs next, settles the log at its end.
	const laid = useRef<[number, number]>([0, 0]);
	// The reader is scrolled up: the Latest act stands over the foot.
	const [away, setAway] = useState(false);
	// The log opens at its end and stays there while the reader is, as a
	// message arrives, a reply grows, or the input grows under it.
	useLayoutEffect(() => {
		const scroller = log.current;
		const inner = content.current;
		if (!scroller || !inner) return;
		const follow = () => {
			if (atEnd.current) scroller.scrollTop = scroller.scrollHeight;
			laid.current = [scroller.clientHeight, scroller.scrollHeight];
		};
		follow();
		const observer = new ResizeObserver(follow);
		observer.observe(scroller);
		observer.observe(inner);
		return () => observer.disconnect();
	}, []);
	// Back to the newest message, following again from there; the log takes
	// the focus the act held, since the act leaves with the press.
	const toLatest = () => {
		const scroller = log.current;
		if (!scroller) return;
		atEnd.current = true;
		setAway(false);
		scroller.scrollTop = scroller.scrollHeight;
		scroller.focus({ preventScroll: true });
	};
	return (
		<div ref={foot ? region.ref : undefined} className={cn(FILL, THREAD)}>
			<div className={REGION}>
				<div
					ref={scroll.ref}
					role="log"
					aria-labelledby={title}
					onScroll={(event) => {
						const { scrollHeight, scrollTop, clientHeight } =
							event.currentTarget;
						const [height, content] = laid.current;
						if (clientHeight !== height || scrollHeight !== content) return;
						const end = scrollHeight - scrollTop - clientHeight <= AT_END;
						atEnd.current = end;
						setAway(!end);
					}}
					className={SCROLLS}
				>
					<Scroller value={scroll.holder}>
						<div ref={content} className={cn(THREAD, STACK)}>
							<Window rows={messages} box={content} end />
							{tail}
						</div>
					</Scroller>
				</div>
				<Latest onBack={away ? toLatest : null} />
			</div>
			{foot ? (
				<div ref={dock} className={FOOT}>
					<FrameHolds holds={NO_HOLDS}>{foot}</FrameHolds>
				</div>
			) : null}
		</div>
	);
}
