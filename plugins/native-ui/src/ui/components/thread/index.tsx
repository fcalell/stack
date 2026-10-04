import type { MessageDetail } from "@fcalell/ui-core/descriptors";
import {
	type ListState,
	listBusy,
	listState,
	retryOf,
	WAITING_MESSAGES,
} from "@fcalell/ui-core/list-state";
import { FOOT, THREAD, THREAD_LOG } from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	useContext,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { ScrollView, View } from "react-native";
import type { Closed } from "../../lib/closed";
import { cn } from "../../lib/cn";
import {
	ThreadBleeds,
	ThreadFills,
	ToLatest,
	useFootDocks,
} from "../../lib/frame";
import { Lifted } from "../../lib/hosts";
import { useWords } from "../../lib/words";
import { EmptyStateBase } from "../empty-state/base";
import { Missing } from "../empty-state/missing";
import type { ListEmpty } from "../list";
import { Message } from "../message";
import type { QueryLike } from "../query-boundary";
import { Latest } from "./latest";

const FILL = "flex-1";
// In a Split's main the Thread bleeds through the inset the record's head
// keeps.
const BLEED = "-mx-page";
// The region over the foot: the log, and the Latest act floating at its foot.
const REGION = "relative flex-1";
const LOG = "flex-1";
const DOCKED = "shrink-0";
// The log is at its end while its last point shows; a reader who scrolled
// up keeps their place as a message arrives.
const AT_END = 1;

// One function per `Message` slot, each called with a loaded item.
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

// The item's Message by its author: a system line takes `onOpen`, a turn
// takes `name`.
function messageOf<T>(slots: MessageSlots<T>, item: T): ReactNode {
	const author = slots.author(item);
	const key = slots.key(item);
	const body = slots.body(item);
	const at = slots.at?.(item);
	if (author === "system")
		return (
			<Message
				key={key}
				author="system"
				body={body}
				at={at}
				onOpen={slots.onOpen?.(item)}
				detail={slots.detail?.(item)}
			/>
		);
	return (
		<Message
			key={key}
			author={author}
			name={slots.name?.(item)}
			body={body}
			at={at}
		/>
	);
}

// What the log holds in the thread's state: the waiting turns, the failed
// or the empty EmptyState, or the messages oldest first.
function logOf<T>(
	props: ThreadProps<T>,
	state: ListState,
	retry: string,
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
	return items.map((item) => messageOf(props.message, item));
}

// The messages a sections gap apart, one rung above a reply's block gap, and
// the input a sections gap under them, in the screen's column (native draws
// the touch structure, so no measure-wide column). In a Place's body it
// fills the page, and in a Split's record the record under its head: the log scrolls at the page inset, opening at the newest
// message and following each that arrives while the reader is at the end,
// the input docked at the foot over the keyboard; while the reader is scrolled
// up, a Latest act floats centred above the foot and returns to the newest
// message. React Native has no log
// role: the messages are a polite live region, so an arriving one is
// announced (Android; VoiceOver reads them in order). It draws its
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
	const children = logOf(props, listState(input), words.retry);
	const fills = useContext(ThreadFills);
	const bleeds = useContext(ThreadBleeds);
	const docked = useFootDocks();
	const log = useRef<ScrollView>(null);
	const atEnd = useRef(true);
	// The reader is scrolled up: the Latest act stands over the foot.
	const [away, setAway] = useState(false);
	useLayoutEffect(() => {
		if (!fills) return;
		fills(true);
		return () => fills(false);
	}, [fills]);
	// The log opens at its end and stays there while the reader is, as a
	// message arrives, a reply grows, or the input or the keyboard shrinks
	// the log.
	const follow = () => {
		if (atEnd.current) log.current?.scrollToEnd({ animated: false });
	};
	const messages = (
		<View
			accessibilityLiveRegion="polite"
			accessibilityState={{ busy }}
			className={THREAD}
		>
			{children}
		</View>
	);
	// Back to the newest message, following again from there.
	const toLatest = () => {
		atEnd.current = true;
		setAway(false);
		log.current?.scrollToEnd({ animated: false });
	};
	if (!fills)
		return (
			<View className={THREAD}>
				{messages}
				{foot ?? null}
			</View>
		);
	return (
		<Lifted
			behavior="padding"
			automaticOffset
			className={cn(FILL, bleeds && BLEED)}
		>
			<View className={REGION}>
				<ScrollView
					ref={log}
					onContentSizeChange={follow}
					onLayout={follow}
					onScroll={(event) => {
						const { contentOffset, contentSize, layoutMeasurement } =
							event.nativeEvent;
						const end =
							contentSize.height - contentOffset.y - layoutMeasurement.height <=
							AT_END;
						atEnd.current = end;
						setAway(!end);
					}}
					className={LOG}
					contentContainerClassName={THREAD_LOG}
				>
					{messages}
				</ScrollView>
				<ToLatest.Provider value={away ? toLatest : null}>
					<Latest />
				</ToLatest.Provider>
			</View>
			{foot ? (
				<View onLayout={docked} className={cn(FOOT, DOCKED)}>
					{foot}
				</View>
			) : null}
		</Lifted>
	);
}
