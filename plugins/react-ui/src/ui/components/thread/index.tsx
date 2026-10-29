import { NO_HOLDS } from "@fcalell/plugin-api/read";
import {
	type Datum,
	type Drawn,
	FrameHolds,
	type Selection,
	useFrameRead,
} from "@fcalell/plugin-api/tanstack-query";
import type { ProcedureCall } from "@fcalell/plugin-api/types";
import { stampsTime } from "@fcalell/ui-core/clock";
import { cn } from "@fcalell/ui-core/cn";
import type {
	Attachment,
	MessageDetail,
	Runs,
} from "@fcalell/ui-core/descriptors";
import { PAINT_TURNS } from "@fcalell/ui-core/paint";
import { turnOf } from "@fcalell/ui-core/read";
import { THREAD, THREAD_COLUMN } from "@fcalell/ui-core/variants";
import {
	memo,
	type ReactElement,
	type ReactNode,
	type RefObject,
	use,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useStreamed } from "../../lib/arrive.ts";
import type { Closed } from "../../lib/closed.ts";
import type { Empty } from "../../lib/empty.tsx";
import { useFootFocus } from "../../lib/focus.ts";
import { FootBar, PageTitle, useFootRegion } from "../../lib/frame.ts";
import { useTouch } from "../../lib/media.ts";
import {
	type Frame,
	FrameBody,
	FrameLine,
	StateLine,
	stillOf,
	useCollection,
} from "../../lib/read.tsx";
import { sameBy } from "../../lib/same-by.ts";
import { useScrolls } from "../../lib/scrolls.ts";
import { Scroller, useScroller, Window } from "../../lib/window.tsx";
import { useWords } from "../../lib/words.tsx";
import { MessageBase } from "../message/base.tsx";
import { WaitingReply } from "../message/waiting.tsx";
import {
	MessageInput,
	type MessageInputProps,
} from "../message-input/index.tsx";
import { SheetDocked } from "../sheet/docked.tsx";
import type { SheetProps } from "../sheet/index.tsx";
import { Latest } from "./latest.tsx";

/** The input under the messages. */
export type ComposerProps = MessageInputProps;

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
// The empty log's sentence stands centred in the room the messages would fill.
const EMPTY = "grow justify-center";

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
	/** When it was said, an ISO moment: stamped on a turn whose turn before is another author's or in another minute, so a run of one author's turns in one minute reads its time once, on its first. */
	at?: (item: T) => string | undefined;
	/** What came with a turn: its attachments, one row over its bubble or reply; a system line takes none. */
	attachments?: (item: T) => readonly Attachment[] | undefined;
	/** Where a turn came from ("by voice", "Kitchen"), before its time; a system line takes none (each a short phrase; the line wraps at its dots). */
	meta?: (item: T) => Runs | undefined;
	/** The reply is still arriving: an `other` turn whose open Markdown marker at its end draws in its own form (see `Message`); a turn of yours or a system line takes none. */
	streaming?: (item: T) => boolean | undefined;
	/** What a system line opens: the line becomes the act; a turn takes none. */
	onOpen?: (item: T) => (() => void) | undefined;
	/** What stands under a system line (a row, a free act's code, a fold); a turn takes none. */
	detail?: (item: T) => MessageDetail | undefined;
}

/** A conversation: its messages from items, over the input that adds to it. */
export type ThreadProps<
	T = unknown,
	P extends ProcedureCall = ProcedureCall,
