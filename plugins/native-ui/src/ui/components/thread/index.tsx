import type {
	Attachment,
	MessageDetail,
	Part,
} from "@fcalell/ui-core/descriptors";
import {
	type ListState,
	listBusy,
	listState,
	retryOf,
	WAITING_MESSAGES,
} from "@fcalell/ui-core/list-state";
import {
	FOOT_DOCKED,
	THREAD,
	THREAD_LOG,
	THREAD_UNDER_HEAD,
} from "@fcalell/ui-core/variants";
import {
	Children,
	Fragment,
	isValidElement,
	memo,
	type ReactNode,
	type RefObject,
	useContext,
	useRef,
	useState,
} from "react";
import { Platform, ScrollView, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	FootPlace,
	FootReturn,
	ThreadBleeds,
	ThreadRoom,
} from "../../lib/frame";
import { Lifted } from "../../lib/hosts";
import { useLive } from "../../lib/live";
import { useWords } from "../../lib/words";
import { EmptyStateBase } from "../empty-state/base";
import type { ListEmpty } from "../list";
import { Message } from "../message";
import { Missing } from "../missing";
import type { QueryLike } from "../query-boundary";
import { ToastRoom } from "../toast/room";
import { Latest } from "./latest";
import { newest } from "./newest";

const FILL = "flex-1";
// In a Split's main the Thread bleeds through the inset the record's head
// keeps, under the head's hairline.
const BLEED = "-mx-page";
// The region over the foot: the log, and the Latest act floating at its foot.
const REGION = "relative flex-1";
const LOG = "flex-1";
// The log is drawn upside down, its newest message at its origin (see
// `INVERTED`), so `THREAD_LOG`'s top and bottom insets swap, and a short log
// stands at its layout end, the top of the screen.
const UPSIDE_DOWN = "grow justify-end pt-sections pb-page";
const DOCKED = "shrink-0 items-center";
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
	// Drawn over `other`'s reply, read aloud before yours; a system line
	// takes none.
	name?: (item: T) => string | undefined;
	// Plain text for `you` and `system`, markdown for `other`.
	body: (item: T) => string;
	// An ISO moment.
	at?: (item: T) => string | undefined;
	// What came with a turn: its attachments, one row over its bubble or
	// reply; a system line takes none.
	attachments?: (item: T) => readonly Attachment[] | undefined;
	// Where a turn came from ("by voice", "Kitchen"), before its time; a
	// system line takes none.
	meta?: (item: T) => readonly Part[] | undefined;
	// What a system line opens: the line becomes the act; a turn takes none.
	onOpen?: (item: T) => (() => void) | undefined;
	// What stands under a system line (a row, a free act's code, a fold); a
	// turn takes none.
	detail?: (item: T) => MessageDetail | undefined;
}

// Where a thread's messages come from, oldest first.
type ThreadSource<T> =
	| {
			query: QueryLike<readonly T[]>;
			// What failed to load, over the retry act.
			sentence: string;
			// What the log draws when the query answers with no message: what
			// to ask.
			empty: ListEmpty;
			items?: never;
			loading?: never;
	  }
	| {
			items: readonly T[];
			// The items are on their way (a compound body's loading form).
			loading?: boolean;
			// Without it an empty log draws nothing.
			empty?: ListEmpty;
			query?: never;
			sentence?: never;
	  };

// A conversation: its messages from a query or from items, over the input
// that adds to it.
export type ThreadProps<T = unknown> = Closed &
	ThreadSource<T> & {
		message: MessageSlots<T>;
		// The `MessageInput` under the messages, drawn in every state.
		foot?: ReactNode;
	};

