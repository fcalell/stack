import { cn } from "@fcalell/ui-core/cn";
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
	THREAD_COLUMN,
	THREAD_LOG,
	THREAD_UNDER_HEAD,
} from "@fcalell/ui-core/variants";
import {
	memo,
	type ReactNode,
	type RefObject,
	use,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { useFootFocus } from "../../lib/focus.ts";
import {
	FootPlace,
	PageTitle,
	ThreadBleeds,
	ThreadRoom,
} from "../../lib/frame.ts";
import { LoadingContext } from "../../lib/loading.ts";
import { useTouch } from "../../lib/media.ts";
import { useWords } from "../../lib/words.tsx";
import { EmptyStateBase } from "../empty-state/base.tsx";
import type { ListEmpty } from "../list/index.tsx";
import { Message } from "../message/index.tsx";
import { Missing } from "../missing/index.tsx";
import type { QueryLike } from "../query-boundary/index.tsx";
import { Latest } from "./latest.tsx";

const STACK = "flex flex-col";
// A size container: a docked sheet bounds its body by a fraction of this
// region (`cqh`), which its flex height gives it, never its content.
const FILL = "flex flex-col grow min-h-0 [container-type:size]";
// In a Split's main the Thread bleeds through the inset the record's head
// keeps, under the head's hairline.
const BLEED = "-mx-page";
// The log rings inset, its edge meeting the page's.
const SCROLLS =
	"flex flex-col grow min-h-0 overflow-y-auto focus-visible:-outline-offset-2";
// The log and the docked foot own their frame's width: on the desktop they
// centre the measure column; on touch the messages and the input span it.
const CENTRES = "items-center";
// The docked foot names itself the anchor the Shell's toasts stand above.
const DOCKED = "flex flex-col shrink-0 [anchor-name:--docked-foot]";
// What the docked foot holds shrinks to the foot's bound, so a docked form
// scrolls inside it.
const FOOT_COLUMN = "flex flex-col min-h-0";
// The region over the foot: the log, and the Latest act floating at its foot.
const REGION = "relative flex flex-col grow min-h-0";
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
	/** What a system line opens: the line becomes the act; a turn takes none. */
	onOpen?: (item: T) => (() => void) | undefined;
	/** What stands under a system line (a row, a free act's code, a fold); a turn takes none. */
	detail?: (item: T) => MessageDetail | undefined;
}

/** Where a thread's messages come from. */
type ThreadSource<T> =
	| {
			/** The query whose items the messages draw, oldest first. */
			query: QueryLike<readonly T[]>;
			/** What failed to load, over the retry act (a sentence; wraps). */
			sentence: string;
			/** What the log draws when the query answers with no message: what to ask. */
			empty: ListEmpty;
			items?: never;
			loading?: never;
	  }
	| {
			/** The items the messages draw, oldest first. */
			items: readonly T[];
			/** The items are on their way (a compound body's loading form): the messages wait. */
			loading?: boolean;
			/** What the log draws with no message; without it an empty log draws nothing. */
			empty?: ListEmpty;
			query?: never;
			sentence?: never;
	  };

/** A conversation: its messages from a query or from items, over the input that adds to it. */
export type ThreadProps<T = unknown> = Closed &
	ThreadSource<T> & {
		/** The `Message` slots. */
		message: MessageSlots<T>;
		/** The `MessageInput` under the messages, drawn in every state. */
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

/** The messages, a log region so an arriving one is announced, a sections gap apart, one rung above a reply's block gap, and the input a sections gap under them; on the desktop each stands in a measure-wide column its region centres, on touch in the screen's column. In a Place's body it fills the page, and in a Split's main the main under the record's head: the log scrolls at the page inset, opening at the newest message and following each that arrives while the reader is at the end, the input docked at the foot, which holds a docked `Sheet` as well, its body scrolling past two fifths of the region and keeping three rows, the log giving way; while the reader is scrolled up, a Latest act floats centred above the foot and returns to the newest message. It draws its collection's states, the input under each: while its query is pending, `loading` is set or a loading `Section` holds it, Message's loading forms (another's reply, yours, another's reply), the log at its end; a failed query, the failed EmptyState with `sentence` and Retry in the log's column; a query that answers not found, the form saying it no longer exists with Back; no message, `empty` in the log; then one Message per item. */
export function Thread<T>(props: ThreadProps<T>) {
	const { foot } = props;
	const words = useWords();
	const input = {
		query: props.query,
		items: props.items,
		loading: props.loading,
		sectionLoading: use(LoadingContext),
		inSection: false,
		hasEmpty: props.empty !== undefined,
	};
	const busy = listBusy(input) || undefined;
	// The latest slots, which each drawn message reads when its item changes
	// and its acts call when pressed.
	const slots = useRef(props.message);
	slots.current = props.message;
	const children = logOf(props, listState(input), words.retry, slots);
	// The column is a structure that follows density, as the Shell's tree is.
	const desktop = !useTouch();
	const column = desktop && THREAD_COLUMN;
	const centres = desktop && CENTRES;
	const fill = use(ThreadRoom);
	const bleeds = use(ThreadBleeds);
	const title = use(PageTitle);
	const log = useRef<HTMLDivElement>(null);
	const content = useRef<HTMLDivElement>(null);
	const dock = useRef<HTMLDivElement>(null);
	useFootFocus(dock);
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
		if (!fill || !scroller || !inner) return;
		const follow = () => {
			if (atEnd.current) scroller.scrollTop = scroller.scrollHeight;
			laid.current = [scroller.clientHeight, scroller.scrollHeight];
		};
		follow();
		const observer = new ResizeObserver(follow);
		observer.observe(scroller);
		observer.observe(inner);
		return () => observer.disconnect();
	}, [fill]);
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
	if (!fill)
		return (
			<div className={cn(THREAD, STACK)}>
				<div role="log" aria-busy={busy} className={cn(THREAD, column, STACK)}>
					{children}
				</div>
				{foot ? (
					<FootPlace value="inline">
						<div ref={dock} className={cn(column, STACK)}>
							{foot}
						</div>
					</FootPlace>
				) : null}
			</div>
		);
	return (
		<div
			data-fill
			className={cn(FILL, bleeds && THREAD_UNDER_HEAD, bleeds && BLEED)}
		>
			<div className={REGION}>
				<div
					ref={log}
					role="log"
					aria-busy={busy}
					aria-labelledby={title}
					// biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling region is reached by the keyboard (WCAG 2.1.1)
					tabIndex={0}
					onScroll={(event) => {
						const { scrollHeight, scrollTop, clientHeight } =
							event.currentTarget;
						const [height, content] = laid.current;
						if (clientHeight !== height || scrollHeight !== content) return;
						const end = scrollHeight - scrollTop - clientHeight <= AT_END;
						atEnd.current = end;
						setAway(!end);
					}}
					className={cn(THREAD_LOG, SCROLLS, centres)}
				>
					<div ref={content} className={cn(THREAD, column, STACK)}>
						{children}
					</div>
				</div>
				<Latest onBack={away ? toLatest : null} />
			</div>
			{foot ? (
				<div ref={dock} className={cn(FOOT_DOCKED, DOCKED, centres)}>
					<FootPlace value="docked">
						<div className={cn(column, FOOT_COLUMN)}>{foot}</div>
					</FootPlace>
				</div>
			) : null}
		</div>
	);
}