> = Closed & {
	/** The items the messages draw, oldest first: constants, or a selection, which paints two turns until its read lands, an ask of yours over the other author's reply (`PAINT_TURNS`). A selection stands in a frame (a Pane, Section, Sheet or Form given the read), which draws the thread's failed, missing and empty forms. */
	items: Datum<readonly T[]>;
	/** The `Message` slots. */
	message: MessageSlots<T>;
	/** The input under the messages, where a message is written and sent: what is written, its attachments, the notice under it, and the sending and stopping of an answer. On touch, in a thread standing among a Pane's sections (in a `Section`, or in a Pane without `fill`), it docks at that Pane's foot instead, above the tab bar. */
	composer?: ComposerProps;
	/** A task over the input: while it is `open` it docks in the foot in the input's place, the log keeping two rows above it, and closing hands focus back to the input. Where the input docks at the Pane's foot, the sheet docks there too. */
	sheet?: SheetProps<P>;
	/** A reply from the other author is on its way: the loaded log ends on one waiting message of theirs, until it is cleared. */
	replying?: boolean;
	/** The turn being written, a read the app declares (a stream: `read(options, { kind: "stream" })` over `streamedQuery`, or a slice of a channel read): it draws after the items from its own subscription, so a chunk renders only it. Waiting for the first chunk it is one waiting message of the other author; writing, the message with `streaming` set; written, the message. Held as a root read, a stream that failed after some text draws the partial message, then "The reply stopped." with Retry; one that failed before any text draws "This didn't load." with Retry. Retry runs the stream again. It hides once the last item has its key, so a history that catches up shows no second turn. `null` or `undefined` is no turn. */
	reply?: Selection<T | null | undefined>;
	/** What the log says when the `items` read is empty: the sentence and the act that makes the first message, centred where the messages would stand with the composer kept. Without one the log says the generic sentence. */
	empty?: Empty;
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
	arrives,
	unstamped,
}: {
	item: T;
	slots: RefObject<MessageSlots<T>>;
	// The reply turn's own, which overrides the slot.
	streaming?: boolean;
	// It came to the end of the log on its own: it rises in as it mounts.
	arrives?: boolean;
	// The turn before it is its author's in the same minute: its time is not
	// stamped again (`stampsTime`).
	unstamped?: boolean;
}) {
	// Held from the first render, so a later commit does not cut the rise short.
	const [rises] = useState(arrives);
	const read = slots.current;
	const author = read.author(item);
	const body = read.body(item);
	const at = unstamped ? undefined : read.at?.(item);
	if (author !== "system")
		return (
			<MessageBase
				author={author}
				arrives={rises}
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
		<MessageBase
			author="system"
			arrives={rises}
			body={body}
			at={at}
			onOpen={opens ? () => slots.current.onOpen?.(item)?.() : undefined}
			detail={detail}
		/>
	);
}

// `memo` erases the generic its component takes, so the memoised item keeps
// the base's own type.
const ThreadItem = memo(
	ThreadItemBase,
	sameBy("item"),
) as typeof ThreadItemBase;

// The key the waiting message is known by among the log's arrivals.
const WAITING = "replying";

// The turn being written, from its own subscription to the reply: a chunk
// renders this and nothing else in the thread. A stream that failed keeps its
// partial message and says it stopped, one that failed before any text says the
// read failed, each with the frame's retry, which runs the stream again. It
// stays mounted whenever there is a reply, so the items' fetch cycle never
// subscribes it or lets it go: a reply read that shares the items' failed read
// would otherwise refetch on each mount and loop.
function ReplyTurn<T>(props: {
	reply: Selection<T | null | undefined>;
	slots: RefObject<MessageSlots<T>>;
	after: string | undefined;
	// The items are painted, not here: no turn stands among painted messages.
	painted: boolean;
}) {
	const { reply, slots, after, painted } = props;
	const words = useWords();
	const {
		state: { form, value },
		retry,
	} = useFrameRead(reply, turnOf);
	// The waiting message rises in when the turn begins once the log is drawn;
	// the text that replaces it lands with the read's first answer, so the
	// turn's own message never rises.
	const begun = useStreamed(form === "waiting" ? [WAITING] : [], !painted);
	if (painted || form === "none") return null;
	if (form === "waiting") return <WaitingReply arrives={begun.has(WAITING)} />;
	const item = value as T | null | undefined;
	// History holds the turn already: it draws it, so this one steps aside.
	if (item != null && slots.current.key(item) === after) return null;
	return (
		<>
			{item == null ? null : (
				<ThreadItem item={item} slots={slots} streaming={form === "writing"} />
			)}
			{form === "stopped" || form === "failed" ? (
				<StateLine
					sentence={form === "failed" ? words.readFailed : words.replyStopped}
					act={{ label: words.retry, onAct: retry }}
				/>
			) : null}
		</>
	);
}