// One message from its item, its Message by its author: a system line takes
// `onOpen` and `detail`, a turn takes `name`. It renders again only when its
// item does: every slot reads the item, and a system line's acts call the
// thread's latest slots when pressed, so a thread's re-render (a keystroke in
// its input, a message arriving) skips every message already drawn.
function ThreadItemBase<T>({
	item,
	slots,
}: {
	item: T;
	slots: RefObject<MessageSlots<T>>;
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

// What the log holds in the thread's state: the waiting turns, the failed
// or the empty EmptyState, or the messages oldest first.
function logOf<T>(
	props: ThreadProps<T>,
	state: ListState,
	retry: string,
	slots: RefObject<MessageSlots<T>>,
): ReactNode {
	if (state === "pending")
		return WAITING_MESSAGES.map(({ key, author }) => (
			<Message key={key} author={author} body="" loading />
		));
	if (state === "missing") return <Missing />;
	if (state === "failed" && props.query !== undefined)
		return (
			<EmptyStateBase
				tone="failed"
				sentence={props.sentence}
				act={{ label: retry, onAct: retryOf(props.query) }}
			/>
		);
	if (state === "empty" && props.empty)
		return <EmptyStateBase tone="rest" {...props.empty} />;
	const items = (props.query ? props.query.data : props.items) ?? [];
	return items.map((item) => (
		<ThreadItem key={props.message.key(item)} item={item} slots={slots} />
	));
}

// The messages a sections gap apart, one rung above a reply's block gap, and
// the input a sections gap under them, in the screen's column (native draws
// the touch structure, so no measure-wide column). In a Place's body it
// fills the page, and in a Split's record the record under its head: the log scrolls at the page inset, opening at the newest
// message and following each that arrives while the reader is at the end,
// the input docked at the foot over the keyboard; while the reader is scrolled
// up, a Latest act floats centred above the foot and returns to the newest
// message. React Native has no log
// role: the log is a polite live region, so an arriving message is announced
// on Android, and `useLive` announces an arriving reply on iOS. It draws its
// collection's states, the input under each: while its query is pending or
// `loading` is set, Message's loading forms (another's reply, yours,
// another's reply), the log at its end; a failed query, the failed
// EmptyState with `sentence` and Retry in the log; a query that answers not
// found, the form saying it no longer exists with Back; no message, `empty`
// in the log; then one Message per item.
export function Thread<T>(props: ThreadProps<T>) {
	const { foot } = props;
	const words = useWords();
	const input = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: false,
		inSection: false,
		hasEmpty: props.empty !== undefined,
	};
	const busy = listBusy(input);
	// The latest slots, which each drawn message reads when its item changes
	// and its acts call when pressed.
	const slots = useRef(props.message);
	slots.current = props.message;
	const state = listState(input);
	const children = logOf(props, state, words.retry, slots);
	const heard = newest(
		props.query ? props.query.data : props.items,
		state,
		props.message,
	);
	const live = useLive(heard.text, { id: heard.id });
	const fill = useContext(ThreadRoom);
	const bleeds = useContext(ThreadBleeds);
	const log = useRef<ScrollView>(null);
	// The claim a docked sheet leaves the foot for the input that returns.
	const claim = useRef(false);
	// The reader is scrolled up: the Latest act stands over the foot.
	const [away, setAway] = useState(false);
	// Back to the newest message, at the log's origin.
	const toLatest = () => {
		setAway(false);
		log.current?.scrollTo({ y: 0, animated: false });
	};
	if (!fill)
		return (
			<View className={THREAD}>
				<View {...live} accessibilityState={{ busy }} className={THREAD}>
					{children}
				</View>
				{foot ? (
					<FootPlace.Provider value="inline">{foot}</FootPlace.Provider>
				) : null}
			</View>
		);
	// Newest first, each upside down inside the upside-down log, so it reads
	// the right way up with the newest at the bottom.
	const cells = Children.toArray(children)
		.reverse()
		.map((child) => (
			<View key={isValidElement(child) ? child.key : null} style={INVERTED}>
				{child}
			</View>
		));
	return (
		<Lifted
			behavior="padding"
			automaticOffset
			className={cn(FILL, bleeds && THREAD_UNDER_HEAD, bleeds && BLEED)}
		>
			<View className={REGION}>
				<ScrollView
					ref={log}
					{...live}
					accessibilityState={{ busy }}
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
					contentContainerClassName={cn(THREAD, THREAD_LOG, UPSIDE_DOWN)}
				>
					{cells}
				</ScrollView>
				<Latest onBack={away ? toLatest : null} />
				{/* The page's toasts stand over the log, above the docked input. */}
				<ToastRoom />
			</View>
			{foot ? (
				<View className={cn(FOOT_DOCKED, DOCKED)}>
					<FootPlace.Provider value="docked">
						<FootReturn.Provider value={claim}>{foot}</FootReturn.Provider>
					</FootPlace.Provider>
				</View>
			) : null}
		</Lifted>
	);
}

// Whether a Thread stands in a frame's region as its direct child, or in a
// fragment there (a record's head over its conversation): the region then
// gives it the rest of its height from its first render, its element type
// unchanged, so nothing in it remounts when the Thread arrives.
export function holdsThread(node: ReactNode): boolean {
	return Children.toArray(node).some(
		(child) =>
			isValidElement<{ children?: ReactNode }>(child) &&
			(child.type === Thread ||
				(child.type === Fragment && holdsThread(child.props.children))),
	);
}
