import { NO_HOLDS } from "@fcalell/plugin-api/read";
import {
	type Datum,
	type Drawn,
	FrameHolds,
	type Selection,
	useFrameRead,
} from "@fcalell/plugin-api/tanstack-query";
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
	useRef,
	useState,
} from "react";
import { Platform, ScrollView, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import { FootReturn, useFootRegion } from "../../lib/frame";
import { Lifted } from "../../lib/hosts";
import {
	type Frame,
	FrameBody,
	FrameLine,
	StateLine,
	useCollection,
} from "../../lib/read";
import { useWords } from "../../lib/words";
import { Message } from "../message";
import { MessageBase } from "../message/base";
import { WaitingReply } from "../message/waiting";
import type { SheetProps } from "../sheet";
import { SheetDocked } from "../sheet/docked";
import { Latest } from "./latest";

// The thread fills what it stands in by plain flex: in a Pane's body, whose
// content grows to the screen, it takes the free height and its log scrolls.
// The input stands a sections gap under the log.
const FILL = "flex-1 min-h-0";
// The region over the foot: the log, and the Latest act floating at its foot.
// It clips what it holds, so where a docked foot leaves it no room nothing
// paints over the foot's head or the header.
const REGION = "relative flex-1 overflow-hidden";
const LOG = "flex-1";
// The log is drawn upside down, its newest message at its origin (see
// `INVERTED`), so a short log stands at its layout end, the top of the
// region. The Pane's inset is the log's: it draws none of its own.
const UPSIDE_DOWN = "grow justify-end";
// What the foot holds shrinks to its bound, so a docked form scrolls inside it.
const DOCKED = "shrink-0 min-h-0";
// The log is at its end while its newest point shows.
const AT_END = 1;
// The log and each message in it turn upside down, as React Native's
// `VirtualizedList` inverts a list (Android turns both axes): the log's
// origin is its end, so the first frame shows the newest message and a
// keyboard's resize keeps it at the bottom.
const INVERTED =
	Platform.OS === "android"
		? { transform: [{ scale: -1 }] }
		: { transform: [{ scaleY: -1 }] };

// One function per `Message` slot, each called with a loaded item and reading
// only it: a message draws again only when its item changes.
export interface MessageSlots<T> {
	// The item's React key, unique in the thread.
	key: (item: T) => string;
	author: (item: T) => "you" | "other" | "system";
	/** Who said it, by name: drawn over `other`'s reply, yours draws none; a system line takes none (a short phrase; wraps). */
	name?: (item: T) => string | undefined;
	/** What was said (text; wraps): plain text for `you` and `system`, markdown for `other`. */
	body: (item: T) => string;
	// An ISO moment.
	at?: (item: T) => string | undefined;
	// What came with a turn: its attachments, one row over its bubble or
	// reply; a system line takes none.
	attachments?: (item: T) => readonly Attachment[] | undefined;
	/** Where a turn came from ("by voice", "Kitchen"), before its time; a system line takes none (each a short phrase; the line wraps at its dots). */
	meta?: (item: T) => readonly Part[] | undefined;
	// The reply is still arriving: an `other` turn whose open Markdown
	// marker at its end draws in its own form; a turn of yours or a system
	// line takes none.
	streaming?: (item: T) => boolean | undefined;
	// What a system line opens: the line becomes the act; a turn takes none.
	onOpen?: (item: T) => (() => void) | undefined;
	// What stands under a system line (a row, a free act's code, a fold); a
	// turn takes none.
	detail?: (item: T) => MessageDetail | undefined;
}

// A conversation: its messages from items, over the input that adds to it.
export type ThreadProps<T = unknown> = Closed & {
	/** The items the messages draw, oldest first: constants, or a selection, which paints `PAINT_ROWS` messages until its read lands. A selection stands in a frame (a Pane, Section, Sheet or Form given the read), which draws the thread's failed, missing and empty forms. */
	items: Datum<readonly T[]>;
	message: MessageSlots<T>;
	// The `MessageInput` under the messages.
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
	const item = value as T | null | undefined;
	// History holds the turn already: it draws it, so this one steps aside.
	if (item != null && slots.current.key(item) === after) return null;
	// Its own cell in the log, upside down like the others and drawn only when
	// there is a turn, so a thread with none leaves no gap at its end; the
	// message and its line keep the thread's gap inside it.
	return (
		<View style={INVERTED} className={THREAD}>
			{form === "waiting" ? <WaitingReply /> : null}
			{item == null ? null : (
				<ThreadItem item={item} slots={slots} streaming={form === "writing"} />
			)}
			{form === "stopped" ? (
				<StateLine
					sentence={words.replyStopped}
					act={{ label: words.retry, onAct: retry }}
				/>
			) : null}
		</View>
	);
}

// What the log holds, oldest first, each part keyed: the painted messages
// while the items are not here (the other author's, since an author is the
// item's), else one Message per item.
function logOf<T>(
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
	const messages = drawn.value.map((item) => (
		<ThreadItem key={props.message.key(item)} item={item} slots={slots} />
	));
	return props.replying
		? [...messages, <WaitingReply key="replying" />]
		: messages;
}

// The messages a sections gap apart, one rung above a reply's block gap, and
// the input a sections gap under them. It fills what it stands in (a Pane's
// body) by plain flex: the log scrolls inside it at the Pane's inset, opening
// at the newest message and following each that arrives while the reader is at
// the end, the input docked at the foot over the keyboard; while the reader is
// scrolled up, a Latest act floats centred above the foot and returns to the
// newest message. It draws one Message per item, and with `replying` set one
// waiting Message of the other author after them, followed as any message is
// and replaced in place when the reply's item arrives and `replying` clears; the `reply` read draws its turn after them the same way, from its own subscription.
// While the `items` selection's read waits, `PAINT_ROWS` messages of the other
// author stand in the log, painted and inert. The thread is a frame of its
// items: the failed form with Retry and the missing form stand in the log's
// place, in its box with the generic sentence, and the empty form is an empty
// log with no sentence; the foot and the reply stand through each of them, so
// a thread whose items failed still sends. The stale and paused line stands
// over the log while it holds its read.
export function Thread<T>(props: ThreadProps<T>) {
	const { sheet } = props;
	const { drawn, frame } = useCollection(props.items);
	// The latest slots, which each drawn message reads when its item changes
	// and its acts call when pressed.
	const slots = useRef(props.message);
	slots.current = props.message;
	// The claim a docked sheet leaves the foot for the input that returns.
	const claim = useRef(false);
	const region = useFootRegion(true);
	const foot = sheet?.open ? (
		<SheetDocked {...sheet} region={region.value} />
	) : (
		props.foot
	);
	return (
		<Lifted
			behavior="padding"
			automaticOffset
			onLayout={region.onLayout}
			className={cn(FILL, THREAD)}
		>
			<View className={REGION}>
				<FrameHolds holds={frame.held}>
					<FrameLine frame={frame} />
					<Log thread={props} drawn={drawn} frame={frame} slots={slots} />
				</FrameHolds>
			</View>
			{foot ? (
				<View className={DOCKED}>
					<FrameHolds holds={NO_HOLDS}>
						<FootReturn.Provider value={claim}>{foot}</FootReturn.Provider>
					</FrameHolds>
				</View>
			) : null}
		</Lifted>
	);
}

// The log and the Latest act floating at its foot. The items' failed and
// missing forms stand in the messages' place, the reply and the waiting
// message after them as after any messages.
function Log<T>(props: {
	thread: ThreadProps<T>;
	drawn: Drawn<readonly T[]>;
	frame: Frame;
	slots: RefObject<MessageSlots<T>>;
}) {
	const { thread, drawn, frame, slots } = props;
	const ended = frame.form === "failed" || frame.form === "missing";
	const children = ended ? [] : logOf(thread, drawn, slots);
	// The newest turn, at the origin before the rest: a cell of its own, which
	// draws nothing, gap included, while there is no turn being written.
	const last = drawn.painted ? undefined : drawn.value.at(-1);
	const reply =
		thread.reply && (ended || !drawn.painted) ? (
			<ReplyTurn
				reply={thread.reply}
				slots={slots}
				after={last === undefined ? undefined : thread.message.key(last)}
			/>
		) : null;
	const log = useRef<ScrollView>(null);
	// The reader is scrolled up: the Latest act stands over the foot.
	const [away, setAway] = useState(false);
	// Back to the newest message, at the log's origin.
	const toLatest = () => {
		setAway(false);
		log.current?.scrollTo({ y: 0, animated: false });
	};
	// Newest first, each upside down inside the upside-down log, so it reads
	// the right way up with the newest at the bottom.
	const cells = children.reverse().map((child) => (
		<View key={child.key} style={INVERTED}>
			{child}
		</View>
	));
	return (
		<>
			<ScrollView
				ref={log}
				style={INVERTED}
				// A message arriving at the origin keeps a scrolled-up reader's
				// place, and one at the end follows it.
				maintainVisibleContentPosition={{
					minIndexForVisible: 0,
					autoscrollToTopThreshold: AT_END,
				}}
				onScroll={(event) =>
					setAway(event.nativeEvent.contentOffset.y > AT_END)
				}
				className={LOG}
				contentContainerClassName={cn(THREAD, UPSIDE_DOWN)}
			>
				{reply}
				{ended ? (
					<View style={INVERTED}>
						<FrameBody frame={frame} fit="frame" />
					</View>
				) : (
					cells
				)}
			</ScrollView>
			<Latest onBack={away ? toLatest : null} />
		</>
	);
}