// The message at an index of the log's window, oldest first: a painted turn
// while the items are not here (`PAINT_TURNS`: an ask of yours, then the other
// author's reply), else one Message per item.
function messageAt<T>(
	props: Omit<ThreadProps<T>, "sheet">,
	drawn: Drawn<readonly T[]>,
	slots: RefObject<MessageSlots<T>>,
	arrived: ReadonlySet<string>,
	awaits: boolean,
	index: number,
): ReactElement {
	if (drawn.painted)
		return (
			<MessageBase
				key={index}
				painted
				author={PAINT_TURNS[index] ?? "other"}
				name={props.message.name !== undefined}
				at={index}
			/>
		);
	const item = drawn.value[index] as T;
	const key = props.message.key(item);
	// The other author's turn in a thread that waits on a reply is that reply:
	// it takes the place of the waiting message, which the reply's own text
	// arrives by, and does not rise again.
	const reply = awaits && props.message.author(item) === "other";
	const before = index > 0 ? (drawn.value[index - 1] as T) : undefined;
	const turn = (of: T) => ({
		author: props.message.author(of),
		at: props.message.at?.(of),
	});
	return (
		<ThreadItem
			key={key}
			item={item}
			slots={slots}
			arrives={arrived.has(key) && !reply}
			unstamped={!stampsTime(turn(item), before && turn(before))}
		/>
	);
}

// What follows the window: the waiting message and the turn being written,
// which grow outside it, so a chunk never reaches the rows. They stand through
// the items' failed form, which says nothing of a turn being written, and
// hold back while the items are painted.
function tailOf<T>(
	props: Omit<ThreadProps<T>, "sheet">,
	drawn: Drawn<readonly T[]>,
	slots: RefObject<MessageSlots<T>>,
	ended: boolean,
	arrived: ReadonlySet<string>,
): ReactNode {
	const painted = drawn.painted && !ended;
	const last = drawn.painted ? undefined : drawn.value.at(-1);
	return (
		<>
			{props.replying && !painted ? (
				<WaitingReply arrives={arrived.has(WAITING)} />
			) : null}
			{props.reply ? (
				<ReplyTurn
					reply={props.reply}
					slots={slots}
					painted={painted}
					after={last === undefined ? undefined : props.message.key(last)}
				/>
			) : null}
		</>
	);
}

/** The messages, a log region so an arriving one is announced, a sections gap apart, one rung above a reply's block gap, and the input a sections gap under them. It fills what it stands in by plain flex: in a Pane's body it takes the free height and the log scrolls, opening at the newest message and following each that arrives while the reader is at the end, the input under it, which a docked `sheet` takes the place of, its body scrolling past two fifths of the region and keeping three rows, the log keeping two rows of its own while the body can give and the foot's head and submit never giving; while the reader is scrolled up, a Latest act floats centred above the input and returns to the newest message. Among sections it stands at its content's height; on touch, among a Pane's sections (in a `Section`, or in a Pane without `fill`), its input and docked sheet stand in that Pane's foot (above the tab bar, under the body that scrolls), so the field stays in reach however long the page, and the log stays among the sections. It draws one Message per item, and with `replying` set one waiting Message of the other author after them, followed and pinned to as any message is, replaced in place when the reply's item arrives and `replying` clears; the `reply` read draws its turn after them the same way, from its own subscription. While the `items` selection's read waits, an ask of yours and the other author's reply stand in the log (`PAINT_TURNS`), painted and inert. The thread is a frame of its items: the failed form with Retry and the missing form stand in the log's place, in its box with the generic sentence, and the empty form is one sentence in the meta ink (`empty`, else the generic one) centred in the log over its act, if any; the foot and the reply stand through each of them, so a thread whose items failed still sends. The stale and paused line stands over the log while it holds its read. */
export function Thread<T, P extends ProcedureCall = ProcedureCall>(
	props: ThreadProps<T, P>,
) {
	const { sheet } = props;
	const { drawn, frame } = useCollection(props.items);
	// The latest slots, which each drawn message reads when its item changes
	// and its acts call when pressed.
	const slots = useRef(props.message);
	slots.current = props.message;
	const dock = useRef<HTMLDivElement>(null);
	useFootFocus(dock);
	const region = useFootRegion(sheet?.open === true, dock, true);
	// On touch a thread standing among its Pane's sections (in a Section, or in
	// a Pane without `fill`) docks its composer at the Pane's foot, above the
	// tab bar, and its sheet there in the composer's place: the log stays among
	// the sections and the field never scrolls away with them. A thread that
	// fills its Pane keeps its own foot, which already stands at the Pane's foot.
	const pane = use(FootBar);
	const lifts =
		useTouch() &&
		pane !== undefined &&
		!pane.fill &&
		(props.composer !== undefined || sheet !== undefined);
	// Handed up each render, as the draft and the sheet change, before paint.
	useLayoutEffect(() => {
		if (!lifts || !pane) return undefined;
		pane.lift({
			bar: props.composer ? <MessageInput {...props.composer} /> : undefined,
			sheet: sheet as SheetProps | undefined,
		});
		return () => pane.lift(undefined);
	});
	const foot = lifts ? undefined : sheet?.open ? (
		<SheetDocked {...sheet} region={region.value} />
	) : props.composer ? (
		<MessageInput {...props.composer} />
	) : undefined;
	return (
		<div
			ref={foot ? region.ref : undefined}
			data-still={stillOf(frame)}
			className={cn(FILL, THREAD)}
		>
			<div className={REGION}>
				<FrameHolds holds={frame.held}>
					<FrameLine frame={frame} />
					<Log thread={props} drawn={drawn} frame={frame} slots={slots} />
				</FrameHolds>
			</div>
			{foot ? (
				<div ref={dock} className={FOOT}>
					<FrameHolds holds={NO_HOLDS}>{foot}</FrameHolds>
				</div>
			) : null}
		</div>
	);
}

