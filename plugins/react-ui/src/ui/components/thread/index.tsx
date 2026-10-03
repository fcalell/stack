import { cn } from "@fcalell/ui-core/cn";
import {
	THREAD,
	THREAD_COLUMN,
	THREAD_FOOT,
	THREAD_LOG,
} from "@fcalell/ui-core/variants";
import {
	type ReactNode,
	use,
	useCallback,
	useLayoutEffect,
	useRef,
} from "react";
import type { Closed } from "../../lib/closed.ts";
import { FootDocks, PageTitle, ThreadFills } from "../../lib/frame.ts";
import { useTouch } from "../../lib/media.ts";

const STACK = "flex flex-col";
const FILL = "flex flex-col grow min-h-0";
// The log rings inset, its edge meeting the page's.
const SCROLLS = "grow min-h-0 overflow-y-auto focus-visible:-outline-offset-2";
const DOCKED = "flex flex-col shrink-0";
// The log is at its end while its last pixel shows; a reader who scrolled
// up keeps their place as a message arrives.
const AT_END = 1;

/** A conversation: its messages over the input that adds to it. */
export interface ThreadProps extends Closed {
	/** The `Message`s, oldest first. */
	children?: ReactNode;
	/** The `MessageInput` under the messages. */
	foot?: ReactNode;
}

/** The messages, a log region so an arriving one is announced, a sections gap apart, one rung above a reply's block gap, and the input a sections gap under them; on the desktop each stands in a measure-wide column centred in the page, on touch in the screen's column. In a Place's body it fills the page: the log scrolls at the page inset, opening at the newest message and following each that arrives while the reader is at the end, the input docked at the foot. */
export function Thread({ children, foot }: ThreadProps) {
	// The column is a structure that follows density, as the Shell's tree is.
	const column = !useTouch() && THREAD_COLUMN;
	const fills = use(ThreadFills);
	const docks = use(FootDocks);
	const title = use(PageTitle);
	const log = useRef<HTMLDivElement>(null);
	const content = useRef<HTMLDivElement>(null);
	const atEnd = useRef(true);
	useLayoutEffect(() => {
		if (!fills) return;
		fills(true);
		return () => fills(false);
	}, [fills]);
	// The log opens at its end and stays there while the reader is, as a
	// message arrives, a reply grows, or the input grows under it.
	useLayoutEffect(() => {
		const scroller = log.current;
		const inner = content.current;
		if (!fills || !scroller || !inner) return;
		const follow = () => {
			if (atEnd.current) scroller.scrollTop = scroller.scrollHeight;
		};
		follow();
		const observer = new ResizeObserver(follow);
		observer.observe(scroller);
		observer.observe(inner);
		return () => observer.disconnect();
	}, [fills]);
	// The docked foot's height, the room the Shell's toasts stand above.
	const docked = useCallback(
		(footing: HTMLDivElement) => {
			if (!docks) return;
			const observer = new ResizeObserver(() => docks(footing.offsetHeight));
			observer.observe(footing);
			return () => {
				observer.disconnect();
				docks(0);
			};
		},
		[docks],
	);
	if (!fills)
		return (
			<div className={cn(THREAD, STACK)}>
				<div role="log" className={cn(THREAD, column, STACK)}>
					{children}
				</div>
				{foot ? <div className={cn(column, STACK)}>{foot}</div> : null}
			</div>
		);
	return (
		<div className={FILL}>
			<div
				ref={log}
				role="log"
				aria-labelledby={title}
				// biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling region is reached by the keyboard (WCAG 2.1.1)
				tabIndex={0}
				onScroll={(event) => {
					const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
					atEnd.current = scrollHeight - scrollTop - clientHeight <= AT_END;
				}}
				className={cn(THREAD_LOG, SCROLLS)}
			>
				<div ref={content} className={cn(THREAD, column, STACK)}>
					{children}
				</div>
			</div>
			{foot ? (
				<div ref={docked} className={cn(THREAD_FOOT, DOCKED)}>
					<div className={cn(column, STACK)}>{foot}</div>
				</div>
			) : null}
		</div>
	);
}