// The log and the Latest act floating at its foot. The items' failed and
// missing forms stand in the messages' place, the reply and the waiting
// message after them as after any messages.
function Log<T>(props: {
	thread: Omit<ThreadProps<T>, "sheet">;
	drawn: Drawn<readonly T[]>;
	frame: Frame;
	slots: RefObject<MessageSlots<T>>;
}) {
	const { thread, drawn, frame, slots } = props;
	const ended = frame.form === "failed" || frame.form === "missing";
	// The empty form stands in the messages' place as the ended ones do, but says
	// its own sentence, centred in the log.
	const empty = frame.form === "empty";
	// On the desktop the log keeps the composer's measure column, so a message,
	// your message's end and the failed or empty form stand on the field's edges.
	const column = !useTouch() && THREAD_COLUMN;
	const count = ended
		? 0
		: drawn.painted
			? PAINT_TURNS.length
			: drawn.value.length;
	// The messages that came to the end of the log on their own once it was
	// drawn rise in as they mount; what it held when first drawn does not. The
	// waiting message is one of them.
	const awaiting = useRef(false);
	const awaits =
		thread.replying === true || thread.reply !== undefined || awaiting.current;
	// Held a commit on, so the reply that arrives as `replying` clears is read as
	// the one the waiting message was for.
	useEffect(() => {
		awaiting.current = thread.replying === true;
	});
	const arrived = useStreamed(
		drawn.painted || ended
			? []
			: [
					...drawn.value.map(thread.message.key),
					...(thread.replying ? [WAITING] : []),
				],
		!drawn.painted && !ended,
	);
	const tail = tailOf(thread, drawn, slots, ended, arrived);
	const title = use(PageTitle);
	const log = useRef<HTMLDivElement>(null);
	const scroll = useScroller(log);
	useScrolls(scroll.node);
	const content = useRef<HTMLDivElement>(null);
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
		<>
			<div
				ref={scroll.ref}
				role="log"
				aria-labelledby={title}
				onScroll={(event) => {
					const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
					const [height, content] = laid.current;
					if (clientHeight !== height || scrollHeight !== content) return;
					const end = scrollHeight - scrollTop - clientHeight <= AT_END;
					atEnd.current = end;
					setAway(!end);
				}}
				className={SCROLLS}
			>
				<Scroller value={scroll}>
					<div
						ref={content}
						className={cn(THREAD, STACK, column, empty && EMPTY)}
					>
						{ended || empty ? (
							<FrameBody
								frame={frame}
								fit={empty ? "part" : "frame"}
								empty={thread.empty}
							/>
						) : (
							<Window
								count={count}
								keyOf={(index) =>
									drawn.painted
										? index
										: thread.message.key(drawn.value[index] as T)
								}
								row={(index) =>
									messageAt(thread, drawn, slots, arrived, awaits, index)
								}
								box={content}
								end
							/>
						)}
						{tail}
					</div>
				</Scroller>
			</div>
			<Latest shown={away} onBack={toLatest} />
		</>
	);
}
